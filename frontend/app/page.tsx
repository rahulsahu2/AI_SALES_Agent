"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, getApiUrl } from "../lib/store";
import Navbar from "../components/Navbar";
import Dashboard from "../components/Dashboard";
import AgentBuilder from "../components/AgentBuilder";
import Contacts from "../components/Contacts";
import Campaigns from "../components/Campaigns";
import KnowledgeBase from "../components/KnowledgeBase";
import DeveloperConsole from "../components/DeveloperConsole";
import Analytics from "../components/Analytics";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function Home() {
  const { token, setToken, setUser } = useAppStore();
  const [currentTab, setTab] = useState("dashboard");
  const [email, setEmail] = useState("admin@voiceflow.ai");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const apiUrl = getApiUrl();
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const loginRes = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      if (!loginRes.ok) {
        const errorJson = await loginRes.json().catch(() => ({}));
        throw new Error(errorJson.detail || "Incorrect email or password");
      }

      const { access_token } = await loginRes.json();
      
      const userRes = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: {
          "Authorization": `Bearer ${access_token}`
        }
      });

      if (!userRes.ok) {
        throw new Error("Failed to load user profile");
      }

      const userProfile = await userRes.json();
      
      setToken(access_token);
      setUser(userProfile);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auth Guard
  if (!token) {
    return (
      <main className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#151f32] border border-[#223250] p-8 rounded-3xl space-y-6 shadow-2xl relative">
          
          {/* Logo Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">
              VoiceFlow AI
            </h1>
            <p className="text-gray-400 text-sm">Enter your tenant administrator credentials</p>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-gray-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#223250] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition"
                  placeholder="admin@voiceflow.ai"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-gray-500" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#223250] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Sign In Session"
              )}
            </button>
          </form>

          {/* Seed credentials hint */}
          <div className="bg-[#0b0f19]/60 p-4 rounded-2xl border border-[#223250]/40 text-center space-y-1.5">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bootstrap Credentials</div>
            <div className="text-xs text-gray-300 font-medium">Username: <span className="text-indigo-400 font-mono">admin@voiceflow.ai</span></div>
            <div className="text-xs text-gray-300 font-medium">Password: <span className="text-indigo-400 font-mono">Admin123!</span></div>
          </div>
        </div>
      </main>
    );
  }

  // Dashboard Tab Switching Router
  const renderTab = () => {
    switch (currentTab) {
      case "dashboard":
        return <Dashboard />;
      case "agents":
        return <AgentBuilder />;
      case "campaigns":
        return <Campaigns />;
      case "contacts":
        return <Contacts />;
      case "knowledge":
        return <KnowledgeBase />;
      case "api-keys":
        return <DeveloperConsole />;
      case "analytics":
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#0b0f19]">
      <Navbar currentTab={currentTab} setTab={setTab} />
      {renderTab()}
    </main>
  );
}
