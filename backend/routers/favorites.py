"""
routers/favorites.py — CRUD de favoritos del usuario autenticado.

Todos los endpoints requieren JWT válido (Bearer token).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from models.user_db import User, UserFavorite
from models.user_schemas import FavoriteCreate, FavoriteItem
from utils.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users/favorites", tags=["Favorites"])


@router.get("/", response_model=list[FavoriteItem])
async def list_favorites(
    entity_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserFavorite]:
    """Lista todos los favoritos del usuario; opcionalmente filtrado por entity_type."""
    query = select(UserFavorite).filter(UserFavorite.user_id == current_user.id)
    if entity_type:
        query = query.filter(UserFavorite.entity_type == entity_type)
    result = await db.execute(query.order_by(UserFavorite.id))
    return result.scalars().all()  # type: ignore[return-value]


@router.post("/", response_model=FavoriteItem, status_code=201)
async def add_favorite(
    payload: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserFavorite:
    """
    Añade una entidad a favoritos. Idempotente: si ya existe, la devuelve tal cual.
    """
    existing = await db.execute(
        select(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.entity_type == payload.entity_type,
            UserFavorite.entity_name == payload.entity_name,
        )
    )
    fav = existing.scalars().first()
    if fav:
        return fav

    new_fav = UserFavorite(
        user_id=current_user.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        entity_name=payload.entity_name,
    )
    db.add(new_fav)
    try:
        await db.commit()
        await db.refresh(new_fav)
    except Exception as e:
        await db.rollback()
        logger.error("Error adding favorite: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error al guardar el favorito.") from e
    return new_fav


@router.delete("/{entity_type}/{entity_name}", status_code=204)
async def remove_favorite(
    entity_type: str,
    entity_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Elimina un favorito. Devuelve 204 si se eliminó, 404 si no existía."""
    result = await db.execute(
        select(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.entity_type == entity_type,
            UserFavorite.entity_name == entity_name,
        )
    )
    fav = result.scalars().first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorito no encontrado.")
    await db.delete(fav)
    await db.commit()
