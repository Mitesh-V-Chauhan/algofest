<div align="center">
  <h1>FinPilot AI</h1>
  <p><b>State-Driven Autonomous Financial Advisory Agent</b></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-Agentic_State-blue?style=flat-square)](#)
  [![Gemini Pro](https://img.shields.io/badge/Gemini-Pro_3.1-4285F4?style=flat-square&logo=google)](#)
</div>

<br/>

FinPilot AI is an enterprise-grade LLM application designed to process complex financial queries through a reactive state machine. It executes multi-step reasoning, dynamic tool calls, and streams its cognitive process in real-time to a modern web client.

---

## Technology Stack

| Architecture Domain | Technologies Used | Primary Function |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15, React 19 | Application routing, Server Components, and client interface. |
| **User Interface** | Tailwind CSS v4, Framer Motion | Minimalistic dark-mode styling, fluid layout transitions, and responsive design. |
| **Markdown Parsing** | React Markdown, Remark GFM | Render tabular data, math formulas, and code blocks from LLM output. |
| **Backend Framework** | FastAPI, Uvicorn | High-performance, asynchronous ASGI server and API routing. |
| **AI / Agent Logic** | LangGraph, LangChain | Cyclic state execution, tool evaluation, and multi-step reasoning. |
| **Language Models** | Google Gemini 3.1 Pro & Flash | Core intelligence, context evaluation, and strategy generation. |
| **Database & ORM** | PostgreSQL, SQLite, SQLAlchemy | Thread persistence and user data storage using `asyncpg` / `aiosqlite`. |
| **Security** | PyJWT, bcrypt, passlib | JWT-based Bearer Authentication and cryptographic password hashing. |

---

## System Architecture

The application is decoupled into two primary domains to ensure structural integrity and scalability.

### 1. Cognition Engine (Backend)

The backend replaces linear LLM generation with a cyclic graph capable of independent tool execution based on conditional evaluations.

*   **State Management:** Utilizes LangGraph's `MemorySaver` backed by a relational database. Thread IDs ensure conversational context accurately maps to isolated user sessions.
*   **Real-Time Streaming Protocol:** Implements Server-Sent Events (SSE). A custom generator intercepts the LLM's token stream, isolating XML-style `<thinking>` reasoning blocks from the final answer. It emits granular data chunks (`status`, `thinking_delta`, `answer_delta`, `tool_call`) directly down an HTTP/1.1 pipeline.
*   **Security & Entities:** Features robust access controls to validate token claims and secure API endpoints against unauthorized thread lookups.

### 2. Presentation Layer (Frontend)

The client is a dark-mode optimized Next.js interface designed to bridge the cognitive trace of the agent with the user seamlessly.

*   **Interface Parsing:** The application ingests the raw markdown output streamed from the agent and applies the `@tailwindcss/typography` plugin to convert complex responses into highly readable, structurally sound components.
*   **Dynamic Layouts:** `framer-motion` manages dynamic layout transitions, gracefully expanding or contracting the UI when the agent actively streams its internal reasoning trace or invokes external data-fetching tools.

---

## Technical Execution Workflow

When a user submits a prompt, the system processes it through the following lifecycle:

1.  **Authentication:** The request parses the bearer token, validates the JWT, and maps the user to a specific Thread ID.
2.  **Graph Invocation:** The user's input enters the running LangGraph state mechanism.
3.  **Inference & Logic:** Google Gemini evaluates the prompt. It decides if the question can be resolved immediately or if external data/tools are required.
4.  **Delegation Loop:** If a tool is necessary, graph execution delegates parameters to a registered Python function, injects the execution result (JSON/Text) back into the state, and restarts the evaluation cycle.
5.  **Stream Emittance:** The backend isolates the trace into the `reasoning` panel on the frontend and pipes the definitive `answer` separately so the client safely applies the Markdown formatter.

---

## Local Development Setup

### Backend Configuration

Requires Python 3.12 or higher.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your_secure_random_string_here
GOOGLE_API_KEY=your_gemini_api_key_here

# Development Database Connection
DATABASE_URL=sqlite+aiosqlite:///./algofest.db
BACKEND_CORS_ORIGINS=http://localhost:3000
```

Start the ASGI server:

```bash
fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

### Frontend Configuration

Requires Node.js 20+ and NPM.

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Start the development server:

```bash
npm run dev
```

Application runs natively at `http://localhost:3000`.

---

## Production Deployment Guidelines

The SQLite configuration is designed for local development. Cloud container orchestrators (Render, Vercel, Heroku) utilize stateless filesystems, resulting in data loss if SQLite is deployed to production.

**For a production release:**

1.  **Database Migration:** Provision a managed PostgreSQL instance (e.g., Supabase, Neon).
2.  **Backend Environment:** Update `DATABASE_URL` to route to the async PostgreSQL connection string (`postgresql+asyncpg://user:pass@host/db`). Configure `BACKEND_CORS_ORIGINS` to allow traffic exclusively from your production UI domain.
3.  **Frontend Environment:** Update `NEXT_PUBLIC_API_URL` to point to your secure FastAPI production endpoint.
