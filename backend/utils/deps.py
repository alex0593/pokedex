"""
utils/deps.py — Dependencias reutilizables de FastAPI.

Centraliza get_current_user para que cualquier router protegido pueda
importarlo sin depender directamente de auth_utils.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from database import get_db
from models.user_db import User
from utils.auth_utils import ALGORITHM, SECRET_KEY

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependencia de FastAPI que valida el JWT y devuelve el usuario activo.
    Lanza 401 si el token es inválido, expirado o el usuario no existe.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o sesión expirada. Inicia sesión de nuevo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception from None

    result = await db.execute(
        select(User)
        .options(selectinload(User.achievements))
        .filter(User.username == username)
    )
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user


async def get_optional_current_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Devuelve el usuario del JWT cuando existe; permite acceso público sin token."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
    except JWTError:
        return None
    if not username:
        return None

    result = await db.execute(select(User).filter(User.username == username))
    return result.scalars().first()
