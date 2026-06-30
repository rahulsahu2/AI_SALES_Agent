from fastapi import APIRouter
from app.api.v1 import auth, agents, contacts, campaigns, calls, api_keys, workflows, telephony, websockets

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(telephony.router, prefix="/telephony", tags=["telephony"])
api_router.include_router(websockets.router, tags=["websockets"])
