import json
import logging
from datetime import timedelta
from typing import Any, Optional, TypeVar

import redis.asyncio as aioredis
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

T = TypeVar('T')

class CacheService:
    """Redis-based cache service with TTL support for PokeAPI responses."""

    _instance: Optional['CacheService'] = None
    _redis: Optional[Redis] = None

    @classmethod
    async def initialize(cls, redis_url: str = 'redis://:pokedex_redis_pass_dev@localhost:6379/0') -> 'CacheService':
        """Initialize the singleton Redis connection."""
        if cls._instance is None:
            cls._instance = cls(redis_url)
            # redis.asyncio.from_url es síncrono (no necesita await), a diferencia de aioredis 2.x
            cls._redis = aioredis.from_url(redis_url, encoding='utf8', decode_responses=True)
            logger.info('Cache service initialized')
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'CacheService':
        """Get the singleton instance (must be initialized first)."""
        if cls._instance is None:
            raise RuntimeError('CacheService not initialized. Call initialize() first.')
        return cls._instance

    def __init__(self, redis_url: str):
        self.redis_url = redis_url

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve a value from cache."""
        if self._redis is None:
            return None
        try:
            value = await self._redis.get(key)
            if value:
                logger.debug(f'Cache hit: {key}')
                return json.loads(value)
            logger.debug(f'Cache miss: {key}')
            return None
        except Exception as e:
            logger.warning(f'Cache get error for {key}: {e}')
            return None

    async def set(self, key: str, value: Any, ttl: timedelta = timedelta(hours=24)) -> None:
        """Store a value in cache with TTL."""
        if self._redis is None:
            return
        try:
            await self._redis.setex(key, ttl, json.dumps(value))
            logger.debug(f'Cache set: {key} (TTL: {ttl})')
        except Exception as e:
            logger.warning(f'Cache set error for {key}: {e}')

    async def delete(self, key: str) -> None:
        """Delete a key from cache."""
        if self._redis is None:
            return
        try:
            await self._redis.delete(key)
            logger.debug(f'Cache deleted: {key}')
        except Exception as e:
            logger.warning(f'Cache delete error for {key}: {e}')

    async def clear(self, pattern: str = '*') -> None:
        """Clear all keys matching pattern from cache."""
        if self._redis is None:
            return
        try:
            keys = await self._redis.keys(pattern)
            if keys:
                await self._redis.delete(*keys)
                logger.info(f'Cache cleared: {len(keys)} keys matching {pattern}')
        except Exception as e:
            logger.warning(f'Cache clear error: {e}')

    async def close(self) -> None:
        """Close the Redis connection."""
        if self._redis:
            await self._redis.aclose()
            logger.info('Cache service closed')
