from datetime import timedelta
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.models import User, Organization
from app.schemas.schemas import Token, UserCreate, UserOut
from app.api.deps import get_current_active_user

router = APIRouter()

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_in: UserCreate
) -> Any:
    """
    Register a new Organization along with its first Tenant Administrator.
    """
    # 1. Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists in the system."
        )

    # 2. Check if organization slug is specified and unique
    slug = user_in.organization_slug or user_in.full_name.lower().replace(" ", "-")
    org_result = await db.execute(select(Organization).where(Organization.slug == slug))
    if org_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Organization name or slug is already taken."
        )

    # 3. Create organization
    organization = Organization(
        name=user_in.organization_slug.replace("-", " ").title() if user_in.organization_slug else f"{user_in.full_name}'s Org",
        slug=slug,
    )
    db.add(organization)
    await db.flush()  # Populates organization.id

    # 4. Create Tenant Admin user
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="Tenant Admin",
        organization_id=organization.id
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=Token)
async def login(
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, retrieve a JWT access token.
    """
    # Look up user by email
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    # Generate JWT Token
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token)

@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> Any:
    """
    Get current logged in user details.
    """
    return current_user
