from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import User, Organization
from app.api.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": f"Welcome to the {settings.PROJECT_NAME} API. Access documentation at /docs"
    }

@app.on_event("startup")
async def on_startup():
    """
    Bootstrap the database with a default organization and tenant administrator if none exists.
    """
    # 1. Create tables if they do not exist (useful for quick local runs, although Alembic is preferred)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed default admin and organization
    async with SessionLocal() as session:
        # Check if first superuser exists
        result = await session.execute(
            select(User).where(User.email == settings.FIRST_SUPERUSER_EMAIL)
        )
        existing_user = result.scalar_one_or_none()
        
        if not existing_user:
            # Create default organization
            default_org = Organization(
                name="VoiceFlow AI Default",
                slug="default-org",
                wallet_balance=100.0,
                subscription_plan="pro"
            )
            session.add(default_org)
            await session.flush()  # Populate default_org.id
            
            # Create admin user
            admin_user = User(
                email=settings.FIRST_SUPERUSER_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                full_name="VoiceFlow Administrator",
                role="Tenant Admin",
                organization_id=default_org.id
            )
            session.add(admin_user)
            await session.commit()
            print("Successfully bootstrapped default organization and admin user.")
