from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Workflow
from app.schemas.schemas import WorkflowCreate, WorkflowOut, WorkflowUpdate
from app.api.deps import get_org_id, RoleChecker

router = APIRouter()

write_access = Depends(RoleChecker(["Tenant Admin", "Manager", "Developer"]))

@router.post("/", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED, dependencies=[write_access])
async def create_workflow(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    workflow_in: WorkflowCreate
) -> Any:
    """
    Create a new drag-and-drop conversational workflow chart.
    """
    workflow = Workflow(
        organization_id=org_id,
        **workflow_in.model_dump()
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.get("/", response_model=List[WorkflowOut])
async def list_workflows(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    List all workflows.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.organization_id == org_id)
    )
    return result.scalars().all()

@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    Fetch raw workflow builder coordinates and flow nodes/edges.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.organization_id == org_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.put("/{workflow_id}", response_model=WorkflowOut, dependencies=[write_access])
async def update_workflow(
    workflow_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    workflow_in: WorkflowUpdate
) -> Any:
    """
    Update workflow canvas layout, nodes, links, or actions.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.organization_id == org_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    update_data = workflow_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workflow, field, value)
        
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[write_access])
async def delete_workflow(
    workflow_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> None:
    """
    Delete a workflow.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.organization_id == org_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(workflow)
    await db.commit()
    return
