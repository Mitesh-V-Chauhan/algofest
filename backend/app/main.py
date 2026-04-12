from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextcontextmanager
from app.api.v1.endpoints import chat
from app.core.config import settings
from app.db.database import engine, Base
import app.models.user  # import models so Base knows about them

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        # For a full production app, use Alembic migrations instead of create_all
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Any cleanup code on shutdown

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Use dynamic origins loaded from .env for production resilience
origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix=settings.API_V1_STR + "/chat", tags=["chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Agentic Finance Advisor API"}
