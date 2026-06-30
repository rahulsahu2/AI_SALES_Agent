import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger("websockets")

@router.websocket("/ws/{call_id}")
async def websocket_endpoint(websocket: WebSocket, call_id: int):
    """
    Subscribes to Redis Pub/Sub channels for call transcript events
    and pipes them to the frontend in real time.
    """
    await websocket.accept()
    logger.info(f"WebSocket client connected to call {call_id}")
    
    # Setup redis connection
    redis = aioredis.from_url(settings.REDIS_URL)
    pubsub = redis.pubsub()
    
    # Subscribe to transcripts and general call events (e.g. variable updates, human transfers)
    await pubsub.subscribe(f"call_transcripts_{call_id}", f"call_events_{call_id}")
    
    async def listen_redis():
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True)
                if message and message["type"] == "message":
                    data = json.loads(message["data"].decode("utf-8"))
                    await websocket.send_json(data)
                await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in Redis listener thread: {e}")
            
    # Spawn Redis listener in background
    listener_task = asyncio.create_task(listen_redis())
    
    try:
        # Keep connection open and await messages from client (e.g. interrupt AI request or take-over commands)
        while True:
            client_msg = await websocket.receive_text()
            data = json.loads(client_msg)
            
            # Allow live manager to trigger actions: "interrupt" or "take_over"
            action = data.get("action")
            if action == "interrupt":
                # Publish interrupt trigger to redis (read by LiveKit Agent)
                await redis.publish(
                    f"agent_commands_{call_id}",
                    json.dumps({"command": "interrupt"})
                )
            elif action == "take_over":
                # Tell agent to mute and bridge human SIP channel
                await redis.publish(
                    f"agent_commands_{call_id}",
                    json.dumps({"command": "take_over"})
                )
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected from call {call_id}")
    except Exception as e:
        logger.error(f"WebSocket session error: {e}")
    finally:
        listener_task.cancel()
        await pubsub.unsubscribe()
        await pubsub.close()
        await redis.close()
