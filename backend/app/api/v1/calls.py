from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Call
from app.schemas.schemas import CallOut
from app.api.deps import get_org_id

router = APIRouter()

@router.get("/", response_model=List[CallOut])
async def list_calls(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    List history of all calls within the organization.
    """
    result = await db.execute(
        select(Call).where(Call.organization_id == org_id).order_by(Call.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{call_id}", response_model=CallOut)
async def get_call_details(
    call_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    Retrieve full details of a call including transcript items and AI summary.
    """
    result = await db.execute(
        select(Call)
        .options(selectinload(Call.transcripts), selectinload(Call.summary))
        .where(Call.id == call_id, Call.organization_id == org_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")
    return call

@router.post("/webhook/livekit", status_code=status.HTTP_200_OK)
async def livekit_webhook(
    event_data: dict,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Incoming webhook from LiveKit SFU.
    Captures participant connections, room deletion events, and agent completion triggers.
    """
    event_name = event_data.get("event")
    room_data = event_data.get("room", {})
    room_name = room_data.get("name")  # Typically our Call SID
    
    if not room_name:
        return {"status": "ignored", "reason": "no_room_name"}
        
    # Standard handler to update database record when a room ends
    if event_name == "room_finished":
        # Find call corresponding to the LiveKit room name
        result = await db.execute(select(Call).where(Call.sid == room_name))
        call = result.scalar_one_or_none()
        if call:
            call.status = "completed"
            db.add(call)
            await db.commit()
            return {"status": "success", "message": f"Updated call {call.id} status to completed"}
            
    return {"status": "received"}
