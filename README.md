# AlgoFest: Agentic Finance Advisor

AlgoFest is a state-driven, autonomous financial advisory application. It leverages a reactive state machine to process complex financial queries, executing multi-step reasoning and dynamic tool calls. The system streams its cognitive process and final responses in real-time to a modern web client.

## System Architecture

The application is decoupled into two primary domains: the Agentic Backend and the Presentation Frontend. 

### 1. Backend (Cognition Engine)
- **Core Framework**: FastAPI running on an ASGI server (Uvicorn).
- **State Management**: LangGraph (`StateGraph`) combined with LangChain. Replaces traditional linear LLM architectures with a cyclic graph capable of multi-step tool execution based on dynamic conditions.
- **Memory & Persistence**: Utilizes LangGraph's `MemorySaver` backed by a relational SQL database (SQLite for local development, migrating to PostgreSQL in production via SQLAlchemy and `asyncpg`). Thread IDs ensure conversational context accurately maps to isolated user sessions.
- **Real-Time Streaming Protocol**: Implements Server-Sent Events (SSE). A custom generator intercepts the LLM's token stream, isolating XML-style `<thinking>` reasoning blocks from the final answer. It emits granular data chunks (`status`, `thinking_delta`, `answer_delta`, `tool_call`) down an HTTP/1.1 pipeline.
- **Security & Entities**: Features JWT-based Bearer Authentication (`PyJWT`, `bcrypt`) to validate token claims and secure API endpoint access endpoints against unauthorized thread lookups.

### 2. Frontend (Presentation Layer)
- **Core Framework**: Next.js 15 utilizing the App Router and React Server Components.
- **Interface & Parsing**: Tailwind CSS v4 handles utility-based styling. The application ingests the raw markdown output streamed from the agent and renders complex tabular data, math formulas, and syntax-highlighted artifacts natively using `react-markdown` and `@tailwindcss/typography`.
- **State & Animation**: `framer-motion` manages dynamic layout transitions, gracefully expanding or contracting the UI when the agent actively streams its internal reasoning trace or invokes external data-fetching tools.

## Technical Execution Workflow

When a user submits a prompt, the system processes it through the following life cycle:

1. **Authentication Validation**: The request parses the bearer token, validates the JWT, and maps the user to a specific Thread ID.
2. **Graph Invocation**: The user's input enters the running LangGraph agent state. 
3. **Evaluation via LLM**: The reasoning model (Google Gemini) processes the prompt. It evaluates if the question can be answered definitively or if external tools are required.
4. **Tool Execution Loop**: If a tool is necessary, the graph execution halts LLM generation, delegates the required parameters to a designated Python function, appends the execution result (JSON/Text) back into the state, and restarts the LLM evaluation cycle.
5. **Stream Emittance**: Concurrently, the backend generator buffers the response. It strips the `<thinking>` tokens into the `reasoning` trace panel on the frontend, and pipes the formal `answer` separately so the client can incrementally format the Markdown without layout breakage.

---

## Local Development Setup

### 1. Backend Configuration
Ensure you have Python 3.12+ installed on your operating system.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create an environment variables file named `.env` in the `backend/` directory:
```env
SECRET_KEY=your_secure_random_string_here
GOOGLE_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite+aiosqlite:///./algofest.db
BACKEND_CORS_ORIGINS=http://localhost:3000
```
*Note: FastAPI's lifespan configuration will automatically generate the SQLite `.db` file and instantiate the necessary schema tables (`users`, `chat_threads`) upon server boot.*

Start the ASGI server:
```bash
fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

### 2. Frontend Configuration
Ensure you have Node.js and NPM installed. Open a secondary terminal instance.

```bash
cd frontend
npm install
```

Create an environment variables file named `.env` in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Start the Next.js development server:
```bash
npm run dev
```

The application will now be accessible at `http://localhost:3000`.

---

## Production Deployment Guidelines

The provided SQLite configuration is strictly intended for ephemeral, local development environments. Cloud platforms (like Render, Vercel, or Heroku) utilize stateless container filesystems which will result in data loss if SQLite is retained in a production release.

To deploy for production, the infrastructure must be adjusted:

1. **Persistent Database**: Provision a managed PostgreSQL instance (e.g., Supabase, Neon, AWS RDS).
2. **Backend Environment Variables**: 
   - Set the `DATABASE_URL` environment variable to your async PostgreSQL connection string (`postgresql+asyncpg://user:pass@host/db`). 
   - Configure `BACKEND_CORS_ORIGINS` to securely permit requests exclusively from your production frontend URL (e.g., `https://algofest.vercel.app`).
   - Define a highly secure 32-byte hexadecimal `SECRET_KEY`.
3. **Frontend Environment Variables**: Set `NEXT_PUBLIC_API_URL` to point to the production backend's HTTPS endpoint.
