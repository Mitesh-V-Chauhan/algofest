<div align="center">
  <h1>🚀 AlgoFest: Agentic Finance Advisor</h1>
  <p><b>An enterprise-grade, state-driven LLM application featuring real-time reasoning traces, cyclical tool execution, and persistent conversational memory.</b></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-Agentic_State-blue?style=flat-square)](https://python.langchain.com/docs/langgraph/)
  [![Gemini Pro](https://img.shields.io/badge/Gemini-Pro_3.1-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
  [![Database](https://img.shields.io/badge/SQLite-PostgreSQL-336791?style=flat-square&logo=postgresql)](#)
</div>

<br/>

## 🧠 The Vision

**AlgoFest** isn't just another chat wrapper. It is a highly sophisticated, autonomous financial advisory agent built on a **Reactive State Machine (LangGraph)**. 

Designed for low-latency reasoning and dynamic tool execution, the architecture allows the AI to "think" before it speaks, execute multi-step APIs, evaluate the output, and iteratively formulate comprehensive financial analyses. Combined with a premium, framer-motion powered Next.js frontend, AlgoFest delivers an unparalleled user experience, visualizing the AI's internal cognition matrix via Server-Sent Events (SSE) in real time.

---

## 🏗️ System Architecture

Our stack is separated into highly decoupled, independently scalable micro-environments:

### 1. The Cognition Engine (Backend / API)
*   **Framework**: FastAPI running on ASGI (Uvicorn).
*   **Agentic Framework**: `langgraph.graph.StateGraph` & `create_react_agent`.
*   **LLM Binding**: Google Gemini 3.1 Pro/Flash with dynamic model fallbacks via exception handling.
*   **Memory & State**: LangGraph `MemorySaver` paired with SQLite (`aiosqlite`) or PostgreSQL (`asyncpg`). Thread IDs bind the LangGraph checkpoints directly to the authenticated user.
*   **Real-time Streaming**: Custom Python generators parse `<thinking>` XML streams sequentially, splitting `thinking_delta`, `answer_delta`, and `tool_call` events down an HTTP/1.1 SSE pipeline.

### 2. The Presentation Layer (Frontend)
*   **Framework**: Next.js 15 (React 19) utilizing the App Router paradigm.
*   **Styling**: Tailwind CSS v4 + `@tailwindcss/typography` (`prose`).
*   **State & Animation**: `framer-motion` handles complex layout recalculations as the AI's thought processes expand and contract dynamically.
*   **Markdown Parsing**: `react-markdown` + `remark-gfm` parses complex tabular data, math, and syntax-highlighted code emitted by the agent.

---

## ✨ Engineering Highlights for Judges & Reviewers

1.  **Transparent Thought Protocols:** Instead of blinding the user while waiting for large generations, the backend intercepts LLM reasoning tokens and streams them alongside standard output. The UI smoothly renders an expandable "Computing/Reasoning" trace.
2.  **Cyclal Tool Processing:** The AI isn't limited to one-shot answers. It can call a tool, parse the JSON response, realize it needs more data, call another tool, and finally compile the response.
3.  **Authentication & Portability:** Native Bearer JWT implementation using `PyJWT` and `bcrypt`. User threads are securely isolated. 
4.  **SQLAlchemy + Alembic Portability:** The database configuration (`app.core.config.Settings`) uses Pydantic to sniff the environment. Pass it an `sqlite:///` string for local dev, or an `asyncpg://` PostgreSQL string in production—the ORM handles dialect variances autonomously.

---

## 🛠️ Quickstart (Local Development)

### 1. Clone & Core Setup
```bash
git clone https://github.com/Mitesh-V-Chauhan/algofest.git
cd algofest
```

### 2. Bootstrapping the Backend (Python 3.12+)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
**Environment Configuration (`backend/.env`):**
Create a `.env` file in the `backend/` directory:
```env
SECRET_KEY=generate_a_secure_random_string
GOOGLE_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite+aiosqlite:///./algofest.db
BACKEND_CORS_ORIGINS=http://localhost:3000
```
> *Note: FastAPI's `lifespan` hook will automatically create the `algofest.db` file and instantiate the SQL metadata tables upon booting.*

**Run the API:**
```bash
fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

### 3. Bootstrapping the Frontend (Node.js)
Open a new terminal window:
```bash
cd frontend
npm install
```
**Environment Configuration (`frontend/.env`):**
Create a `.env` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
**Run the Client:**
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the advisor!

---

## 🚀 Production Deployment Playbook

For full production release (e.g., rendering the app "live" for users), the ephemeral SQLite database will not suffice due to container resets on platforms like Render or Vercel. 

**Steps for scale:**
1.  **Database**: Spin up a Serverless Postgres instance (Neon, Supabase).
2.  **Backend (Render/Koyeb)**: Deploy the FastAPI codebase. Set `DATABASE_URL` to your async PostgreSQL string, `GOOGLE_API_KEY`, and add your frontend's domain to `BACKEND_CORS_ORIGINS`.
3.  **Frontend (Vercel)**: Deploy the Next.js frontend. Set `NEXT_PUBLIC_API_URL` to your production backend URL ensuring `HTTPS` is enforced.

---
<div align="center">
  <i>Architected with precision. Built for scale.</i><br/>
  <b>Mitesh V Chauhan</b>
</div>
