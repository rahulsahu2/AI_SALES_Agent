import React from "react";
import { 
  PhoneCall, 
  Users, 
  Sliders, 
  BookOpen, 
  BarChart3, 
  Key, 
  Settings, 
  LogOut, 
  Activity 
} from "lucide-react";
import { useAppStore } from "../lib/store";

interface NavbarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export default function Navbar({ currentTab, setTab }: NavbarProps) {
  const { user, setToken, setUser } = useAppStore();

  const menuItems = [
    { id: "dashboard", label: "Realtime Monitor", icon: Activity },
    { id: "agents", label: "Agent Builder", icon: Sliders },
    { id: "campaigns", label: "Calling Campaigns", icon: PhoneCall },
    { id: "contacts", label: "Contacts Registry", icon: Users },
    { id: "knowledge", label: "Knowledge RAG", icon: BookOpen },
    { id: "api-keys", label: "Developer Keys", icon: Key },
    { id: "analytics", label: "Analytics Panel", icon: BarChart3 }
  ];

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <aside className="w-64 h-screen bg-[#111827] border-r border-[#1f2937] flex flex-col justify-between p-4 shrink-0">
      <div>
        {/* Brand header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <PhoneCall size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wider bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">
              VOICEFLOW AI
            </h1>
            <span className="text-xs text-gray-500 font-medium tracking-widest uppercase">Multi-Tenant SFU</span>
          </div>
        </div>

        {/* Menu link listings */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User block details */}
      <div className="border-t border-[#1f2937] pt-4 space-y-4">
        {user && (
          <div className="px-2">
            <div className="font-semibold text-sm text-gray-200">{user.full_name}</div>
            <div className="text-xs text-indigo-400/80 mt-0.5 tracking-wide">{user.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
