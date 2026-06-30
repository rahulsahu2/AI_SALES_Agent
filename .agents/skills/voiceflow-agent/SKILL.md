---
name: voiceflow-agent
description: Setup and execution of LiveKit voice agents, tool registration, and FreeSWITCH SIP configuration for VoiceFlow AI
---

# VoiceFlow AI Real-time Voice Agent Custom Skill

This skill documents how to implement the voice loop, manage LLM function calling (tools), and configure FreeSWITCH routing.

## LiveKit Voice Agent Core Implementation

A standard VoiceFlow AI LiveKit Agent is built using `livekit-agents` (Python SDK). It connects to a room and sets up the audio streaming pipeline using:
- **Speech-to-Text (STT)**: Deepgram or Whisper.
- **Large Language Model (LLM)**: OpenAI, Claude, or Gemini.
- **Text-to-Speech (TTS)**: ElevenLabs or Cartesia.

### Execution Blueprint (`livekit_agents/agent.py`)

```python
import logging
from livekit import agents
from livekit.agents import JobContext, WorkerOptions, JobRequest
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, deepgram, elevenlabs

logger = logging.getLogger("voiceflow-agent")

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect()
    
    # Retrieve agent metadata/config from database (passed via room metadata or connection payload)
    # We fetch agent_id from the room name or participant identity
    agent_config = await fetch_agent_configuration(ctx.room.name)

    # Initialize LLM with custom prompt & temperature
    llm = openai.LLM(
        model=agent_config.get("llm_model", "gpt-4o"),
        temperature=agent_config.get("temperature", 0.7)
    )
    
    # Initialize STT
    stt = deepgram.STT()
    
    # Initialize TTS
    tts = elevenlabs.TTS(
        voice_id=agent_config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
    )
    
    # Set up Voice Assistant
    assistant = VoiceAssistant(
        llm=llm,
        stt=stt,
        tts=tts,
        chat_ctx=openai.ChatContext().append(
            role="system",
            text=agent_config.get("system_prompt", "You are a helpful customer service representative.")
        ),
        allow_interruptions=agent_config.get("interrupt_handling", True),
        fading_silence_secs=agent_config.get("silence_timeout", 0.5)
    )
    
    # Start the assistant in the room
    assistant.start(ctx.room)
    
    # Send initial greeting
    await assistant.say(agent_config.get("greeting", "Hello, how can I help you today?"), allow_interruptions=True)

if __name__ == "__main__":
    agents.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

## LLM Custom Tool/Function Calling

For visual workflows and API integrations, the Voice Assistant registers tools using the LLM's function calling interface. 

### Custom Tool Example

```python
from livekit.agents import llm

class AgentTools(llm.FunctionContext):
    @llm.ai_callable(description="Transfer the call to a human operator or agent queue")
    def transfer_to_human(self, target_sip_uri: str) -> str:
        # Trigger SIP refer / transfer command to FreeSWITCH
        return f"Initiating call transfer to {target_sip_uri}..."
        
    @llm.ai_callable(description="Send an email or SMS notification during the call")
    def trigger_notification(self, contact_email: str, message: str) -> str:
        # Calls the FastAPI backend Webhook or Notification broker
        return "Notification sent successfully."
```

## FreeSWITCH Telephony Setup

FreeSWITCH receives PSTN calls from Twilio/Telnyx and bridges them to LiveKit.

### Dialplan Blueprint (`freeswitch/dialplan/public.xml`)

```xml
<extension name="inbound_sip_to_livekit">
    <condition field="destination_number" expression="^(.*)$">
        <!-- 1. Authenticate / Identify tenant phone number -->
        <action application="set" data="tenant_phone=$1"/>
        <!-- 2. Request FastAPI to provision a LiveKit token & room -->
        <action application="curl" data="http://fastapi-api:8000/api/v1/telephony/inbound-token?phone=${tenant_phone}"/>
        <!-- 3. Bridge Call to LiveKit SIP trunk URI -->
        <action application="bridge" data="sofia/external/${lk_room_token}@sip.livekit.cloud"/>
    </condition>
</extension>
```
