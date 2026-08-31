"""
routers/game.py — Sistema de Aventura por Regiones.

Endpoints:
  POST /game/stage/answer    — registra una respuesta dentro de un stage
  GET  /game/regions/progress — devuelve el progreso completo por región para el usuario autenticado

Un "stage" es un mini-quiz de 10 preguntas filtrado por región + tipo.
Se aprueba con ≥ 7 aciertos (70 %). Completar los 6 stages de una región
otorga la medalla regional.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from database import get_db
from models.user_db import (
    Achievement,
    StageAnswerReceipt,
    User,
    UserAdventureStats,
    UserStageProgress,
    UserStats,
)
from models.user_schemas import RankingEntry, RankingResponse, StageAnswerRequest
from utils.deps import get_current_user, get_optional_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/game", tags=["Game"])

# ── Constantes del sistema de stages ─────────────────────────────────────────

STAGE_QUESTIONS = 10       # preguntas por intento
STAGE_PASS_THRESHOLD = 7   # mínimo de aciertos para aprobar

# 6 stages por región × 9 regiones = 54 stages totales
REGION_STAGES: dict[str, list[str]] = {
    "kanto":  ["fire", "water", "grass", "psychic", "ghost", "dragon"],
    "johto":  ["normal", "fire", "ice", "dark", "steel", "dragon"],
    "hoenn":  ["fire", "water", "grass", "fighting", "ground", "flying"],
    "sinnoh": ["steel", "ice", "ghost", "dragon", "fighting", "psychic"],
    "unova":  ["normal", "fire", "electric", "ice", "dark", "dragon"],
    "kalos":  ["fairy", "fire", "psychic", "flying", "bug", "ground"],
    "alola":  ["fire", "water", "ice", "electric", "ghost", "dragon"],
    "galar":  ["ice", "dark", "dragon", "ghost", "steel", "fairy"],
    "paldea": ["ice", "dragon", "psychic", "ghost", "steel", "fire"],
}

# Medallas regionales
REGION_BADGES: dict[str, dict[str, str]] = {
    "kanto":  {"name": "Campeón de Kanto",   "icon": "🏆🔴", "desc": "Conquistaste los 6 stages de Kanto"},
    "johto":  {"name": "Campeón de Johto",   "icon": "🏆⭐", "desc": "Conquistaste los 6 stages de Johto"},
    "hoenn":  {"name": "Campeón de Hoenn",   "icon": "🏆🌊", "desc": "Conquistaste los 6 stages de Hoenn"},
    "sinnoh": {"name": "Campeón de Sinnoh",  "icon": "🏆🔵", "desc": "Conquistaste los 6 stages de Sinnoh"},
    "unova":  {"name": "Campeón de Teselia", "icon": "🏆⚡", "desc": "Conquistaste los 6 stages de Unova"},
    "kalos":  {"name": "Campeón de Kalos",   "icon": "🏆✨", "desc": "Conquistaste los 6 stages de Kalos"},
    "alola":  {"name": "Campeón de Alola",   "icon": "🏆🌺", "desc": "Conquistaste los 6 stages de Alola"},
    "galar":  {"name": "Campeón de Galar",   "icon": "🏆⚔️", "desc": "Conquistaste los 6 stages de Galar"},
    "paldea": {"name": "Campeón de Paldea",  "icon": "🏆🍇", "desc": "Conquistaste los 6 stages de Paldea"},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _stage_to_dict(sp: UserStageProgress) -> dict:
    return {
        "region_name":   sp.region_name,
        "type_name":     sp.type_name,
        "correct_count": sp.correct_count,
        "total_count":   sp.total_count,
        "attempts":      sp.attempts,
        "completed":     sp.completed,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/stage/answer", summary="Registrar respuesta en un stage")
async def stage_answer(
    payload: StageAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra una respuesta individual dentro de un stage.

    - Valida que la región y el tipo existan en el mapa de stages.
    - Crea o actualiza `UserStageProgress` para (usuario, región, tipo).
    - Al completar 10 respuestas: evalúa si el stage fue aprobado (≥7/10).
      - Si sí: marca como completado, revisa si la región entera está conquistada
        y, en ese caso, otorga la medalla regional.
      - Siempre resetea los contadores para permitir reintentos.
    - Actualiza las estadísticas globales del usuario (total_answers, streak…).
    """
    region    = payload.region.lower().strip()
    type_name = payload.type_name.lower().strip()
    answer_id = str(payload.answer_id)

    if region not in REGION_STAGES:
        raise HTTPException(status_code=400, detail=f"Región '{region}' no válida.")
    if type_name not in REGION_STAGES[region]:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo '{type_name}' no existe como stage en la región '{region}'.",
        )

    receipt_res = await db.execute(
        select(StageAnswerReceipt).filter(
            StageAnswerReceipt.user_id == current_user.id,
            StageAnswerReceipt.answer_id == answer_id,
        )
    )
    existing_receipt = receipt_res.scalars().first()
    if existing_receipt:
        return existing_receipt.response

    # ── Obtener o crear el progreso del stage ──────────────────────────────
    sp_res = await db.execute(
        select(UserStageProgress).filter(
            UserStageProgress.user_id == current_user.id,
            UserStageProgress.region_name == region,
            UserStageProgress.type_name == type_name,
        )
    )
    sp = sp_res.scalars().first()
    if not sp:
        sp = UserStageProgress(
            user_id=current_user.id,
            region_name=region,
            type_name=type_name,
        )
        db.add(sp)
        await db.flush()

    # ── Actualizar contadores del intento actual ───────────────────────────
    sp.total_count += 1
    if payload.is_correct:
        sp.correct_count += 1

    # ── Actualizar estadísticas globales ──────────────────────────────────
    stats_res = await db.execute(select(UserStats).filter(UserStats.user_id == current_user.id))
    stats = stats_res.scalars().first()
    if not stats:
        stats = UserStats(user_id=current_user.id)
        db.add(stats)
        await db.flush()

    adventure_stats_res = await db.execute(
        select(UserAdventureStats).filter(UserAdventureStats.user_id == current_user.id)
    )
    adventure_stats = adventure_stats_res.scalars().first()
    if not adventure_stats:
        adventure_stats = UserAdventureStats(user_id=current_user.id)
        db.add(adventure_stats)
        await db.flush()

    stats.total_answers += 1
    adventure_stats.total_answers += 1
    if payload.is_correct:
        stats.correct_answers += 1
        stats.streak += 1
        adventure_stats.correct_answers += 1
    else:
        stats.streak = 0

    # ── Evaluar fin de intento ────────────────────────────────────────────
    attempt_finished  = sp.total_count >= STAGE_QUESTIONS
    attempt_passed    = False
    region_completed  = False
    new_achievements: list[str] = []

    if attempt_finished:
        adventure_stats.completed_attempts += 1
        attempt_passed    = sp.correct_count >= STAGE_PASS_THRESHOLD
        final_correct     = sp.correct_count   # guardar antes del reset

        if attempt_passed and not sp.completed:
            sp.completed    = True
            # La columna existente es TIMESTAMP WITHOUT TIME ZONE. Guardamos UTC
            # normalizado sin tzinfo para que asyncpg no mezcle datetimes aware/naive.
            sp.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

            # Comprobar si TODOS los stages de la región están completados
            completed_res = await db.execute(
                select(UserStageProgress).filter(
                    UserStageProgress.user_id == current_user.id,
                    UserStageProgress.region_name == region,
                    UserStageProgress.completed == True,  # noqa: E712
                )
            )
            completed_type_names = {s.type_name for s in completed_res.scalars().all()}
            completed_type_names.add(type_name)  # incluir el recién completado

            if set(REGION_STAGES[region]) <= completed_type_names:
                region_completed = True
                badge_data = REGION_BADGES[region]

                ach_res = await db.execute(
                    select(Achievement).filter(Achievement.name == badge_data["name"])
                )
                badge_ach = ach_res.scalars().first()
                if not badge_ach:
                    badge_ach = Achievement(
                        name=badge_data["name"],
                        description=badge_data["desc"],
                        icon=badge_data["icon"],
                        region_name=region,
                    )
                    db.add(badge_ach)
                    await db.flush()

                if badge_ach not in current_user.achievements:
                    current_user.achievements.append(badge_ach)
                    new_achievements.append(badge_ach.name)
                    logger.info(
                        "Regional badge earned",
                        extra={"user": current_user.username, "badge": badge_ach.name},
                    )

        # Resetear contadores para el siguiente intento
        sp.attempts      += 1
        sp.correct_count  = 0
        sp.total_count    = 0
    else:
        final_correct = sp.correct_count

    result = {
        "stage_progress": _stage_to_dict(sp),
        "attempt_finished":      attempt_finished,
        "attempt_passed":        attempt_passed,
        "attempt_correct_count": final_correct,    # aciertos del intento recién cerrado (pre-reset)
        "region_completed":      region_completed,
        "new_achievements":      new_achievements,
    }
    db.add(StageAnswerReceipt(
        user_id=current_user.id,
        answer_id=answer_id,
        response=result,
    ))
    await db.commit()
    return result


@router.get(
    "/ranking",
    response_model=RankingResponse,
    summary="Clasificación global de Aventura",
)
async def get_ranking(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Devuelve el Top 50 y la posición personal, si la petición incluye un JWT."""
    ranking_res = await db.execute(
        select(UserAdventureStats)
        .options(selectinload(UserAdventureStats.user).selectinload(User.achievements))
        .filter(UserAdventureStats.completed_attempts > 0)
    )
    adventure_stats = ranking_res.scalars().all()

    entries: list[dict] = []
    for item in adventure_stats:
        medals = sum(1 for achievement in item.user.achievements if achievement.region_name)
        accuracy = (
            round((item.correct_answers / item.total_answers) * 100, 1)
            if item.total_answers
            else 0.0
        )
        entries.append({
            "username": item.user.username,
            "avatar_url": item.user.avatar_url,
            "points": item.correct_answers,
            "medals": medals,
            "accuracy": accuracy,
            "attempts": item.completed_attempts,
        })

    entries.sort(
        key=lambda entry: (
            -entry["points"],
            -entry["medals"],
            -entry["accuracy"],
            entry["attempts"],
            entry["username"].casefold(),
        )
    )
    positioned = [RankingEntry(position=index, **entry) for index, entry in enumerate(entries, 1)]
    personal_entry = None
    if current_user:
        personal_entry = next(
            (entry for entry in positioned if entry.username == current_user.username),
            None,
        )

    return RankingResponse(
        leaders=positioned[:50],
        current_user=personal_entry,
        total_players=len(positioned),
    )


@router.get("/regions/progress", summary="Progreso del usuario por regiones")
async def get_regions_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve el progreso completo de todas las regiones para el usuario autenticado.
    Cada región incluye la lista de stages con su estado (completado o no).
    """
    sp_res = await db.execute(
        select(UserStageProgress).filter(UserStageProgress.user_id == current_user.id)
    )
    all_stages = sp_res.scalars().all()
    stage_map: dict[tuple[str, str], UserStageProgress] = {
        (s.region_name, s.type_name): s for s in all_stages
    }

    # Nombres de logros regionales ya obtenidos
    user_badge_names = {
        ach.name for ach in current_user.achievements if ach.region_name
    }

    result = []
    for region_name, types in REGION_STAGES.items():
        badge_name    = REGION_BADGES[region_name]["name"]
        badge_earned  = badge_name in user_badge_names

        stages = []
        for type_name in types:
            sp = stage_map.get((region_name, type_name))
            stages.append({
                "region_name":   region_name,
                "type_name":     type_name,
                "correct_count": sp.correct_count if sp else 0,
                "total_count":   sp.total_count   if sp else 0,
                "attempts":      sp.attempts       if sp else 0,
                "completed":     sp.completed      if sp else False,
            })

        result.append({
            "region_name": region_name,
            "badge_earned": badge_earned,
            "stages": stages,
        })

    return result
