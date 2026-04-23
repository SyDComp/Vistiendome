from enum import Enum
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class UserRole(str, Enum):
    ADMIN = "admin"
    WORKER = "worker"
    CLIENT = "client"

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    role: UserRole = Field(default=UserRole.CLIENT)
    is_active: bool = Field(default=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime
