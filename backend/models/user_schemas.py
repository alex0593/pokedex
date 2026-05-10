from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class StatsSchema(BaseModel):
    total_answers: int
    correct_answers: int
    high_score: int
    streak: int

    model_config = ConfigDict(from_attributes=True)

class AchievementSchema(BaseModel):
    name: str
    description: str
    icon: str
    
    model_config = ConfigDict(from_attributes=True)

class UserRegionStatSchema(BaseModel):
    region_name: str
    correct_answers: int

    model_config = ConfigDict(from_attributes=True)

class UserProfile(UserBase):
    id: int
    avatar_url: Optional[str] = None
    stats: Optional[StatsSchema] = None
    region_stats: List[UserRegionStatSchema] = []
    achievements: List[AchievementSchema] = []

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
