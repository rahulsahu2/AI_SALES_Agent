# VoiceFlow AI Project Rules & Guidelines

This workspace contains the codebase for **VoiceFlow AI**, a multi-tenant AI voice-calling platform.

## Multi-Tenancy Isolation
1. **Always Filter by Tenant**: All database tables representing tenant data must contain `organization_id`. Ensure every query filters by `organization_id` (using standard FastAPI dependencies or ORM filters).
2. **Encrypted Credentials**: External API keys (OpenAI, Deepgram, Twilio) must be encrypted using AES-GCM prior to database storage and decrypted at runtime.
3. **No Cross-Tenant Interaction**: Contacts, campaigns, agents, and workflows must never cross organization boundaries.

## Backend (FastAPI) Style
1. **SQLAlchemy 2.0**: Use modern 2.0 style syntax (e.g., `select(Model).where(...)`) and use `AsyncSession` for all API endpoints.
2. **Pydantic v2**: Use Pydantic v2 schemas for request validation and response serialization.
3. **Services Layer**: Avoid putting business logic directly in the route handlers. Delegate calling, LLM prompting, and billing tasks to `services/`.
4. **Celery Worker**: Background tasks (campaign calling loops, bulk CSV contact imports, RAG document processing) must run as Celery tasks and notify users via WebSocket/Redis channels.

## Frontend (Next.js) Style
1. **TypeScript & Strict Types**: Never use `any`. Define interfaces/types for all API responses and component props.
2. **Tailwind & Shadcn UI**: Keep design modern, polished, and use consistent spacing, color systems, and CSS variables. Make sure dark mode is fully supported.
3. **Zustand for State**: Use Zustand for client state management (e.g., Auth, global call status). Use React Query for backend data fetching/mutations.

## Telephony & LiveKit Agents
1. **LiveKit Python Agent SDK**: The agent runs in a container and hooks into LiveKit SFU events. It uses speech-to-text (STT) and text-to-speech (TTS) streaming.
2. **FreeSWITCH integration**: Use Event Socket Library (ESL) or HTTP dialplans to dynamically route outbound and inbound SIP connections.
