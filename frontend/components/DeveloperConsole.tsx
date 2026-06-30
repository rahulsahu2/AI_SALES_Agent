import React, { useState } from "react";
import { Key, Copy, Plus, Trash2, CheckCircle } from "lucide-react";

interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  date: string;
}

export default function DeveloperConsole() {
  const [keys, setKeys] = useState<ApiKey[]>([
    { id: 1, name: "Production Calling Script", prefix: "vf_live_ab72d...", date: "2026-06-25" },
    { id: 2, name: "Staging Chatbot CRM Integration", prefix: "vf_live_c10ef...", date: "2026-06-27" }
  ]);
  const [keyName, setKeyName] = useState("");
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);

  const handleCreateKey = () => {
    if (!keyName.trim()) return;
    
    const randomSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const plainToken = `vf_live_${randomSecret}`;
    
    const newKey: ApiKey = {
      id: Date.now(),
      name: keyName,
      prefix: `vf_live_${randomSecret.substring(0, 5)}...`,
      date: new Date().toISOString().split("T")[0]
    };
    
    setKeys((prev) => [newKey, ...prev]);
    setNewKeyRaw(plainToken);
    setKeyName("");
  };

  const handleDelete = (id: number) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Developer Keys</h2>
        <p className="text-gray-400 text-sm mt-1">Manage API credentials to access REST, WebSockets, and Twilio/LiveKit gateways</p>
      </div>

      {newKeyRaw && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-amber-400" />
            <h4 className="font-bold text-sm">Copy Your API Key</h4>
          </div>
          <p className="text-xs text-gray-400">
            For security, we will only show this secret token once. If lost, you will need to revoke it and generate a new key.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              readOnly
              value={newKeyRaw}
              className="bg-[#0b0f19] border border-amber-500/20 text-white font-mono text-sm rounded-lg px-4 py-2.5 flex-1 select-all outline-none"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKeyRaw);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
            >
              <Copy size={14} />
              Copy
            </button>
            <button
              onClick={() => setNewKeyRaw(null)}
              className="text-xs text-gray-400 hover:text-white px-3"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Generate token panel */}
        <div className="lg:col-span-1 glass-panel border border-[#1f2937] p-6 rounded-2xl h-fit space-y-4">
          <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3">
            <Plus size={16} className="text-indigo-400" />
            Generate New Token
          </h3>

          <div className="space-y-3">
            <label className="text-xs text-gray-400 font-semibold uppercase">API Key Label</label>
            <input
              type="text"
              placeholder="e.g. Lead Pipeline Integration"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCreateKey}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <Key size={14} />
              Generate API Key
            </button>
          </div>
        </div>

        {/* Existing keys list */}
        <div className="lg:col-span-2 glass-panel border border-[#1f2937] p-6 rounded-2xl flex flex-col min-h-[400px]">
          <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3 mb-4">
            <Key size={16} className="text-indigo-400" />
            Active Authentication Keys
          </h3>

          <div className="flex-grow space-y-3 overflow-y-auto">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between p-4 bg-[#151f32]/40 border border-gray-800 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Key size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-200">{k.name}</h4>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="font-mono text-indigo-400/80">{k.prefix}</span>
                      <span>Created {k.date}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(k.id)}
                  className="text-gray-500 hover:text-rose-400 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {keys.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p className="text-sm">No API keys configured yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
