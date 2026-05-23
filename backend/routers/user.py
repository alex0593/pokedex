from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from database import get_db
from models.user_db import Achievement, User, UserRegionStat, UserStats
from models.user_schemas import Token, UserCreate, UserProfile
from utils.auth_utils import create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", response_model=UserProfile)
async def register(user: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).filter(User.username == user.username))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create user
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Initialize stats
    stats = UserStats(user_id=new_user.id)
    db.add(stats)
    await db.commit()

    # Eager load relations to prevent MissingGreenlet error in response serialization
    result = await db.execute(
        select(User)
        .options(selectinload(User.stats), selectinload(User.achievements))
        .filter(User.id == new_user.id)
    )
    return result.scalars().first()


@router.post("/login", response_model=Token)
async def login(user_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == user_data.username))
    user = result.scalars().first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/profile", response_model=UserProfile)
async def get_profile(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.stats),
            selectinload(User.achievements),
            selectinload(User.region_stats),
        )
        .filter(User.username == username)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


class AnswerSubmit(BaseModel):
    username: str
    is_correct: bool
    region: str | None = None


# Mapeo temporal de Emojis por Región para las medallas
REGION_BADGES = {
    "kanto": {"name": "Campeón de Kanto", "icon": "🏆🔴"},
    "johto": {"name": "Campeón de Johto", "icon": "🏆🟡"},
    "hoenn": {"name": "Campeón de Hoenn", "icon": "🏆🟢"},
    "sinnoh": {"name": "Campeón de Sinnoh", "icon": "🏆🔵"},
    "unova": {"name": "Campeón de Teselia", "icon": "🏆⚪"},
    "kalos": {"name": "Campeón de Kalos", "icon": "🏆✨"},
    "alola": {"name": "Campeón de Alola", "icon": "🏆🌺"},
    "galar": {"name": "Campeón de Galar", "icon": "🏆⚔️"},
    "paldea": {"name": "Campeón de Paldea", "icon": "🏆🍇"},
}

# Avatares base y regionales (Configuración)
TRAINER_SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers"

BASE_AVATARS = [
    {"id": "red", "url": f"{TRAINER_SPRITE_BASE}/1.png", "name": "Entrenador (Rojo)"},
    {"id": "leaf", "url": f"{TRAINER_SPRITE_BASE}/101.png", "name": "Entrenadora (Hoja)"},
]

REGIONAL_AVATARS = {
    "kanto": [
        {"id": "brock", "url": f"{TRAINER_SPRITE_BASE}/23.png", "name": "Brock"},
        {"id": "misty", "url": f"{TRAINER_SPRITE_BASE}/24.png", "name": "Misty"},
        {"id": "blue", "url": f"{TRAINER_SPRITE_BASE}/84.png", "name": "Azul"},
    ],
    "johto": [
        {"id": "falkner", "url": f"{TRAINER_SPRITE_BASE}/2.png", "name": "Pegaso"},
        {"id": "bugsy", "url": f"{TRAINER_SPRITE_BASE}/3.png", "name": "Antón"},
    ],
    "hoenn": [
        {"id": "roxanne", "url": f"{TRAINER_SPRITE_BASE}/10.png", "name": "Petra"},
        {"id": "brawly", "url": f"{TRAINER_SPRITE_BASE}/11.png", "name": "Marcial"},
    ],
}


@router.get("/avatars/{username}")
async def get_available_avatars(username: str, db: AsyncSession = Depends(get_db)):
    """Retorna la lista de avatares que el usuario tiene desbloqueados."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.achievements))
        .filter(User.username == username)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    available = list(BASE_AVATARS)

    # Desbloquear según logros (medallas regionales)
    unlocked_regions = [
        ach.name.split(" de ")[-1].lower()
        for ach in user.achievements
        if "Campeón de" in ach.name
    ]

    for region in unlocked_regions:
        if region in REGIONAL_AVATARS:
            available.extend(REGIONAL_AVATARS[region])

    return available


class AvatarUpdate(BaseModel):
    username: str
    avatar_url: str


@router.patch("/profile/avatar")
async def update_avatar(data: AvatarUpdate, db: AsyncSession = Depends(get_db)):
    """Actualiza la foto de perfil del usuario."""
    result = await db.execute(select(User).filter(User.username == data.username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.avatar_url = data.avatar_url
    await db.commit()
    return {"message": "Avatar actualizado", "avatar_url": user.avatar_url}


@router.post("/quiz/answer")
async def submit_quiz_answer(data: AnswerSubmit, db: AsyncSession = Depends(get_db)):
    # Buscar usuario
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.stats),
            selectinload(User.achievements),
            selectinload(User.region_stats),
        )
        .filter(User.username == data.username)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Actualizar Stats Globales
    user.stats.total_answers += 1
    if data.is_correct:
        user.stats.correct_answers += 1
        user.stats.streak += 1
        if user.stats.streak > user.stats.high_score:
            user.stats.high_score = user.stats.streak
    else:
        user.stats.streak = 0

    response_msg = {"message": "Respuesta registrada", "is_correct": data.is_correct}

    # Procesar Medallas Regionales (10 aciertos = medalla)
    if data.is_correct and data.region:
        region_key = data.region.lower()

        # Buscar el stat de esa región (crear si no existe)
        region_stat = next((rs for rs in user.region_stats if rs.region_name == region_key), None)
        if not region_stat:
            region_stat = UserRegionStat(user_id=user.id, region_name=region_key, correct_answers=0)
            db.add(region_stat)
            user.region_stats.append(region_stat)

        region_stat.correct_answers += 1

        # Si llega a 10 de esa región de forma exacta, dar el achievement
        if region_stat.correct_answers == 10 and region_key in REGION_BADGES:
            badge_info = REGION_BADGES[region_key]

            # Buscar si el logro ya existe en BD, si no crearlo
            ach_result = await db.execute(
                select(Achievement).filter(Achievement.name == badge_info["name"])
            )
            achievement = ach_result.scalars().first()
            if not achievement:
                achievement = Achievement(
                    name=badge_info["name"],
                    description=(
                        f"Adivinaste correctamente 10 Pokémon originarios de "
                        f"{region_key.capitalize()}."
                    ),
                    icon=badge_info["icon"],
                    required_correct=10,
                    region_name=region_key,
                )
                db.add(achievement)

            # Asignarlo al usuario si no lo tiene
            if achievement not in user.achievements:
                user.achievements.append(achievement)
                response_msg["unlocked_badge"] = badge_info

    await db.commit()
    return response_msg
