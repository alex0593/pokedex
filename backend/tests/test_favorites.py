"""
tests/test_favorites.py — Tests del endpoint /users/favorites.

Requiere un usuario autenticado; los fixtures crean uno y obtienen el token.
"""
from fastapi.testclient import TestClient

# ── Helpers ──────────────────────────────────────────────────────────────────

def register_and_login(client: TestClient, username: str = "favuser", password: str = "pass123") -> str:
    """Registra un usuario y devuelve el JWT access_token."""
    client.post("/users/register", json={"username": username, "password": password})
    resp = client.post("/users/login", data={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_list_favorites_empty(client: TestClient):
    token = register_and_login(client, "listuser")
    resp = client.get("/users/favorites/", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


def test_add_favorite(client: TestClient):
    token = register_and_login(client, "adduser")
    payload = {"entity_type": "pokemon", "entity_name": "pikachu", "entity_id": 25}
    resp = client.post("/users/favorites/", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["entity_type"] == "pokemon"
    assert data["entity_name"] == "pikachu"
    assert data["entity_id"] == 25


def test_add_favorite_idempotent(client: TestClient):
    """Añadir el mismo favorito dos veces devuelve el mismo objeto (sin error)."""
    token = register_and_login(client, "idempuser")
    payload = {"entity_type": "item", "entity_name": "poke-ball"}
    client.post("/users/favorites/", json=payload, headers=auth_headers(token))
    resp = client.post("/users/favorites/", json=payload, headers=auth_headers(token))
    assert resp.status_code == 201
    # Solo hay uno en la lista
    list_resp = client.get("/users/favorites/", headers=auth_headers(token))
    assert len(list_resp.json()) == 1


def test_list_favorites_filter_by_type(client: TestClient):
    token = register_and_login(client, "filteruser")
    headers = auth_headers(token)
    client.post("/users/favorites/", json={"entity_type": "pokemon", "entity_name": "bulbasaur"}, headers=headers)
    client.post("/users/favorites/", json={"entity_type": "item", "entity_name": "potion"}, headers=headers)

    resp = client.get("/users/favorites/?entity_type=pokemon", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["entity_name"] == "bulbasaur"


def test_remove_favorite(client: TestClient):
    token = register_and_login(client, "removeuser")
    headers = auth_headers(token)
    client.post("/users/favorites/", json={"entity_type": "berry", "entity_name": "oran"}, headers=headers)

    del_resp = client.delete("/users/favorites/berry/oran", headers=headers)
    assert del_resp.status_code == 204

    list_resp = client.get("/users/favorites/", headers=headers)
    assert list_resp.json() == []


def test_remove_nonexistent_favorite_returns_404(client: TestClient):
    token = register_and_login(client, "notfounduser")
    resp = client.delete("/users/favorites/pokemon/doesnotexist", headers=auth_headers(token))
    assert resp.status_code == 404


def test_favorites_require_auth(client: TestClient):
    """Sin token → 401."""
    resp = client.get("/users/favorites/")
    assert resp.status_code == 401

    resp = client.post("/users/favorites/", json={"entity_type": "pokemon", "entity_name": "mewtwo"})
    assert resp.status_code == 401

    resp = client.delete("/users/favorites/pokemon/mewtwo")
    assert resp.status_code == 401


def test_favorites_isolated_per_user(client: TestClient):
    """Los favoritos de un usuario no son visibles para otro."""
    token_a = register_and_login(client, "usera", "pass1")
    token_b = register_and_login(client, "userb", "pass2")

    client.post("/users/favorites/", json={"entity_type": "pokemon", "entity_name": "charmander"},
                headers=auth_headers(token_a))

    resp_b = client.get("/users/favorites/", headers=auth_headers(token_b))
    assert resp_b.json() == []
