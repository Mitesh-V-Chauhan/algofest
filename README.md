# AI Wealth Builder: An Agentic Finance Advisor

**AlgoFest 2026 Hackathon Submission**

AI Wealth Builder is a personalized, chat-based financial advisor that leverages the reasoning power of Large Language Models (Gemini 3.1 Flash) combined with classical financial optimization algorithms (Markowitz model via CVXPY) and real-time market data to generate dynamic investment strategies.

## Features

- **Interactive Financial Profiling**: Users start by providing their base financial data (Age, Income, Savings, Risk Tolerance).
- **Agentic Chat Interface**: An intelligent agent guides the user, clarifying goals and requirements.
- **Markowitz Portfolio Optimization**: The agent can autonomously execute a CVXPY-based optimization to maximize expected return for a given risk level, returning an optimal asset allocation (Stocks vs. Bonds, etc.).
- **Live Market Data Integration**: Tools fetch up-to-date pricing data via `yfinance` to ground the agent's calculations in reality.
- **Modern UI**: A sleek Next.js (React/Tailwind) interface that handles the chatbot state and onboarding.

## Technical Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Python, FastAPI, Uvicorn
- **AI/ML**: Gemini 3.1 Flash via Google GenAI, LangChain (tool-calling agent)
- **Quantitative Finance**: CVXPY (convex optimization), `yfinance` (market data)
- **Infrastructure**: Docker & Docker Compose 

## How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python 3.11+
- Docker (optional, but recommended)
- A Google API Key for Gemini (`GOOGLE_API_KEY`)

### 1. Setup the Backend
Navigate to the `backend` directory, create your virtual environment, install dependencies, and set your API key.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

In `backend/.env`, set your Gemini API key:
```env
GOOGLE_API_KEY=your_actual_key_here
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Setup the Frontend
Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

## Using Docker
You can also run the backend using Docker Compose from the root directory:
```bash
docker-compose up --build
```

## Next Steps for the Team
- [ ] Finish recording the 2-5 minute Demo Video.
- [ ] Create UI charts for rendering portolfio allocations directly from the chat UI.
- [ ] Train a simulated reinforcement learning trading bot using Stable-Baselines3 to backtest portfolio recommendations.
