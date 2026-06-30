from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Agent, Call, CallTranscript, PhoneNumber
from app.schemas.schemas import CallTranscriptOut
from app.api.deps import get_org_id

router = APIRouter()

# Security header for internal system calls between LiveKit Agents / FreeSWITCH and backend
INTERNAL_KEY_HEADER = APIKeyHeader(name="X-Internal-Key", auto_error=False)
SYSTEM_SECRET = "system_internal_secret"

def verify_internal_access(x_internal_key: str = Depends(INTERNAL_KEY_HEADER)):
    if not x_internal_key or x_internal_key != SYSTEM_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized internal system access"
        )
    return True

@router.get("/agent-config/{agent_id}", dependencies=[Depends(verify_internal_access)])
async def get_internal_agent_config(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Internal endpoint for the LiveKit Agent container to fetch agent configuration.
    """
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    return {
        "name": agent.name,
        "system_prompt": agent.system_prompt,
        "greeting": agent.greeting,
        "llm_model": agent.llm_model,
        "temperature": agent.temperature,
        "voice_id": agent.voice_id,
        "interrupt_handling": agent.interrupt_handling,
        "silence_timeout": agent.silence_timeout
    }

@router.post("/transcript", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_internal_access)])
async def add_internal_transcript_line(
    payload: dict,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Internal endpoint for LiveKit Agent to submit dialogue transcript turns.
    """
    call_id = payload.get("call_id")
    role = payload.get("role")
    message = payload.get("message")
    
    if not call_id or not role or not message:
        raise HTTPException(status_code=400, detail="Missing required parameters")
        
    # Check if call exists
    call_res = await db.execute(select(Call).where(Call.id == call_id))
    call = call_res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")
        
    transcript = CallTranscript(
        call_id=call_id,
        role=role,
        message=message
    )
    db.add(transcript)
    await db.commit()
    return {"status": "created"}

@router.post("/inbound-token")
async def provision_inbound_sip_token(
    payload: dict,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Any:
    """
    Called by FreeSWITCH when an inbound call hits a provisioned SIP phone number.
    Identifies the tenant organization, builds the LiveKit session room, and returns the room name/token.
    """
    destination_number = payload.get("phone")
    if not destination_number:
        raise HTTPException(status_code=400, detail="phone parameter is required")
        
    # Find organization phone number mapping
    result = await db.execute(
        select(PhoneNumber).where(
            PhoneNumber.phone_number == destination_number,
            PhoneNumber.is_active == True
        )
    )
    phone = result.scalar_one_or_none()
    if not phone:
        raise HTTPException(status_code=404, detail="Phone number not registered")
        
    # Locate default agent for this tenant organization
    agent_res = await db.execute(
        select(Agent).where(
            Agent.organization_id == phone.organization_id,
            Agent.is_active == True
        )
    )
    agent = agent_res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="No active voice agent found for this tenant")

    # Create new call log record
    lk_room_name = f"call_{secrets_token(6)}_agent_{agent.id}"
    call = Call(
        organization_id=phone.organization_id,
        agent_id=agent.id,
        direction="inbound",
        status="ringing",
        sid=lk_room_name
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    # Return LiveKit connection room mapping details
    # In production, we call livekit server to generate real client connection tokens
    return {
        "room_name": lk_room_name,
        "token": f"mock_token_for_{lk_room_name}",
        "call_id": call.id
    }

def secrets_token(length: int) -> str:
    import secrets
    return secrets.token_hex(length)
