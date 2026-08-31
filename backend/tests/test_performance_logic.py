import asyncio
from datetime import timedelta
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from services.cache_service import CacheService
from services.pokeapi_service import PokeAPIService, retry_with_backoff


@pytest.mark.asyncio
async def test_retry_creates_a_fresh_coroutine_for_each_attempt():
    operation = AsyncMock(
        side_effect=[httpx.ConnectError("temporary"), {"ok": True}],
    )

    result = await retry_with_backoff(operation, max_retries=2, base_delay=0)

    assert result == {"ok": True}
    assert operation.await_count == 2


@pytest.mark.asyncio
async def test_concurrent_cache_misses_share_one_operation():
    calls = 0

    async def operation():
        nonlocal calls
        calls += 1
        await asyncio.sleep(0)
        return {"value": 1}

    with patch(
        "services.pokeapi_service.CacheService.get_instance",
        side_effect=RuntimeError,
    ):
        results = await asyncio.gather(
            PokeAPIService._cached_fetch("same-key", operation, timedelta(0)),
            PokeAPIService._cached_fetch("same-key", operation, timedelta(0)),
        )

    assert results == [{"value": 1}, {"value": 1}]
    assert calls == 1


@pytest.mark.asyncio
async def test_cache_get_many_preserves_order_and_misses():
    redis = AsyncMock()
    redis.mget.return_value = ['{"id": 1}', None, '{"id": 3}']
    cache = CacheService("redis://test")

    with patch.object(CacheService, "_redis", redis):
        result = await cache.get_many(["first", "missing", "third"])

    assert result == [{"id": 1}, None, {"id": 3}]
    redis.mget.assert_awaited_once_with(["first", "missing", "third"])


@pytest.mark.asyncio
async def test_quiz_excludes_previous_targets():
    pool = {"results": [{"name": name} for name in ["a", "b", "c", "d", "eevee"]]}
    detail = {"id": 133, "name": "Eevee", "original_name": "eevee"}

    with (
        patch.object(PokeAPIService, "get_pokemon_list", AsyncMock(return_value=pool)),
        patch.object(
            PokeAPIService,
            "get_pokemon_by_name_or_id",
            AsyncMock(return_value=detail),
        ) as get_detail,
    ):
        result = await PokeAPIService.get_optimized_quiz(
            excluded_names=["a", "b", "c", "d"],
        )

    get_detail.assert_awaited_once_with("eevee")
    assert result["target"]["original_name"] == "eevee"


@pytest.mark.asyncio
async def test_quiz_can_force_a_review_target():
    pool = {"results": [{"name": name} for name in ["a", "b", "c", "d"]]}
    detail = {"id": 25, "name": "Pikachu", "original_name": "pikachu"}

    with (
        patch.object(PokeAPIService, "get_pokemon_list", AsyncMock(return_value=pool)),
        patch.object(
            PokeAPIService,
            "get_pokemon_by_name_or_id",
            AsyncMock(return_value=detail),
        ) as get_detail,
    ):
        await PokeAPIService.get_optimized_quiz(
            excluded_names=["pikachu"],
            target_name="Pikachu",
        )

    get_detail.assert_awaited_once_with("pikachu")


@pytest.mark.asyncio
async def test_quiz_uses_unseen_global_target_after_small_pool_is_exhausted():
    type_data = {
        "pokemon": [
            {"pokemon": {"name": "dratini"}},
            {"pokemon": {"name": "dragonair"}},
        ]
    }
    global_pool = {
        "results": [{"name": name} for name in ["dratini", "dragonair", "mew", "ditto"]]
    }

    async def detail_for(name: str):
        return {"id": 1, "name": name.capitalize(), "original_name": name}

    with (
        patch.object(PokeAPIService, "get_generic_detail", AsyncMock(return_value=type_data)),
        patch.object(
            PokeAPIService,
            "get_pokemon_list",
            AsyncMock(return_value=global_pool),
        ),
        patch.object(
            PokeAPIService,
            "get_pokemon_by_name_or_id",
            AsyncMock(side_effect=detail_for),
        ),
    ):
        result = await PokeAPIService.get_optimized_quiz(
            type_name="dragon",
            excluded_names=["dratini", "dragonair"],
        )

    assert result["target"]["original_name"] in {"mew", "ditto"}
