from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Campaign, CampaignContact, Contact
from app.schemas.schemas import CampaignCreate, CampaignOut, CampaignUpdate
from app.api.deps import get_org_id, RoleChecker

router = APIRouter()

write_access = Depends(RoleChecker(["Tenant Admin", "Manager"]))

@router.post("/", response_model=CampaignOut, status_code=status.HTTP_201_CREATED, dependencies=[write_access])
async def create_campaign(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    campaign_in: CampaignCreate
) -> Any:
    """
    Create a new outbound calling Campaign and register its contacts queue.
    """
    # Create the campaign
    scheduled_start_naive = campaign_in.scheduled_start.replace(tzinfo=None) if campaign_in.scheduled_start else None
    campaign = Campaign(
        organization_id=org_id,
        agent_id=campaign_in.agent_id,
        phone_number_id=campaign_in.phone_number_id,
        name=campaign_in.name,
        description=campaign_in.description,
        max_retries=campaign_in.max_retries,
        retry_delay_minutes=campaign_in.retry_delay_minutes,
        time_zone_aware=campaign_in.time_zone_aware,
        scheduled_start=scheduled_start_naive,
        status="draft"
    )
    db.add(campaign)
    await db.flush()  # populate campaign.id

    # Create mapping entries for the contacts list
    if campaign_in.contact_ids:
        # Verify that these contact_ids belong to the same organization
        contact_check = await db.execute(
            select(Contact.id).where(
                Contact.id.in_(campaign_in.contact_ids),
                Contact.organization_id == org_id
            )
        )
        valid_contact_ids = contact_check.scalars().all()
        
        for cid in valid_contact_ids:
            cc = CampaignContact(
                campaign_id=campaign.id,
                contact_id=cid,
                status="pending"
            )
            db.add(cc)
            
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.get("/", response_model=List[CampaignOut])
async def list_campaigns(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)]
) -> Any:
    """
    List all campaigns.
    """
    result = await db.execute(
        select(Campaign).where(Campaign.organization_id == org_id)
    )
    return result.scalars().all()

@router.put("/{campaign_id}", response_model=CampaignOut, dependencies=[write_access])
async def update_campaign(
    campaign_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: Annotated[int, Depends(get_org_id)],
    campaign_in: CampaignUpdate
) -> Any:
    """
    Update campaign parameters. If state changes to 'active', trigger background dialer.
    """
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.organization_id == org_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    old_status = campaign.status
    update_data = campaign_in.model_dump(exclude_unset=True)
    if "scheduled_start" in update_data and update_data["scheduled_start"]:
        update_data["scheduled_start"] = update_data["scheduled_start"].replace(tzinfo=None)
    
    for field, value in update_data.items():
        setattr(campaign, field, value)
        
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    
    # If starting/resuming the campaign, queue it in Celery worker
    if campaign.status == "active" and old_status != "active":
        try:
            # We import celery app here to prevent circular imports during start
            from app.workers.tasks import start_campaign_dialer
            start_campaign_dialer.delay(campaign.id)
        except Exception:
            # Handle gracefully if Celery is not configured in local testing
            pass
            
    return campaign
