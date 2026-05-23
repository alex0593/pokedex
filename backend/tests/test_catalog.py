"""
tests/test_catalog.py — Tests de los routers de catálogo genérico.

Mockeamos PokeAPIService.get_generic_data directamente (capa de servicio)
en lugar de usar respx sobre el cliente httpx singleton, que no es
interceptado correctamente por el context-manager de respx.
"""
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


def test_get_moves_list(client: TestClient):
    """Test fetching moves list with mock PokeAPI."""
    mock_data = {
        "results": [
            {"name": "tackle", "url": "https://pokeapi.co/api/v2/move/1/"},
            {"name": "water-gun", "url": "https://pokeapi.co/api/v2/move/55/"},
        ]
    }
    with patch(
        "services.pokeapi_service.PokeAPIService.get_generic_data",
        new_callable=AsyncMock,
        return_value=mock_data,
    ):
        response = client.get("/moves?limit=5&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 2


def test_get_abilities_list(client: TestClient):
    """Test fetching abilities list."""
    mock_data = {
        "results": [
            {"name": "static", "url": "https://pokeapi.co/api/v2/ability/9/"},
        ]
    }
    with patch(
        "services.pokeapi_service.PokeAPIService.get_generic_data",
        new_callable=AsyncMock,
        return_value=mock_data,
    ):
        response = client.get("/abilities?limit=5&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 1


def test_catalog_cache_control_headers(client: TestClient):
    """Test que los endpoints de catálogo devuelven headers Cache-Control."""
    with patch(
        "services.pokeapi_service.PokeAPIService.get_generic_data",
        new_callable=AsyncMock,
        return_value={"results": []},
    ):
        response = client.get("/items?limit=5&offset=0")
        header_keys = [k.lower() for k in response.headers]
        assert "cache-control" in header_keys
        assert any("max-age" in str(v).lower() for k, v in response.headers.items())
