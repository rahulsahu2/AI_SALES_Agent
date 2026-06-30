import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  PhoneIncoming, 
  PhoneOutgoing, 
  Clock, 
  DollarSign, 
  Play, 
  Loader2 
} from "lucide-react";
import { useAppStore, CallState } from "../lib/store";

export default function Dashboard() {
  const { activeCalls, addTranscriptLine, addCall, updateCallStatus } = useAppStore();
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);

  // Seed sample data for immediate WOW effect in dashboard view
  useEffect(() => {
    if (Object.keys(activeCalls).length === 0) {
      const demoCall: CallState = {
        id: 101,
        direction: "outbound",
        status: "active",
        duration_seconds: 45,
        transcripts: [
          { role: "agent", message: "Thank you for answering! I am calling from VoiceFlow. How are you?", timestamp: "12:00:01" },
          { role: "customer", message: "Oh hi, I am doing fine. What is this about?", timestamp: "12:00:05" },
          { role: "agent", message: "We build multi-tenant AI systems. Would you like to schedule a free demonstration?", timestamp: "12:00:10" }
        ]
      };
      addCall(demoCall);
      setSelectedCallId(101);
    }
  }, []);

  const selectedCall = selectedCallId ? activeCalls[selectedCallId] : null;

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      {/* Header and status info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            System Dashboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">Real-time Call Monitoring and Campaigns Controller</p>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 live-indicator" />
          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">SIP Gateways Active</span>
        </div>
      </div>

      {/* Cards list grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Calls Live", val: Object.keys(activeCalls).length, icon: PhoneIncoming, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Calls Completed", val: "421", icon: PhoneOutgoing, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Avg response latency", val: "220ms", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Cost Today", val: "$14.85", icon: DollarSign, color: "text-rose-400", bg: "bg-rose-500/10" }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card p-6 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{card.label}</span>
                  <div className="text-3xl font-bold mt-2 text-white">{card.val}</div>
                </div>
                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Realtime Call transcribing console and active items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Live calls roster */}
        <div className="lg:col-span-1 glass-panel border border-[#1f2937] p-6 rounded-2xl flex flex-col h-[520px]">
          <h3 className="text-lg font-bold text-gray-200 mb-4">Active Telephony Queue</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {Object.values(activeCalls).map((call) => (
              <button
                key={call.id}
                onClick={() => setSelectedCallId(call.id)}
                className={`w-full p-4 rounded-xl text-left border transition-all duration-200 ${
                  selectedCallId === call.id
                    ? "bg-indigo-600/10 border-indigo-500"
                    : "bg-[#151f32]/40 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-400">Call ID #{call.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {call.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="capitalize">{call.direction}</span>
                  <span>{call.duration_seconds} seconds</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Live conversation text log */}
        <div className="lg:col-span-2 glass-panel border border-[#1f2937] p-6 rounded-2xl flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-[#1f2937] pb-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-200">Dialogue Board</h3>
              {selectedCall && (
                <span className="text-xs text-indigo-400">Session SID: call_{selectedCall.id}_agent_active</span>
              )}
            </div>
            {selectedCall && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCallStatus(selectedCall.id, "bridging")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition"
                >
                  Whisper/Coach
                </button>
                <button
                  onClick={() => updateCallStatus(selectedCall.id, "ended")}
                  className="bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition"
                >
                  Hangup Call
                </button>
              </div>
            )}
          </div>

          {/* Transcript elements loop */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedCall ? (
              selectedCall.transcripts.map((t, idx) => {
                const isAgent = t.role === "agent";
                return (
                  <div key={idx} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        isAgent
                          ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-200 rounded-tl-none"
                          : "bg-gray-800 text-gray-200 border border-gray-700/50 rounded-tr-none"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                          {isAgent ? "AI agent" : "customer"}
                        </span>
                        <span className="text-[9px] opacity-40">{t.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{t.message}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p className="text-sm">Select an active line call to listen live.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
