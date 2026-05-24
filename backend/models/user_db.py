from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base

# Association table for User-Achievements
user_achievements = Table(
    "user_achievements",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("achievement_id", Integer, ForeignKey("achievements.id"))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    avatar_url = Column(String, nullable=True)

    stats = relationship("UserStats", back_populates="user", uselist=False)
    region_stats = relationship("UserRegionStat", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", secondary=user_achievements, back_populates="users")
    favorites = relationship("UserFavorite", back_populates="user", cascade="all, delete-orphan")
    stage_progress = relationship("UserStageProgress", back_populates="user", cascade="all, delete-orphan")

class UserStats(Base):
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_answers = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    high_score = Column(Integer, default=0)
    streak = Column(Integer, default=0)

    user = relationship("User", back_populates="stats")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)
    icon = Column(String) # e.g. "🏆", "🔥"
    required_correct = Column(Integer, default=0)
    region_name = Column(String, nullable=True) # If it's a regional badge, track which region

    users = relationship("User", secondary=user_achievements, back_populates="achievements")

class UserRegionStat(Base):
    __tablename__ = "user_region_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    region_name = Column(String, index=True)
    correct_answers = Column(Integer, default=0)

    user = relationship("User", back_populates="region_stats")


class UserStageProgress(Base):
    """Progreso del usuario en un stage (región + tipo) del modo aventura."""

    __tablename__ = "user_stage_progress"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    region_name   = Column(String, nullable=False)
    type_name     = Column(String, nullable=False)
    correct_count = Column(Integer, default=0)   # aciertos en el intento actual
    total_count   = Column(Integer, default=0)   # preguntas respondidas en el intento actual
    attempts      = Column(Integer, default=0)   # intentos totales completados
    completed     = Column(Boolean, default=False)
    completed_at  = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="stage_progress")

    __table_args__ = (
        UniqueConstraint("user_id", "region_name", "type_name", name="uq_user_stage_progress"),
    )


class UserFavorite(Base):
    """Entidad favorita de un usuario (pokemon / item / berry / ability / move)."""

    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String, nullable=False)   # pokemon | item | berry | ability | move
    entity_id = Column(Integer, nullable=True)     # ID numérico de PokeAPI (puede ser None)
    entity_name = Column(String, nullable=False)   # Nombre canónico (slug PokeAPI)

    user = relationship("User", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint("user_id", "entity_type", "entity_name", name="uq_user_favorite"),
    )
