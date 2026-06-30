from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Integer, ForeignKey, Boolean, DateTime, Float, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    
    # Encrypted API keys for external services
    openai_api_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    deepgram_api_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    elevenlabs_api_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    twilio_sid: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    twilio_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Wallet / Billing
    wallet_balance: Mapped[float] = mapped_column(Float, default=0.0)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subscription_plan: Mapped[str] = mapped_column(String(50), default="free")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    agents: Mapped[List["Agent"]] = relationship("Agent", back_populates="organization", cascade="all, delete-orphan")
    contacts: Mapped[List["Contact"]] = relationship("Contact", back_populates="organization", cascade="all, delete-orphan")
    campaigns: Mapped[List["Campaign"]] = relationship("Campaign", back_populates="organization", cascade="all, delete-orphan")
    phone_numbers: Mapped[List["PhoneNumber"]] = relationship("PhoneNumber", back_populates="organization", cascade="all, delete-orphan")
    calls: Mapped[List["Call"]] = relationship("Call", back_populates="organization", cascade="all, delete-orphan")
    workflows: Mapped[List["Workflow"]] = relationship("Workflow", back_populates="organization", cascade="all, delete-orphan")
    knowledge_bases: Mapped[List["KnowledgeBase"]] = relationship("KnowledgeBase", back_populates="organization", cascade="all, delete-orphan")
    api_keys: Mapped[List["APIKey"]] = relationship("APIKey", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # RBAC: Super Admin, Tenant Admin, Manager, Supervisor, Agent, Viewer, Developer, API User
    role: Mapped[str] = mapped_column(String(50), default="Agent")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    organization_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    
    # Relationships
    organization: Mapped[Optional[Organization]] = relationship("Organization", back_populates="users")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    
    # AI System Config
    system_prompt: Mapped[str] = mapped_column(Text, default="You are a helpful AI voice assistant.")
    greeting: Mapped[str] = mapped_column(Text, default="Hello, how can I help you today?")
    
    # Provider Settings
    llm_provider: Mapped[str] = mapped_column(String(50), default="openai")  # openai, gemini, claude, ollama
    llm_model: Mapped[str] = mapped_column(String(50), default="gpt-4o")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    
    stt_provider: Mapped[str] = mapped_column(String(50), default="deepgram")  # deepgram, whisper, azure
    
    tts_provider: Mapped[str] = mapped_column(String(50), default="elevenlabs")  # elevenlabs, cartesia, azure
    voice_id: Mapped[str] = mapped_column(String(100), default="21m00Tcm4TlvDq8ikWAM")  # ElevenLabs default
    voice_settings: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    
    # Telephony specific configuration
    interrupt_handling: Mapped[bool] = mapped_column(Boolean, default=True)
    silence_timeout: Mapped[float] = mapped_column(Float, default=0.6)  # Seconds of silence before user finishes speaking
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="agents")
    calls: Mapped[List["Call"]] = relationship("Call", back_populates="agent")
    campaigns: Mapped[List["Campaign"]] = relationship("Campaign", back_populates="agent")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    custom_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="contacts")
    campaign_contacts: Mapped[List["CampaignContact"]] = relationship("CampaignContact", back_populates="contact", cascade="all, delete-orphan")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agents.id", ondelete="RESTRICT"), nullable=False)
    phone_number_id: Mapped[Optional[int]] = mapped_column(ForeignKey("phone_numbers.id", ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Campaign state: draft, scheduled, active, paused, completed, failed
    status: Mapped[str] = mapped_column(String(50), default="draft")
    
    # Calling configurations
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    retry_delay_minutes: Mapped[int] = mapped_column(Integer, default=60)
    time_zone_aware: Mapped[bool] = mapped_column(Boolean, default=True)
    
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="campaigns")
    agent: Mapped[Agent] = relationship("Agent", back_populates="campaigns")
    phone_number: Mapped[Optional["PhoneNumber"]] = relationship("PhoneNumber")
    campaign_contacts: Mapped[List["CampaignContact"]] = relationship("CampaignContact", back_populates="campaign", cascade="all, delete-orphan")


class CampaignContact(Base):
    __tablename__ = "campaign_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    
    # Status: pending, calling, answered, failed, completed, skipped, busy, no-answer
    status: Mapped[str] = mapped_column(String(50), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    campaign: Mapped[Campaign] = relationship("Campaign", back_populates="campaign_contacts")
    contact: Mapped[Contact] = relationship("Contact", back_populates="campaign_contacts")


class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    
    phone_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    friendly_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Provider: twilio, telnyx, sip, freeswitch
    provider: Mapped[str] = mapped_column(String(50), default="sip")
    
    # Connection details (encrypted credentials if any)
    sip_server: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    sip_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sip_password: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="phone_numbers")


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    agent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    contact_id: Mapped[Optional[int]] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    campaign_id: Mapped[Optional[int]] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    
    direction: Mapped[str] = mapped_column(String(20))  # inbound, outbound
    status: Mapped[str] = mapped_column(String(50))     # initiated, ringing, active, completed, failed
    
    # Call metrics
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    recording_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # External tracking (e.g. Twilio SID or LiveKit room name)
    sid: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="calls")
    agent: Mapped[Optional[Agent]] = relationship("Agent", back_populates="calls")
    contact: Mapped[Optional[Contact]] = relationship("Contact")
    transcripts: Mapped[List["CallTranscript"]] = relationship("CallTranscript", back_populates="call", cascade="all, delete-orphan")
    summary: Mapped[Optional["CallSummary"]] = relationship("CallSummary", back_populates="call", uselist=False, cascade="all, delete-orphan")


class CallTranscript(Base):
    __tablename__ = "call_transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    call_id: Mapped[int] = mapped_column(ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    
    role: Mapped[str] = mapped_column(String(20))  # system, agent, user
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    call: Mapped[Call] = relationship("Call", back_populates="transcripts")


class CallSummary(Base):
    __tablename__ = "call_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    call_id: Mapped[int] = mapped_column(ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # positive, neutral, negative
    outcome: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)    # converted, follow-up, disinterested, etc.
    extracted_variables: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    
    # Relationships
    call: Mapped[Call] = relationship("Call", back_populates="summary")


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Full workflow graph data (nodes, edges) representation
    graph_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="workflows")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="knowledge_bases")
    documents: Mapped[List["KnowledgeDocument"]] = relationship("KnowledgeDocument", back_populates="knowledge_base", cascade="all, delete-orphan")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    knowledge_base_id: Mapped[int] = mapped_column(ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    
    filename: Mapped[str] = mapped_column(String(200), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Status: uploading, processing, ready, error
    status: Mapped[str] = mapped_column(String(50), default="processing")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    knowledge_base: Mapped[KnowledgeBase] = relationship("KnowledgeBase", back_populates="documents")
    chunks: Mapped[List["KnowledgeChunk"]] = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # We store embeddings as JSON array initially to keep things database-driver independent.
    # When pgvector is active, we can cast or query this column using float arrays.
    embedding: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    document: Mapped[KnowledgeDocument] = relationship("KnowledgeDocument", back_populates="chunks")


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prefix: Mapped[str] = mapped_column(String(16), nullable=False)  # first few letters e.g., vf_live_...
    hashed_key: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    organization: Mapped[Organization] = relationship("Organization", back_populates="api_keys")
