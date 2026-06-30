import React, { useState, useEffect } from "react";
import { Sliders, Save, Cpu, Volume2, Plus, Trash2, Loader2, AlertCircle, Check } from "lucide-react";
import { useAppStore, getApiUrl } from "../lib/store";

interface Agent {
  id: number;
  name: string;
  system_prompt: string;
  greeting: string;
  llm_model: string;
  temperature: number;
  voice_id: string;
  silence_timeout: number;
  interrupt_handling: boolean;
}

export default function AgentBuilder() {
  const { token } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<number | null>(null);

  // Form State
  const [agentName, setAgentName] = useState("Sales Qualifier");
  const [greeting, setGreeting] = useState("Hi there! How can I help you?");
  const [prompt, setPrompt] = useState("You are a helpful sales qualification assistant.");
  const [model, setModel] = useState("gpt-4o");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [temperature, setTemperature] = useState(0.7);
  const [silenceThreshold, setSilenceThreshold] = useState(0.6);
  const [interruption, setInterruption] = useState(true);

  // UI States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchAgents = async (selectId: number | null = null) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/agents/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to load agents list from DB");
      }
      const data = await response.json();
      setAgents(data);
      
      if (data.length > 0) {
        // Select either the requested agent or fall back to the first one in the list
        const target = selectId ? data.find((a: Agent) => a.id === selectId) : data[0];
        if (target) {
          applyAgentToForm(target);
        } else {
          applyAgentToForm(data[0]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  };

  const applyAgentToForm = (agent: Agent) => {
    setActiveAgentId(agent.id);
    setAgentName(agent.name);
    setGreeting(agent.greeting);
    setPrompt(agent.system_prompt);
    setModel(agent.llm_model);
    setVoiceId(agent.voice_id);
    setTemperature(agent.temperature);
    setSilenceThreshold(agent.silence_timeout);
    setInterruption(agent.interrupt_handling);
  };

  useEffect(() => {
    if (token) {
      fetchAgents();
    }
  }, [token]);

  const handleSelectAgent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    const agent = agents.find(a => a.id === selectedId);
    if (agent) {
      applyAgentToForm(agent);
    }
  };

  const handleSaveConfig = async () => {
    if (!activeAgentId) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const apiUrl = getApiUrl();
      const payload = {
        name: agentName,
        system_prompt: prompt,
        greeting: greeting,
        llm_model: model,
        temperature: temperature,
        voice_id: voiceId,
        silence_timeout: silenceThreshold,
        interrupt_handling: interruption
      };

      const response = await fetch(`${apiUrl}/api/v1/agents/${activeAgentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to update agent configuration");
      }

      setSuccessMsg("Agent configuration saved successfully.");
      
      // Reload details in selector dropdown list
      await fetchAgents(activeAgentId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save agent config");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewAgent = async () => {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const apiUrl = getApiUrl();
      const payload = {
        name: `${agentName} (Copy)`,
        system_prompt: prompt,
        greeting: greeting,
        llm_model: model,
        temperature: temperature,
        voice_id: voiceId,
        silence_timeout: silenceThreshold,
        interrupt_handling: interruption
      };

      const response = await fetch(`${apiUrl}/api/v1/agents/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to create new agent");
      }

      const newAgent = await response.json();
      setSuccessMsg("Created new agent configuration successfully.");
      await fetchAgents(newAgent.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!activeAgentId) return;
    if (agents.length <= 1) {
      alert("You must keep at least one active agent configuration in the system.");
      return;
    }
    if (!confirm("Are you sure you want to delete this agent configuration?")) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/agents/${activeAgentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to delete agent configuration");
      }
      setSuccessMsg("Deleted agent configuration.");
      await fetchAgents();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Agent Settings</h2>
          <p className="text-gray-400 text-sm mt-1">Configure AI LLM weights, voice characteristics, and system prompts</p>
        </div>
        
        {/* Selector and Actions */}
        <div className="flex items-center gap-3">
          <select
            value={activeAgentId || ""}
            onChange={handleSelectAgent}
            disabled={loading}
            className="bg-[#151f32] border border-[#223250] text-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} (ID: {a.id})</option>
            ))}
          </select>

          <button
            onClick={handleCreateNewAgent}
            disabled={saving}
            className="flex items-center gap-2 bg-[#151f32] border border-gray-800 hover:border-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl transition text-sm"
            title="Create a duplicate agent"
          >
            <Plus size={16} className="text-indigo-400" />
            Duplicate
          </button>

          <button
            onClick={handleDeleteAgent}
            disabled={loading || agents.length <= 1}
            className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-semibold px-4 py-2.5 rounded-xl transition text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={saving || !activeAgentId}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 text-sm"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Save size={16} />
                Save Config
              </>
            )}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <Check size={18} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="p-24 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <span className="text-sm">Loading agent settings...</span>
        </div>
      ) : (
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
                <label className="text-xs text-gray-400 font-semibold uppercase">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                >
                  <option value="gpt-4o">gpt-4o (Default)</option>
                  <option value="gpt-4-turbo">gpt-4-turbo</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
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
                <label className="text-xs text-gray-400 font-semibold uppercase">ElevenLabs / Speaker ID</label>
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
      )}
    </div>
  );
}
