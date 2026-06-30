import React from "react";
import { BarChart3, TrendingUp, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export default function Analytics() {
  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Analytics Panel</h2>
        <p className="text-gray-400 text-sm mt-1">Audit token usage costs, voice streaming latencies, and conversion stats</p>
      </div>

      {/* Latency and Accuracy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "STT Accuracy", val: "98.4%", desc: "Deepgram whisper-large v3", icon: ShieldCheck, color: "text-emerald-400" },
          { label: "TTS Stream Latency", val: "180ms", desc: "Elevenlabs Turbo API", icon: Clock, color: "text-indigo-400" },
          { label: "Avg LLM Generation", val: "420ms", desc: "OpenAI gpt-4o streaming", icon: BarChart3, color: "text-amber-400" }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="glass-panel border border-[#1f2937] p-6 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{item.label}</span>
                <div className="text-2xl font-bold text-white mt-1.5">{item.val}</div>
                <span className="text-xs text-gray-400 mt-1 block">{item.desc}</span>
              </div>
              <div className={`p-3 bg-gray-800/50 rounded-xl ${item.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Cost tracking card */}
        <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl space-y-4">
          <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3">
            <TrendingUp size={16} className="text-indigo-400" />
            Billing Cost Trends (Last 7 Days)
          </h3>
          
          <div className="relative h-64 w-full pt-4">
            {/* Simple SVG Line Chart */}
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="500" y2="50" stroke="#1f2937" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#1f2937" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#1f2937" strokeWidth="1" strokeDasharray="5,5" />
              
              {/* Area path */}
              <path
                d="M0,150 L50,130 L150,140 L250,90 L350,110 L450,40 L500,60 L500,200 L0,200 Z"
                fill="url(#chart-grad)"
              />
              
              {/* Line path */}
              <path
                d="M0,150 L50,130 L150,140 L250,90 L350,110 L450,40 L500,60"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
              />
              
              {/* Data Points */}
              <circle cx="50" cy="130" r="4" fill="#6366f1" />
              <circle cx="150" cy="140" r="4" fill="#6366f1" />
              <circle cx="250" cy="90" r="4" fill="#6366f1" />
              <circle cx="350" cy="110" r="4" fill="#6366f1" />
              <circle cx="450" cy="40" r="4" fill="#6366f1" />
              <circle cx="500" cy="60" r="4" fill="#6366f1" />
            </svg>
            
            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] text-gray-500 font-semibold uppercase mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* Campaign conversion stats */}
        <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl space-y-4">
          <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3">
            <BarChart3 size={16} className="text-indigo-400" />
            Campaign Conversion Rates
          </h3>

          <div className="space-y-4 pt-2">
            {[
              { name: "SaaS Lead Qualifier Outbound", pct: 78, color: "bg-indigo-600" },
              { name: "Inbound Billing Support Desk", pct: 45, color: "bg-emerald-500" },
              { name: "Enterprise Demo Follow-up Loop", pct: 92, color: "bg-amber-500" }
            ].map((camp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-300">{camp.name}</span>
                  <span className="text-white">{camp.pct}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${camp.color}`} style={{ width: `${camp.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
