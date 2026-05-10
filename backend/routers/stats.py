from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models.user_db import User, UserStats, Achievement
from typing import Dict

router = APIRouter(prefix="/game", tags=["Game Stats"])

@router.post("/save-result")
async def save_result(
    username: str, 
    correct: bool, 
    score: int, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get stats
    stats_result = await db.execute(select(UserStats).filter(UserStats.user_id == user.id))
    stats = stats_result.scalars().first()
    
    # Update base stats
    stats.total_answers += 1
    if correct:
        stats.correct_answers += 1
        stats.streak += 1
    else:
        stats.streak = 0
        
    if score > stats.high_score:
        stats.high_score = score
        
    # Check for achievements based on streak or score or total correct
    # Example achievements
    achievements_to_check = [
        {"name": "Novato", "req": 10, "desc": "10 aciertos totales", "icon": "🥉"},
        {"name": "Entrenador", "req": 50, "desc": "50 aciertos totales", "icon": "🥈"},
        {"name": "Maestro", "req": 100, "desc": "100 aciertos totales", "icon": "🥇"},
        {"name": "Imparable", "req": 10, "is_streak": True, "desc": "Racha de 10 aciertos", "icon": "🔥"},
    ]
    
    new_achievements = []
    
    for ach_data in achievements_to_check:
        val = stats.streak if ach_data.get("is_streak") else stats.correct_answers
        if val >= ach_data["req"]:
            # Check if user already has it
            ach_res = await db.execute(select(Achievement).filter(Achievement.name == ach_data["name"]))
            db_ach = ach_res.scalars().first()
            
            if not db_ach:
                db_ach = Achievement(
                    name=ach_data["name"], 
                    description=ach_data["desc"], 
                    icon=ach_data["icon"]
                )
                db.add(db_ach)
                await db.flush()
            
            if db_ach not in user.achievements:
                user.achievements.append(db_ach)
                new_achievements.append(db_ach.name)

    await db.commit()
    
    return {
        "status": "success", 
        "streak": stats.streak, 
        "new_achievements": new_achievements
    }
