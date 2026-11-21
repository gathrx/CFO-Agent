"""
Personal CFO — FastAPI Application Entry Point
"""
import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from api.routes import router
from api.auth import require_user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Personal CFO API",
    description="Multi-agent personal finance management system",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes; every /api/* route requires a signed-in, allowed user
app.include_router(router, dependencies=[Depends(require_user)])


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Personal CFO API starting up...")
    if settings.AUTH_DISABLED:
        logger.warning("⚠️ AUTH_DISABLED is set: the API accepts requests without login")
    elif not settings.get_allowed_emails():
        logger.warning("⚠️ ALLOWED_EMAILS is empty: every API request will be refused")
    try:
        from agents.alert_agent import alert_agent
        alert_agent.start_scheduler()
        logger.info("⏰ Nightly alert scheduler started")
    except Exception as e:
        logger.warning(f"Could not start scheduler: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    try:
        from agents.alert_agent import alert_agent
        alert_agent.stop_scheduler()
    except Exception:
        pass
    logger.info("Personal CFO API shut down")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "personal-cfo-api"}


@app.get("/")
async def root():
    return {
        "message": "Personal CFO API",
        "docs": "/docs",
        "health": "/health",
    }

