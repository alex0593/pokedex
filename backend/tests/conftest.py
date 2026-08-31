import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ['CORS_ORIGINS'] = 'http://localhost:3000'
os.environ['SECRET_KEY'] = 'test-secret-key-12345'
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///:memory:'
os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,testserver'  # TestClient usa 'testserver'

from database import Base, get_db
from main import app


@pytest.fixture(scope='function')
async def test_db():
    """Create a test database."""
    engine = create_async_engine('sqlite+aiosqlite:///:memory:', echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        yield session
        await session.close()

    await engine.dispose()


@pytest.fixture
def client(test_db):
    """Create a test client."""
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
