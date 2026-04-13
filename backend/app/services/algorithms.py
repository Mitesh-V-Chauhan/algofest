import numpy as np
from sklearn.tree import DecisionTreeClassifier

# 1. PERSONA MODEL = SUPERVISED CLASSIFICATION
# Feature vector: [age, horizon, savings_ratio, investment_ratio, risk_pref]
# y in {"conservative", "balanced", "aggressive"}

_X_train = np.array([
    [22, 28, 1.8, 0.3, 2],  # Young, long horizon, aggressive
    [45, 10, 3.2, 0.1, 0],  # Older, short horizon, conservative
    [30, 20, 2.0, 0.2, 1],  # Mid, medium horizon, balanced
    [55, 5,  4.0, 0.05, 0], # Near retirement
    [25, 35, 1.0, 0.4, 2]   # Young, high investment
])
_y_train = ["aggressive", "conservative", "balanced", "conservative", "aggressive"]

_clf = DecisionTreeClassifier(max_depth=4)
_clf.fit(_X_train, _y_train)

def predict_persona(age: int, horizon: int, savings_ratio: float, investment_ratio: float, risk_pref: int) -> str:
    """Predicts persona based on user state features."""
    features = [[age, horizon, savings_ratio, investment_ratio, risk_pref]]
    persona = _clf.predict(features)[0]
    return str(persona)


# 2. GOAL FEASIBILITY ENGINE
def future_value(p: float, sip: float, annual_return: float, years: int) -> float:
    """Computes SIP future value formula to estimate goal achieveability."""
    if annual_return <= 0:
        return p + (sip * years * 12)
        
    r = annual_return / 12
    n = years * 12

    corpus_growth = p * ((1 + r) ** n)
    sip_growth = sip * (((1 + r) ** n - 1) / r)

    return float(corpus_growth + sip_growth)


# 3. MONTE CARLO SIMULATION ENGINE
def monte_carlo_projection(
    initial_value: float,
    monthly_investment: float,
    mean_return: float,
    volatility: float,
    years: int,
    simulations: int = 1000
) -> np.ndarray:
    """Runs a Monte Carlo projection and returns pathways."""
    months = years * 12
    paths = np.zeros((simulations, months))

    for s in range(simulations):
        wealth = initial_value

        for m in range(months):
            monthly_return = np.random.normal(
                mean_return / 12,
                volatility / np.sqrt(12)
            )

            wealth = wealth * (1 + monthly_return)
            wealth += monthly_investment
            paths[s, m] = wealth

    return paths

# 4. GOAL SUCCESS PROBABILITY
def success_probability(paths: np.ndarray, target: float) -> float:
    """Extracts probability of success from simulated pathways."""
    final_values = paths[:, -1]
    return float(np.mean(final_values >= target))

# 5. STRESS TEST ENGINE
def apply_stress(path: np.ndarray, shock: float, duration: int = 24) -> np.ndarray:
    """Applies a deterministic market crash/shock to the initial months."""
    stressed = path.copy()
    actual_dur = min(duration, len(stressed))
    stressed[:actual_dur] *= (1 + shock)
    return stressed