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
