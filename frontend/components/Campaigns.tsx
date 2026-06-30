import React, { useState, useEffect } from "react";
import { 
  PhoneCall, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  AlertCircle, 
  User, 
  Calendar,
  Layers
} from "lucide-react";
import { useAppStore, getApiUrl } from "../lib/store";

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  agent_id: number;
  phone_number_id: number;
  status: string; // draft, active, paused, completed, scheduled
  max_retries: number;
  retry_delay_minutes: number;
  scheduled_start: string | null;
  created_at: string;
}

interface Agent {
  id: number;
  name: string;
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export default function Campaigns() {
  const { token } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Create Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | "">("");
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(60);
  const [scheduledStart, setScheduledStart] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/campaigns/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to load campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load campaigns list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const apiUrl = getApiUrl();
      // Fetch Agents
      const agentsRes = await fetch(`${apiUrl}/api/v1/agents/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData);
        if (agentsData.length > 0) setSelectedAgentId(agentsData[0].id);
      }

      // Fetch Contacts
      const contactsRes = await fetch(`${apiUrl}/api/v1/contacts/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }
    } catch (err) {
      console.error("Failed to load campaign creation prerequisites", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCampaigns();
      fetchPrerequisites();
    }
  }, [token]);

  const handleSelectContact = (id: number) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAllContacts = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map(c => c.id));
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedAgentId) return;
    
    setSubmitting(true);
    setErrorMsg("");
    try {
      const apiUrl = getApiUrl();
      
      // Determine initial status based on scheduled start date
      const isScheduled = scheduledStart !== "";
      const payload = {
        name,
        description: description || null,
        agent_id: Number(selectedAgentId),
        phone_number_id: 1, // Default seeded Caller ID trunk
        max_retries: Number(maxRetries),
        retry_delay_minutes: Number(retryDelay),
        time_zone_aware: true,
        scheduled_start: isScheduled ? new Date(scheduledStart).toISOString() : null,
        contact_ids: selectedContactIds
      };

      const response = await fetch(`${apiUrl}/api/v1/campaigns/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to create campaign");
      }

      const createdCampaign = await response.json();

      // If scheduled start is set, transition from draft to scheduled
      if (isScheduled) {
        await fetch(`${apiUrl}/api/v1/campaigns/${createdCampaign.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: "scheduled" })
        });
      }

      // Reset Form
      setName("");
      setDescription("");
      setScheduledStart("");
      setSelectedContactIds([]);
      setShowAddForm(false);
      
      fetchCampaigns();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (campaignId: number, currentStatus: string) => {
    setErrorMsg("");
    try {
      const apiUrl = getApiUrl();
      const nextStatus = currentStatus === "active" ? "paused" : "active";

      const response = await fetch(`${apiUrl}/api/v1/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error(`Failed to change campaign status to ${nextStatus}`);
      }

      setCampaigns(prev => 
        prev.map(c => c.id === campaignId ? { ...c, status: nextStatus } : c)
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change campaign status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "paused":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "scheduled":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Outbound Campaigns</h2>
          <p className="text-gray-400 text-sm mt-1">Configure bulk dial queues and automate agent call lists</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 text-sm"
        >
          <Plus size={16} />
          {showAddForm ? "Close Form" : "Create Campaign"}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Campaign Creation Form */}
      {showAddForm && (
        <form onSubmit={handleCreateCampaign} className="glass-panel border border-[#1f2937] p-6 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
            <Layers size={18} className="text-indigo-400" />
            New Calling Campaign Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  placeholder="E.g., Q3 Real Estate Outbound"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  placeholder="Details about leads and call purpose..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Assign AI Voice Agent</label>
                <select
                  required
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
                >
                  {agents.length === 0 ? (
                    <option value="" disabled>No agents found. Seed system first.</option>
                  ) : (
                    agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (ID: {a.id})</option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Max Retries</label>
                  <input
                    type="number"
                    min={0}
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Retry Delay (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={retryDelay}
                    onChange={(e) => setRetryDelay(Number(e.target.value))}
                    className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-1.5">
                  <Calendar size={12} className="text-indigo-400" />
                  Scheduled Start Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">If blank, campaign triggers immediately as draft.</p>
              </div>
            </div>

            {/* Right Side: Contacts multi-select roster */}
            <div className="space-y-2 flex flex-col h-[340px]">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 font-semibold uppercase">Assign Lead List ({selectedContactIds.length} Selected)</label>
                <button
                  type="button"
                  onClick={handleSelectAllContacts}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase"
                >
                  {selectedContactIds.length === contacts.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto border border-gray-800 rounded-xl bg-[#151f32]/40 divide-y divide-gray-800 p-2 space-y-1">
                {contacts.length === 0 ? (
                  <div className="p-12 text-center text-xs text-gray-500">
                    No contacts in registry. Create contacts first.
                  </div>
                ) : (
                  contacts.map(c => {
                    const isSelected = selectedContactIds.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleSelectContact(c.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          isSelected ? "bg-indigo-600/10 text-indigo-300" : "text-gray-400 hover:bg-gray-800/20"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-200">{c.first_name} {c.last_name}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{c.phone_number}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#1f2937]">
            <button
              type="submit"
              disabled={submitting || contacts.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold text-xs px-6 py-3 rounded-lg transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Save and Register Campaign
            </button>
          </div>
        </form>
      )}

      {/* Campaigns Listing Table */}
      <div className="glass-panel border border-[#1f2937] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <span className="text-xs">Fetching campaigns list...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            No outbound campaigns found. Press "Create Campaign" to configure one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f2937] text-xs text-gray-400 font-semibold uppercase bg-[#151f32]/10">
                  <th className="p-4">Campaign Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Max Retries</th>
                  <th className="p-4">Scheduled Start</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937] text-sm text-gray-300">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/10 transition">
                    <td className="p-4">
                      <div className="font-bold text-gray-200">{c.name}</div>
                      {c.description && <div className="text-xs text-gray-500 mt-0.5">{c.description}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-400">
                      {c.max_retries} attempts ({c.retry_delay_minutes} min delay)
                    </td>
                    <td className="p-4 text-xs text-gray-400">
                      {c.scheduled_start ? new Date(c.scheduled_start).toLocaleString() : "Manual Start"}
                    </td>
                    <td className="p-4 text-right">
                      {c.status !== "completed" && (
                        <button
                          onClick={() => handleToggleStatus(c.id, c.status)}
                          className={`p-2 rounded-lg border transition mr-2 ${
                            c.status === "active"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                          title={c.status === "active" ? "Pause Dialer" : "Start Dialer"}
                        >
                          {c.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
