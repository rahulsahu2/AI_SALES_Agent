import secrets
from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import APIKey
from app.schemas.schemas import APIKeyCreate, APIKeyOut, APIKeyFullOut
from app.api.deps import get_org_id, RoleChecker

router = APIRouter()

admin_access = Depends(RoleChecker(["Tenant Admin", "Developer"]))

@router.post("/", response_model=APIKeyFullOut, status_code=status.HTTP_201_CREATED, dependencies=[admin_access])
async def create_api_key(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    key_in: APIKeyCreate
) -> Any:
    """
    Generate a new developer API key. The plain token will only be shown once.
    """
    # Generate random key
    random_secret = secrets.token_urlsafe(32)
    raw_key = f"vf_live_{random_secret}"
    
    # Extract the prefix
    prefix = random_secret[:8]
    
    # Store key in database
    api_key_record = APIKey(
        organization_id=org_id,
        name=key_in.name,
        prefix=prefix,
        hashed_key=raw_key,  # Used as simple comparison string matching deps.py
        is_active=True
    )
    db.add(api_key_record)
    await db.commit()
    await db.refresh(api_key_record)
    
    # Construct output payload including the plain token
    out_data = APIKeyFullOut(
        id=api_key_record.id,
        name=api_key_record.name,
        prefix=api_key_record.prefix,
        created_at=api_key_record.created_at,
        is_active=api_key_record.is_active,
        plain_token=raw_key
    )
    return out_data

@router.get("/", response_model=List[APIKeyOut])
async def list_api_keys(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    List developer API keys (secrets hidden).
    """
    result = await db.execute(
        select(APIKey).where(
            APIKey.organization_id == org_id,
            APIKey.is_active == True
        )
    )
    return result.scalars().all()

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[admin_access])
async def revoke_api_key(
    key_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> None:
    """
    Revoke an API Key.
    """
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.organization_id == org_id
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    await db.delete(key)
    await db.commit()
    return
