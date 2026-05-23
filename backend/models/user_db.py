from sqlalchemy import Column, ForeignKey, Integer, String, Table
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
