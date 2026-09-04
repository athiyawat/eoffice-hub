"""FastAPI entry point — e-Office Saraban Manager API"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.scheduler_service import start_scheduler, stop_scheduler
from app.routers import health, config, schedule, documents, sweep, logs, telegram


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await start_scheduler()
    yield
    # Shutdown
    await stop_scheduler()


app = FastAPI(
    title="e-Office Saraban Manager API",
    version="1.0.0",
    description="Full-stack e-Office Saraban automation backend",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(config.router)
app.include_router(schedule.router)
app.include_router(documents.router)
app.include_router(sweep.router)
app.include_router(logs.router)
app.include_router(telegram.router)


@app.get("/")
async def root():
    return {"service": "e-Office Saraban Manager", "version": "1.0.0", "docs": "/docs"}
