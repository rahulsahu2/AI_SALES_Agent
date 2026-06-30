from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Agent
from app.schemas.schemas import AgentCreate, AgentOut, AgentUpdate
from app.api.deps import get_org_id, RoleChecker

router = APIRouter()

# Restrict critical config edits to Tenant Admins, Managers, and Developers
write_access = Depends(RoleChecker(["Tenant Admin", "Manager", "Developer"]))

@router.post("/", response_model=AgentOut, status_code=status.HTTP_201_CREATED, dependencies=[write_access])
async def create_agent(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    agent_in: AgentCreate
) -> Any:
    """
    Create a new AI Agent for the organization.
    """
    agent = Agent(
        organization_id=org_id,
        **agent_in.model_dump()
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent

@router.get("/", response_model=List[AgentOut])
async def list_agents(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    List all agents for the active organization.
    """
    result = await db.execute(
        select(Agent).where(Agent.organization_id == org_id, Agent.is_active == True)
    )
    return result.scalars().all()

@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    Fetch details of a specific AI voice agent.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.organization_id == org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agent not found or you do not have permission to access it."
        )
    return agent

@router.put("/{agent_id}", response_model=AgentOut, dependencies=[write_access])
async def update_agent(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    agent_in: AgentUpdate
) -> Any:
    """
    Modify agent configuration parameters (e.g. prompt, LLM settings, temperature).
    """
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.organization_id == org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agent not found or unauthorized access"
        )
        
    update_data = agent_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)
        
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[write_access])
async def delete_agent(
    agent_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> None:
    """
    Deletes an agent from the system.
    """
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.organization_id == org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agent not found or unauthorized"
        )
    await db.delete(agent)
    await db.commit()
    return
