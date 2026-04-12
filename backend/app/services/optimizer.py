import cvxpy as cp
import numpy as np

def optimize_portfolio(expected_returns: list[float], covariance: list[list[float]], risk_aversion: float) -> dict:
    """Compute Markowitz allocation, return weights."""
    n = len(expected_returns)
    w = cp.Variable(n)
    mu = np.array(expected_returns)
    Sigma = np.array(covariance)
    
    objective = cp.Maximize(mu @ w - risk_aversion * cp.quad_form(w, Sigma))
    constraints = [cp.sum(w) == 1, w >= 0]
    
    prob = cp.Problem(objective, constraints)
    prob.solve()
    
    if w.value is None:
        return {"error": "Optimization failed"}
        
    weights = np.round(w.value, 3).tolist()
    return {"weights": weights}
