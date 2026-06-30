import React, { useState } from "react";
import { Users, Plus, Trash2, Search, Filter } from "lucide-react";

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  tags: string[];
}

export default function Contacts() {
  const [leads, setLeads] = useState<Lead[]>([
    { id: 1, first_name: "Alice", last_name: "Smith", phone: "+15550199", email: "alice@example.com", tags: ["High Priority", "Enterprise"] },
    { id: 2, first_name: "Bob", last_name: "Jones", phone: "+15550188", email: "bob@example.com", tags: ["Self Serve"] }
  ]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddContact = () => {
    if (!phone || !firstName) return;
    const newLead: Lead = {
      id: Date.now(),
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      tags: tagsInput.split(",").map((t) => t.trim()).filter((t) => t !== "")
    };
    setLeads((prev) => [newLead, ...prev]);
    // Reset form
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setTagsInput("");
    setShowAddForm(false);
  };

  const handleDelete = (id: number) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Contacts Registry</h2>
          <p className="text-gray-400 text-sm mt-1">Add, import, filter, and inspect customer leads</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <Plus size={16} />
          {showAddForm ? "Close Form" : "Add Contact"}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="Enterprise, Inbound"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              onClick={handleAddContact}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition"
            >
              Confirm Save Lead
            </button>
          </div>
        </div>
      )}

      {/* Leads listing table */}
      <div className="glass-panel border border-[#1f2937] rounded-2xl overflow-hidden">
        
        {/* Table header bar */}
        <div className="p-4 border-b border-[#1f2937] flex items-center justify-between bg-[#151f32]/20">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search leads name or phone..."
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-300 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-[#151f32] border border-gray-800 text-xs text-gray-300 px-3.5 py-2 rounded-lg hover:border-gray-700">
              <Filter size={14} />
              Filter Tags
            </button>
          </div>
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f2937] text-xs text-gray-400 font-semibold uppercase bg-[#151f32]/10">
                <th className="p-4">Contact Profile</th>
                <th className="p-4">Phone Call URI</th>
                <th className="p-4">Tags</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937] text-sm text-gray-300">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-800/10 transition">
                  <td className="p-4">
                    <div className="font-bold text-gray-200">
                      {lead.first_name} {lead.last_name}
                    </div>
                    {lead.email && <div className="text-xs text-gray-500 mt-0.5">{lead.email}</div>}
                  </td>
                  <td className="p-4 font-mono text-xs text-indigo-400">{lead.phone}</td>
                  <td className="p-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {lead.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="text-gray-500 hover:text-rose-400 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
