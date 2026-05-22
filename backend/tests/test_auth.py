import pytest
from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    """Test successful user registration."""
    response = client.post('/users/register', json={
        'username': 'testuser',
        'password': 'testpass123'
    })
    assert response.status_code == 200
    data = response.json()
    assert data['username'] == 'testuser'
    assert 'id' in data


def test_register_duplicate_user(client: TestClient):
    """Test registration with duplicate username."""
    client.post('/users/register', json={
        'username': 'duplicate',
        'password': 'pass123'
    })
    response = client.post('/users/register', json={
        'username': 'duplicate',
        'password': 'pass456'
    })
    assert response.status_code in [400, 409]


def test_login_success(client: TestClient):
    """Test successful login."""
    client.post('/users/register', json={
        'username': 'loginuser',
        'password': 'mypass123'
    })
    response = client.post('/users/login', data={
        'username': 'loginuser',
        'password': 'mypass123'
    })
    assert response.status_code == 200
    data = response.json()
    assert 'access_token' in data
    assert data['token_type'] == 'bearer'


def test_login_invalid_password(client: TestClient):
    """Test login with invalid password."""
    client.post('/users/register', json={
        'username': 'user123',
        'password': 'correctpass'
    })
    response = client.post('/users/login', data={
        'username': 'user123',
        'password': 'wrongpass'
    })
    assert response.status_code in [401, 400]


def test_login_nonexistent_user(client: TestClient):
    """Test login with nonexistent user."""
    response = client.post('/users/login', data={
        'username': 'nouser',
        'password': 'anypass'
    })
    assert response.status_code in [401, 404]
