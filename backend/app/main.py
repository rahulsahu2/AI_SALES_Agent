from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import User, Organization, Agent, PhoneNumber
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

            # Create default agent
            default_agent = Agent(
                organization_id=default_org.id,
                name="Sales Assistant",
                system_prompt="You are a helpful sales assistant calling from VoiceFlow AI.",
                greeting="Hello, I am calling to discuss your product interest.",
                llm_model="gpt-4o",
                temperature=0.7,
                voice_id="21m00Tcm4TlvDq8ikWAM"
            )
            session.add(default_agent)

            # Create default phone number
            default_phone = PhoneNumber(
                organization_id=default_org.id,
                phone_number="+15550100",
                label="Main Office Line",
                provider="Twilio"
            )
            session.add(default_phone)
            
            await session.commit()
            print("Successfully bootstrapped default organization, admin user, agent, and phone number.")
