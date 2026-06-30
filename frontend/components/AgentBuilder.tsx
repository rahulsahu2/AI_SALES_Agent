import React, { useState } from "react";
import { Sliders, Save, Cpu, Volume2, HelpCircle } from "lucide-react";

export default function AgentBuilder() {
  const [agentName, setAgentName] = useState("Sales Qualifier");
  const [greeting, setGreeting] = useState("Hi there! I saw you were looking at VoiceFlow AI. How can I help you?");
  const [prompt, setPrompt] = useState(
    "You are a sales qualification representative for VoiceFlow AI.\n" +
    "Your objective is to identify if the lead has a call center volume of >1000 calls/day.\n" +
    "Be polite, professional, and do not repeat yourself."
  );
  const [llmProvider, setLlmProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [voiceProvider, setVoiceProvider] = useState("elevenlabs");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [temperature, setTemperature] = useState(0.7);
  const [silenceThreshold, setSilenceThreshold] = useState(0.6);
  const [interruption, setInterruption] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setSaved(false);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
    }, 1000);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Agent Settings</h2>
          <p className="text-gray-400 text-sm mt-1">Configure AI LLM weights, voice characteristics, and core system prompt instructions</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          {loading ? (
            <span className="text-xs">Saving...</span>
          ) : (
            <>
              <Save size={16} />
              Save Config
            </>
          )}
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-semibold">
          Agent configuration saved successfully. Config changes will take effect on next dial session.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Configs: Model & Voice Parameters) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* LLM settings */}
          <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3">
              <Cpu size={16} className="text-indigo-400" />
              LLM Orchestration
            </h3>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase">Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              >
                <option value="openai">OpenAI (GPT Models)</option>
                <option value="claude">Anthropic (Claude Models)</option>
                <option value="gemini">Google (Gemini Models)</option>
                <option value="ollama">Ollama (Local LLMs)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              >
                <option value="gpt-4o">gpt-4o (Default)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold uppercase">
                <span className="text-gray-400">Temperature</span>
                <span className="text-indigo-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Voice synthesis settings */}
          <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl space-y-4">
            <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3">
              <Volume2 size={16} className="text-indigo-400" />
              Voice Synthesis
            </h3>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase">Provider</label>
              <select
                value={voiceProvider}
                onChange={(e) => setVoiceProvider(e.target.value)}
                className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              >
                <option value="elevenlabs">ElevenLabs (High Fidelity)</option>
                <option value="cartesia">Cartesia (Ultra Low Latency)</option>
                <option value="azure">Azure Speech</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold uppercase">Voice ID / Speaker</label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold uppercase">
                <span className="text-gray-400">Silence Timeout</span>
                <span className="text-indigo-400">{silenceThreshold}s</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.1"
                value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-[#1f2937] pt-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-200">Interruption Barge-In</span>
                <span className="text-[10px] text-gray-500">Mutes AI if customer interrupts</span>
              </div>
              <input
                type="checkbox"
                checked={interruption}
                onChange={(e) => setInterruption(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-gray-900 border-gray-800 focus:ring-indigo-500"
              />
            </div>
          </div>

        </div>

        {/* Right Columns (Prompts and Greeting Scripts) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl space-y-6 h-full flex flex-col">
            <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3 shrink-0">
              <Sliders size={16} className="text-indigo-400" />
              Agent Configuration Parameters
            </h3>

            <div className="space-y-2 shrink-0">
              <label className="text-xs text-gray-400 font-semibold uppercase">Agent Display Name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2 shrink-0">
              <label className="text-xs text-gray-400 font-semibold uppercase">First Greeting Script</label>
              <input
                type="text"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex-1 flex flex-col space-y-2">
              <label className="text-xs text-gray-400 font-semibold uppercase">System Instruction Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                className="flex-1 w-full bg-[#151f32] border border-gray-800 rounded-lg p-4 text-sm text-gray-200 outline-none focus:border-indigo-500 resize-none font-mono"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
