import secrets
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import ALGORITHM
from app.models.models import User, Organization, APIKey
from app.schemas.schemas import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_scheme)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(
        select(User).where(User.id == int(token_data.sub))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_org_id(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> int:
    """
    Dependency to get the organization ID of the logged in user.
    Raises exception if user has no organization associated.
    """
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=403,
            detail="User is not associated with an organization."
        )
    return current_user.organization_id

async def verify_api_key_or_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_api_key: Annotated[Optional[str], Depends(api_key_header)] = None,
    current_user: Annotated[Optional[User], Depends(get_current_user)] = None
) -> int:
    """
    Authenticates either via HTTP header X-API-KEY or JWT token, returning the organization_id.
    """
    if x_api_key:
        # Resolve api key. The key in header is like 'vf_live_xxxxxxxxxxx'
        # Extract prefix to search
        prefix = x_api_key.split("_")[-1][:8] if "_" in x_api_key else x_api_key[:8]
        result = await db.execute(
            select(APIKey).where(
                APIKey.prefix == prefix,
                APIKey.is_active == True
            )
        )
        api_key_record = result.scalars().all()
        
        # Verify the rest of the key by hashing
        for record in api_key_record:
            # We can hash x_api_key to see if it matches hashed_key
            # In production, use standard hashing algorithm e.g. hmac.compare_digest
            if secrets.compare_digest(record.hashed_key, x_api_key):
                return record.organization_id
                
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API Key"
        )
        
    if current_user:
        if current_user.organization_id is None:
            raise HTTPException(
                status_code=403,
                detail="User has no organization associated"
            )
        return current_user.organization_id

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated"
    )

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        current_user: Annotated[User, Depends(get_current_active_user)]
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"User role '{current_user.role}' is not authorized to access this resource."
            )
        return current_user
