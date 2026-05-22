import pytest
import respx
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_get_moves_list(client: TestClient):
    """Test fetching moves list with mock PokeAPI."""
    with respx.mock:
        respx.get('https://pokeapi.co/api/v2/move?limit=5&offset=0').mock(
            return_value=respx.Response(200, json={
                'results': [
                    {'name': 'tackle', 'url': 'https://pokeapi.co/api/v2/move/1/'},
                    {'name': 'water-gun', 'url': 'https://pokeapi.co/api/v2/move/55/'},
                ]
            })
        )
        response = client.get('/moves?limit=5&offset=0')
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_abilities_list(client: TestClient):
    """Test fetching abilities list."""
    with respx.mock:
        respx.get('https://pokeapi.co/api/v2/ability?limit=5&offset=0').mock(
            return_value=respx.Response(200, json={
                'results': [
                    {'name': 'static', 'url': 'https://pokeapi.co/api/v2/ability/9/'},
                ]
            })
        )
        response = client.get('/abilities?limit=5&offset=0')
        assert response.status_code == 200


def test_catalog_cache_control_headers(client: TestClient):
    """Test that catalog endpoints return Cache-Control headers."""
    with respx.mock:
        respx.get('https://pokeapi.co/api/v2/item?limit=5&offset=0').mock(
            return_value=respx.Response(200, json={'results': []})
        )
        response = client.get('/items?limit=5&offset=0')
        assert 'cache-control' in response.headers.lower()
        # The header should be present (lowercase key might vary)
        assert any('max-age' in str(v).lower() for k, v in response.headers.items())
