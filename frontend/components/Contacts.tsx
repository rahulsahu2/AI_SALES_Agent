import React, { useState, useEffect } from "react";
import { Users, Plus, Trash2, Search, Filter, Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { useAppStore, getApiUrl } from "../lib/store";

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export default function Contacts() {
  const { token } = useAppStore();
  const [leads, setLeads] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // CSV State
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/contacts/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to load contacts from API");
      }
      const data = await response.json();
      setLeads(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred fetching leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLeads();
    }
  }, [token]);

  const handleAddContact = async () => {
    if (!phone || !firstName) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const apiUrl = getApiUrl();
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: email || null,
        notes: notes || null,
        tags: tagsInput.split(",").map((t) => t.trim()).filter((t) => t !== "")
      };

      const response = await fetch(`${apiUrl}/api/v1/contacts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.detail || "Failed to create contact");
      }

      // Reset form
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setTagsInput("");
      setShowAddForm(false);
      
      // Reload list
      fetchLeads();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/contacts/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete contact");
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
        if (lines.length <= 1) {
          throw new Error("CSV file is empty or missing headers");
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        
        const firstNameIdx = headers.indexOf("first_name");
        const lastNameIdx = headers.indexOf("last_name");
        const phoneIdx = headers.indexOf("phone_number") !== -1 ? headers.indexOf("phone_number") : headers.indexOf("phone");
        const emailIdx = headers.indexOf("email");
        const notesIdx = headers.indexOf("notes");
        const tagsIdx = headers.indexOf("tags");

        if (firstNameIdx === -1 || phoneIdx === -1) {
          throw new Error("CSV must contain 'first_name' and 'phone_number' (or 'phone') columns.");
        }

        const apiUrl = getApiUrl();
        const uploadPromises = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          if (values.length < headers.length) continue;

          const payload = {
            first_name: values[firstNameIdx],
            last_name: lastNameIdx !== -1 ? values[lastNameIdx] : "",
            phone_number: values[phoneIdx],
            email: emailIdx !== -1 && values[emailIdx] ? values[emailIdx] : null,
            notes: notesIdx !== -1 ? values[notesIdx] : "",
            tags: tagsIdx !== -1 && values[tagsIdx] ? values[tagsIdx].split(";").map(t => t.trim()).filter(t => t !== "") : []
          };

          uploadPromises.push(
            fetch(`${apiUrl}/api/v1/contacts/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            })
          );
        }

        const responses = await Promise.all(uploadPromises);
        const successfulCount = responses.filter(r => r.ok).length;
        setUploadSuccess(`Successfully imported ${successfulCount} contacts from CSV.`);
        fetchLeads();
      } catch (err: any) {
        setUploadError(err.message || "Failed to parse CSV file");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const filteredLeads = leads.filter(lead => {
    const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
    const phone = lead.phone_number.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || phone.includes(query);
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      {/* Header and Bulk Action controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Contacts Registry</h2>
          <p className="text-gray-400 text-sm mt-1">Add, import, filter, and inspect customer leads</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-[#151f32] border border-[#223250] hover:border-indigo-500 text-gray-300 font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition text-sm">
            {uploading ? (
              <Loader2 size={16} className="animate-spin text-indigo-400" />
            ) : (
              <Upload size={16} className="text-indigo-400" />
            )}
            <span>Bulk CSV Import</span>
            <input
              type="file"
              accept=".csv"
              disabled={uploading}
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 text-sm"
          >
            <Plus size={16} />
            {showAddForm ? "Close Form" : "Add Contact"}
          </button>
        </div>
      </div>

      {/* CSV Status Messages */}
      {uploadError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle size={18} />
          {uploadError}
        </div>
      )}
      {uploadSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <Check size={18} />
          {uploadSuccess}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Add New Contact Form */}
      {showAddForm && (
        <div className="glass-panel border border-[#1f2937] p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-semibold uppercase">First Name</label>
            <input
              type="text"
              required
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
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
              placeholder="+15551234"
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
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-gray-400 font-semibold uppercase">Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="Enterprise, High-Lead"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <label className="text-xs text-gray-400 font-semibold uppercase">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              onClick={handleAddContact}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Confirm Save Lead
            </button>
          </div>
        </div>
      )}

      {/* Leads listing table */}
      <div className="glass-panel border border-[#1f2937] rounded-2xl overflow-hidden">
        
        {/* Table search bar */}
        <div className="p-4 border-b border-[#1f2937] flex items-center justify-between bg-[#151f32]/20">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search leads name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151f32] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-300 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Loading / Table layout */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <span className="text-xs">Fetching leads from database...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            No contacts found. Use the forms to create one or import a CSV list.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f2937] text-xs text-gray-400 font-semibold uppercase bg-[#151f32]/10">
                  <th className="p-4">Contact Profile</th>
                  <th className="p-4">Phone Call URI</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937] text-sm text-gray-300">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-800/10 transition">
                    <td className="p-4">
                      <div className="font-bold text-gray-200">
                        {lead.first_name} {lead.last_name}
                      </div>
                      {lead.email && <div className="text-xs text-gray-500 mt-0.5">{lead.email}</div>}
                    </td>
                    <td className="p-4 font-mono text-xs text-indigo-400">{lead.phone_number}</td>
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
                    <td className="p-4 text-xs text-gray-400 max-w-xs truncate">{lead.notes || "—"}</td>
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
        )}
      </div>
    </div>
  );
}
