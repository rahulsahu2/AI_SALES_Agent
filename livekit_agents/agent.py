import asyncio
import logging
import os
import json
import httpx
import redis.asyncio as aioredis
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import JobContext, WorkerOptions, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, deepgram, elevenlabs

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

# Redis Client for real-time pub/sub streaming
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = aioredis.from_url(REDIS_URL)

# Backend URL for API calls
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "system_internal_secret")

class AssistantTools(llm.FunctionContext):
    """
    Define custom actions/tools the agent can invoke mid-call.
    """
    def __init__(self, call_id: int):
        super().__init__()
        self.call_id = call_id

    @llm.ai_callable(description="Transfer the call to a human support agent or supervisor SIP trunk.")
    async def transfer_to_human(self, sip_address: str = "sip:101@localhost") -> str:
        logger.info(f"Triggering human handoff to {sip_address} for call {self.call_id}")
        
        # Publish event to redis to notify the UI/backend of human handoff request
        event = {
            "event": "human_transfer",
            "call_id": self.call_id,
            "target": sip_address
        }
        await redis_client.publish(f"call_events_{self.call_id}", json.dumps(event))
        
        # Post transfer command to backend telephony API
        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    f"{BACKEND_URL}/api/v1/telephony/transfer",
                    json={"call_id": self.call_id, "sip_address": sip_address},
                    headers={"X-Internal-Key": INTERNAL_API_KEY}
                )
            except Exception as e:
                logger.error(f"Failed to post human transfer webhook: {e}")
                
        return f"Transferring your call to a customer representative at {sip_address} now. Please hold."

    @llm.ai_callable(description="Save call outcome variables such as email, booking dates, or interest level.")
    async def save_lead_variable(self, key: str, value: str) -> str:
        logger.info(f"Saving variable for call {self.call_id}: {key} = {value}")
        # Save variables to Redis and persist to DB
        event = {
            "event": "variable_update",
            "call_id": self.call_id,
            "key": key,
            "value": value
        }
        await redis_client.publish(f"call_events_{self.call_id}", json.dumps(event))
        return f"Successfully saved variable {key}."

async def fetch_agent_details(agent_id: int) -> dict:
    """
    Fetch voice, LLM model, system prompts configuration from FastAPI.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BACKEND_URL}/api/v1/telephony/agent-config/{agent_id}",
                headers={"X-Internal-Key": INTERNAL_API_KEY}
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching agent configs: {e}")
            
    # Default fallbacks if backend is unreachable
    return {
        "name": "Default Agent",
        "system_prompt": "You are a helpful AI voice assistant.",
        "greeting": "Hello, how can I help you?",
        "llm_model": "gpt-4o",
        "temperature": 0.7,
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # ElevenLabs default
    }

async def save_transcript_line(call_id: int, role: str, message: str):
    """
    Post transcript line to FastAPI to persist in DB.
    """
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                f"{BACKEND_URL}/api/v1/telephony/transcript",
                json={"call_id": call_id, "role": role, "message": message},
                headers={"X-Internal-Key": INTERNAL_API_KEY}
            )
        except Exception as e:
            logger.error(f"Error saving transcript line: {e}")

async def entrypoint(ctx: JobContext):
    logger.info(f"Agent job started for room: {ctx.room.name}")
    
    # Room name format is expected to be: call_<call_id>_agent_<agent_id>
    call_id = 1
    agent_id = 1
    try:
        parts = ctx.room.name.split("_")
        if len(parts) >= 4:
            call_id = int(parts[1])
            agent_id = int(parts[3])
    except ValueError:
        logger.warning(f"Could not parse call/agent ID from room name: {ctx.room.name}. Using defaults.")

    # 1. Fetch live agent parameters
    agent_config = await fetch_agent_details(agent_id)
    
    # 2. Connect to room
    await ctx.connect()
    logger.info("Connected to room successfully.")

    # 3. Setup STT, LLM, and TTS
    stt = deepgram.STT()
    
    llm_instance = openai.LLM(
        model=agent_config.get("llm_model", "gpt-4o"),
        temperature=agent_config.get("temperature", 0.7)
    )
    
    tts = elevenlabs.TTS(
        voice_id=agent_config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
    )
    
    # Create chat context with the customized System Prompt
    chat_context = openai.ChatContext().append(
        role="system",
        text=agent_config.get("system_prompt", "You are a helpful AI assistant.")
    )

    # 4. Instantiate Assistant Loop
    assistant = VoiceAssistant(
        llm=llm_instance,
        stt=stt,
        tts=tts,
        chat_ctx=chat_context,
        fnc_ctx=AssistantTools(call_id=call_id),
        allow_interruptions=agent_config.get("interrupt_handling", True),
        fading_silence_secs=agent_config.get("silence_timeout", 0.6)
    )

    # 5. Connect handlers to log and broadcast transcripts in real-time
    @assistant.on("user_speech_finished")
    def on_user_speech_finished(event):
        text = event.text.strip()
        if text:
            logger.info(f"Customer: {text}")
            # Stream to Redis Pub/Sub for UI WebSockets
            payload = json.dumps({"event": "transcript", "role": "customer", "message": text, "call_id": call_id})
            asyncio.create_task(redis_client.publish(f"call_transcripts_{call_id}", payload))
            # Persist to DB
            asyncio.create_task(save_transcript_line(call_id, "customer", text))

    @assistant.on("agent_speech_finished")
    def on_agent_speech_finished(event):
        text = event.text.strip()
        if text:
            logger.info(f"Agent: {text}")
            # Stream to Redis Pub/Sub for UI WebSockets
            payload = json.dumps({"event": "transcript", "role": "agent", "message": text, "call_id": call_id})
            asyncio.create_task(redis_client.publish(f"call_transcripts_{call_id}", payload))
            # Persist to DB
            asyncio.create_task(save_transcript_line(call_id, "agent", text))

    # Start conversational loop
    assistant.start(ctx.room)
    
    # Trigger first greet
    greeting = agent_config.get("greeting", "Hello!")
    await assistant.say(greeting, allow_interruptions=True)
    
    # Feed greeting to DB and Redis
    payload = json.dumps({"event": "transcript", "role": "agent", "message": greeting, "call_id": call_id})
    await redis_client.publish(f"call_transcripts_{call_id}", payload)
    await save_transcript_line(call_id, "agent", greeting)
    
    # Stay active until agent gets disconnected
    while ctx.room.is_connected:
        await asyncio.sleep(1)

if __name__ == "__main__":
    agents.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
