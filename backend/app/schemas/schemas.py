from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ==========================================
# Token Schemas
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None


# ==========================================
# Organization Schemas
# ==========================================
class OrganizationBase(BaseModel):
    name: str
    slug: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    openai_api_key: Optional[str] = None
    deepgram_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    twilio_sid: Optional[str] = None
    twilio_token: Optional[str] = None

class OrganizationOut(OrganizationBase):
    id: int
    wallet_balance: float
    subscription_plan: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# ==========================================
# User Schemas
# ==========================================
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "Agent"

class UserCreate(UserBase):
    password: str
    organization_slug: Optional[str] = None  # To associate user to org during sign up

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    organization_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: EmailStr  # OAuth2 standard field name for user login
    password: str


# ==========================================
# Agent Schemas
# ==========================================
class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    system_prompt: str = "You are a helpful AI voice assistant."
    greeting: str = "Hello, how can I help you today?"
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    temperature: float = 0.7
    stt_provider: str = "deepgram"
    tts_provider: str = "elevenlabs"
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    voice_settings: Dict[str, Any] = Field(default_factory=dict)
    interrupt_handling: bool = True
    silence_timeout: float = 0.6

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    system_prompt: Optional[str] = None
    greeting: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    stt_provider: Optional[str] = None
    tts_provider: Optional[str] = None
    voice_id: Optional[str] = None
    voice_settings: Optional[Dict[str, Any]] = None
    interrupt_handling: Optional[bool] = None
    silence_timeout: Optional[float] = None
    is_active: Optional[bool] = None

class AgentOut(AgentBase):
    id: int
    organization_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Contact Schemas
# ==========================================
class ContactBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: str
    email: Optional[EmailStr] = None
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class ContactOut(ContactBase):
    id: int
    organization_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Campaign Schemas
# ==========================================
class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    agent_id: int
    phone_number_id: Optional[int] = None
    max_retries: int = 3
    retry_delay_minutes: int = 60
    time_zone_aware: bool = True
    scheduled_start: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    contact_ids: List[int] = Field(default_factory=list)

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    agent_id: Optional[int] = None
    phone_number_id: Optional[int] = None
    status: Optional[str] = None
    max_retries: Optional[int] = None
    retry_delay_minutes: Optional[int] = None
    time_zone_aware: Optional[bool] = None
    scheduled_start: Optional[datetime] = None

class CampaignOut(CampaignBase):
    id: int
    organization_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Call Schemas
# ==========================================
class CallTranscriptOut(BaseModel):
    role: str
    message: str
    timestamp: datetime
    latency_ms: Optional[int] = None

    class Config:
        from_attributes = True

class CallSummaryOut(BaseModel):
    summary: str
    sentiment: Optional[str] = None
    outcome: Optional[str] = None
    extracted_variables: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True

class CallOut(BaseModel):
    id: int
    organization_id: int
    agent_id: Optional[int] = None
    contact_id: Optional[int] = None
    campaign_id: Optional[int] = None
    direction: str
    status: str
    duration_seconds: int
    cost: float
    recording_url: Optional[str] = None
    sid: str
    created_at: datetime
    ended_at: Optional[datetime] = None

    # Optional detailed expansions
    transcripts: Optional[List[CallTranscriptOut]] = None
    summary: Optional[CallSummaryOut] = None

    class Config:
        from_attributes = True


# ==========================================
# API Key Schemas
# ==========================================
class APIKeyCreate(BaseModel):
    name: str

class APIKeyOut(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class APIKeyFullOut(APIKeyOut):
    plain_token: str  # Only returned once upon creation


# ==========================================
# Workflow Schemas
# ==========================================
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    graph_data: Dict[str, Any] = Field(default_factory=dict)

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class WorkflowOut(WorkflowBase):
    id: int
    organization_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
