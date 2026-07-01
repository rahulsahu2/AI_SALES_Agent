import asyncio
import logging
import os
import json
import httpx
import redis.asyncio as aioredis
from dotenv import load_dotenv
import livekit

from livekit.agents import JobContext, WorkerOptions, cli, llm, RunContext
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import openai, deepgram, elevenlabs, silero

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

# Redis Client for real-time pub/sub streaming
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = aioredis.from_url(REDIS_URL)

# Backend URL for API calls
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "system_internal_secret")


@llm.function_tool
async def transfer_to_human(
    ctx: RunContext,
    sip_address: str = "sip:101@localhost"
) -> str:
    """
    Transfer the call to a human support agent or supervisor SIP trunk.
    """
    call_id = ctx.userdata.get("call_id", 1)
    logger.info(f"Triggering human handoff to {sip_address} for call {call_id}")
    
    # Publish event to redis to notify the UI/backend of human handoff request
    event = {
        "event": "human_transfer",
        "call_id": call_id,
        "target": sip_address
    }
    await redis_client.publish(f"call_events_{call_id}", json.dumps(event))
    
    # Post transfer command to backend telephony API
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                f"{BACKEND_URL}/api/v1/telephony/transfer",
                json={"call_id": call_id, "sip_address": sip_address},
                headers={"X-Internal-Key": INTERNAL_API_KEY}
            )
        except Exception as e:
            logger.error(f"Failed to post human transfer webhook: {e}")
            
    return f"Transferring your call to a customer representative at {sip_address} now. Please hold."


@llm.function_tool
async def save_lead_variable(
    ctx: RunContext,
    key: str,
    value: str
) -> str:
    """
    Save call outcome variables such as email, booking dates, or interest level.
    """
    call_id = ctx.userdata.get("call_id", 1)
    logger.info(f"Saving variable for call {call_id}: {key} = {value}")
    # Save variables to Redis and persist to DB
    event = {
        "event": "variable_update",
        "call_id": call_id,
        "key": key,
        "value": value
    }
    await redis_client.publish(f"call_events_{call_id}", json.dumps(event))
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

    # 3. Setup STT, LLM, TTS and Silero VAD
    stt = deepgram.STT()
    
    llm_instance = openai.LLM(
        model=agent_config.get("llm_model", "gpt-4o"),
        temperature=agent_config.get("temperature", 0.7)
    )
    
    tts = elevenlabs.TTS(
        voice_id=agent_config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
    )
    
    vad_plugin = silero.VAD.load()
    
    # Create chat context with the customized System Prompt
    chat_context = llm.ChatContext().append(
        role="system",
        text=agent_config.get("system_prompt", "You are a helpful AI assistant.")
    )

    # 4. Instantiate Agent
    agent = Agent(
        instructions=agent_config.get("system_prompt", "You are a helpful AI assistant."),
        chat_ctx=chat_context,
        tools=[transfer_to_human, save_lead_variable]
    )

    # 5. Instantiate AgentSession
    session = AgentSession(
        stt=stt,
        vad=vad_plugin,
        llm=llm_instance,
        tts=tts,
        allow_interruptions=agent_config.get("interrupt_handling", True),
        userdata={"call_id": call_id}
    )

    # 6. Connect handlers to log and broadcast transcripts in real-time
    @session.on("conversation_item_added")
    def on_conversation_item_added(event: livekit.agents.voice.events.ConversationItemAddedEvent):
        if isinstance(event.item, llm.ChatMessage):
            text = event.item.content.strip() if isinstance(event.item.content, str) else str(event.item.content).strip()
            if not text:
                return
            
            # Identify role
            if event.item.role == "user":
                role = "customer"
                log_prefix = "Customer"
            elif event.item.role == "assistant":
                role = "agent"
                log_prefix = "Agent"
            else:
                return
                
            logger.info(f"{log_prefix}: {text}")
            # Stream to Redis Pub/Sub for UI WebSockets
            payload = json.dumps({"event": "transcript", "role": role, "message": text, "call_id": call_id})
            asyncio.create_task(redis_client.publish(f"call_transcripts_{call_id}", payload))
            # Persist to DB
            asyncio.create_task(save_transcript_line(call_id, role, text))

    # 7. Start the session in the room
    await session.start(agent=agent, room=ctx.room)
    logger.info("Agent session started successfully.")
    
    # 8. Trigger first greet
    greeting = agent_config.get("greeting", "Hello!")
    await session.say(greeting, allow_interruptions=True)
    
    # Feed greeting to DB and Redis
    payload = json.dumps({"event": "transcript", "role": "agent", "message": greeting, "call_id": call_id})
    await redis_client.publish(f"call_transcripts_{call_id}", payload)
    await save_transcript_line(call_id, "agent", greeting)
    
    # Stay active until agent gets disconnected
    while ctx.room.is_connected:
        await asyncio.sleep(1)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
