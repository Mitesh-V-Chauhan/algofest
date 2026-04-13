from pydantic import BaseModel
from typing import Literal, Optional

class UserState(BaseModel):
    age: int
    monthly_income: float
    monthly_expenses: float
    savings: float
    monthly_investment_capacity: float
    target_amount: float
    target_age: int
    risk_preference: Literal["low", "medium", "high"]

    investment_horizon: Optional[int] = None
    savings_ratio: Optional[float] = None
    investment_ratio: Optional[float] = None

def enrich_state(state: UserState) -> UserState:
    """Enriches basic user inputs with ratios and horizons."""
    state.investment_horizon = max(0, state.target_age - state.age)
    if state.monthly_income > 0:
        state.savings_ratio = state.savings / state.monthly_income
        state.investment_ratio = state.monthly_investment_capacity / state.monthly_income
    else:
        state.savings_ratio = 0.0
        state.investment_ratio = 0.0
    return state
