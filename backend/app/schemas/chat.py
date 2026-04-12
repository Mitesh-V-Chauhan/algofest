from pydantic import BaseModel
from typing import Optional

class UserProfile(BaseModel):
    age: int
    income: float
    savings: float
    risk_tolerance: str  # e.g., "Low", "Medium", "High"

class ChatRequest(BaseModel):
    message: str
    profile: Optional[UserProfile] = None
    thread_id: Optional[str] = "default-thread"

class ChatResponse(BaseModel):
    response: str
