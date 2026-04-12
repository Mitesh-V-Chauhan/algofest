# AlgoFest - Agentic Finance Advisor

AlgoFest is a comprehensive, AI-driven financial advisory application featuring a modern React/Next.js frontend with Server-Sent Events (SSE) streaming, backed by a FastAPI and LangGraph-powered Python engine. 

## 🏗️ Architecture Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS v4, Framer Motion, `@tailwindcss/typography` (for rich markdown AI rendering).
- **Backend API**: FastAPI, Uvicorn, Python 3.12.
- **AI Agent Engine**: LangGraph, LangChain, Google Gemini Pro. Features true conversational memory and dynamic tool execution chaining.
- **Database**: SQLite / Aiosqlite (Development/Ephemeral deployments) -> PostgreSQL (Production upgrade path).

## 🔥 Core Capabilities

1. **Intelligent Streaming Reasoning**: Emulates modern AI reasoning traces. See the AI "Computing", executing tools, and breaking down complex financial problems gracefully in the UI.
2. **Threaded Memory State**: Conversational memory checkpointing maps thread histories so the LangGraph agent can carry context between turns and iterate.
3. **Markdown Rendering**: Robustly parses tables, code blocks, lists, and mathematical formats securely to the browser via `react-markdown` and `remark-gfm`.
4. **Environment Dynamic Portability**: Ships with seamless deployment configurations handling dynamic Next.js runtime environment variables (`NEXT_PUBLIC_API_URL`) and robust API CORS setups.

## 🚀 Getting Started

### 1. Backend Initialization

Navigate to the backend and activate the virtual environment:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Set Environment Variables:**
Copy `.env.example` to `.env` and insert your Gemini API Key and desired `SECRET_KEY`.

**Run the API Server:**
```bash
fastapi dev app/main.py --host 0.0.0.0 --port 8000
```
> At startup, this will automatically create the `algofest.db` SQLite database files and seed necessary user/thread tables.

### 2. Frontend Initialization

Navigate to the frontend, install dependencies, and run the development server:
```bash
cd frontend
npm install
npm run dev
```

**Set Environment Variables:**
Copy `.env.example` to `.env` and set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` (for local development).

The application will be running natively at [http://localhost:3000](http://localhost:3000).

## 🚢 Deployment Notes & Limitations (Ephemeral DB)

If you are deploying this immediately on platforms like Render, Koyeb, or Vercel without migrating the `DATABASE_URL` to a persistent database (like Supabase PostgreSQL):
- The app **will** work perfectly for live users!
- However, because cloud host environments "spin down" or "re-deploy", the local instances of `algofest.db` inside your deployment container will reset. Conversational memory threads will be lost when the server restarts or scales down.
- **The fix for scale:** Ensure you assign a PostgreSQL URI to the backend `DATABASE_URL` variable in your production environment settings!

## 🔐 Auth & Security
Endpoints are safeguarded using Bearer Token JWTs (`app/core/security.py`). Real identities and chat histories lock against secure API keys preventing leaking conversation data among distinct clients.
