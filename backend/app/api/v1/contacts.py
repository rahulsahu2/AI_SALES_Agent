from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Contact
from app.schemas.schemas import ContactCreate, ContactOut, ContactUpdate
from app.api.deps import get_org_id, RoleChecker

router = APIRouter()

write_access = Depends(RoleChecker(["Tenant Admin", "Manager", "Supervisor"]))

@router.post("/", response_model=ContactOut, status_code=status.HTTP_201_CREATED, dependencies=[write_access])
async def create_contact(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    contact_in: ContactCreate
) -> Any:
    """
    Create a new customer lead/contact profile.
    """
    contact = Contact(
        organization_id=org_id,
        **contact_in.model_dump()
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact

@router.get("/", response_model=List[ContactOut])
async def list_contacts(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    List all contacts for the active organization.
    """
    result = await db.execute(
        select(Contact).where(Contact.organization_id == org_id)
    )
    return result.scalars().all()

@router.get("/{contact_id}", response_model=ContactOut)
async def get_contact(
    contact_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    Get specific contact metadata.
    """
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.organization_id == org_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.put("/{contact_id}", response_model=ContactOut, dependencies=[write_access])
async def update_contact(
    contact_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    contact_in: ContactUpdate
) -> Any:
    """
    Update contact fields, custom properties, or notes.
    """
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.organization_id == org_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    update_data = contact_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)
        
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[write_access])
async def delete_contact(
    contact_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> None:
    """
    Delete a contact.
    """
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.organization_id == org_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)
    await db.commit()
    return
