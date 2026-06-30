import asyncio
import logging
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.models import Campaign, CampaignContact, Contact, Call, Agent, PhoneNumber, KnowledgeDocument
from app.services.rag_service import RAGService
from sqlalchemy import select
import httpx

logger = logging.getLogger("workers")

async def _process_rag_document_async(doc_id: int):
    """
    Async helper to read document and generate index chunks.
    """
    async with SessionLocal() as db:
        result = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {doc_id} not found for RAG chunking")
            return
            
        # Update status to processing
        doc.status = "processing"
        db.add(doc)
        await db.commit()
        
        try:
            # For demonstration, we assume doc.file_path contains raw txt.
            # In production, parse PDFs / docx libraries.
            with open(doc.file_path, "r", encoding="utf-8") as f:
                raw_text = f.read()
                
            kb_res = await db.execute(
                select(KnowledgeDocument.knowledge_base_id).where(KnowledgeDocument.id == doc_id)
            )
            kb_id = kb_res.scalar()
            
            # Fetch organization_id
            from app.models.models import KnowledgeBase
            org_res = await db.execute(select(KnowledgeBase.organization_id).where(KnowledgeBase.id == kb_id))
            org_id = org_res.scalar()
            
            success = await RAGService.process_and_index_document(db, org_id, doc_id, raw_text)
            if success:
                logger.info(f"Successfully processed document {doc_id}")
            else:
                doc.status = "error"
                db.add(doc)
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to process RAG document {doc_id}: {e}")
            doc.status = "error"
            db.add(doc)
            await db.commit()

async def _start_campaign_dialer_async(campaign_id: int):
    """
    Async helper to process campaign dialer loops.
    """
    async with SessionLocal() as db:
        # Fetch Campaign details
        result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()
        if not campaign or campaign.status != "active":
            logger.info(f"Campaign {campaign_id} not active or not found. Exiting.")
            return

        # Fetch all pending contacts for this campaign
        cc_res = await db.execute(
            select(CampaignContact)
            .where(
                CampaignContact.campaign_id == campaign_id,
                CampaignContact.status == "pending"
            )
        )
        campaign_contacts = cc_res.scalars().all()
        
        if not campaign_contacts:
            campaign.status = "completed"
            db.add(campaign)
            await db.commit()
            logger.info(f"Campaign {campaign_id} finished. No pending contacts.")
            return

        # Dial contacts (rate-limited / batch calling)
        for cc in campaign_contacts:
            # Reload check to verify campaign is still active
            campaign_check = await db.execute(select(Campaign.status).where(Campaign.id == campaign_id))
            if campaign_check.scalar() != "active":
                logger.info(f"Campaign {campaign_id} paused/stopped. Ending queue.")
                break

            # Fetch target phone contact details
            contact_res = await db.execute(select(Contact).where(Contact.id == cc.contact_id))
            contact = contact_res.scalar_one_or_none()
            if not contact:
                continue

            logger.info(f"Dialing contact {contact.phone_number} for campaign {campaign.name}")
            
            # Update campaign contact status
            cc.status = "calling"
            cc.attempts += 1
            db.add(cc)
            await db.commit()
            
            # Simulate placing outbound call (webhook to FreeSWITCH or Twilio API)
            # In production, trigger Twilio API or FreeSWITCH ESL dialout.
            # Example API call payload to LiveKit Outbound SIP:
            try:
                # Provision Call log
                room_name = f"call_{campaign_id}_{cc.id}_outbound"
                call = Call(
                    organization_id=campaign.organization_id,
                    agent_id=campaign.agent_id,
                    contact_id=contact.id,
                    campaign_id=campaign_id,
                    direction="outbound",
                    status="initiated",
                    sid=room_name
                )
                db.add(call)
                await db.flush()
                
                # Mock calling external SIP trunk / LiveKit
                logger.info(f"Outbound trunk dial command initiated. Room: {room_name}")
                cc.status = "completed"
                db.add(cc)
                
            except Exception as e:
                logger.error(f"Dial error: {e}")
                cc.status = "failed"
                db.add(cc)
                
            await db.commit()
            await asyncio.sleep(2)  # Delay between outbound dials to prevent trunk flooding

@celery_app.task(name="tasks.process_rag_document")
def process_rag_document(doc_id: int):
    """
    Celery task to chunk, embed, and index text documents.
    """
    asyncio.run(_process_rag_document_async(doc_id))

@celery_app.task(name="tasks.start_campaign_dialer")
def start_campaign_dialer(campaign_id: int):
    """
    Celery task to run outbound dialer queues.
    """
    asyncio.run(_start_campaign_dialer_async(campaign_id))
