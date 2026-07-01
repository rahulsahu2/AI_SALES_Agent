import { create } from "zustand";

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization_id?: number;
}

export interface TranscriptLine {
  role: "agent" | "customer" | "system";
  message: string;
  timestamp: string;
}

export interface CallState {
  id: number;
  direction: string;
  status: string;
  duration_seconds: number;
  recording_url?: string;
  transcripts: TranscriptLine[];
}

interface AppStore {
  token: string | null;
  user: UserProfile | null;
  activeCalls: Record<number, CallState>;
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  addCall: (call: CallState) => void;
  updateCallStatus: (callId: number, status: string) => void;
  addTranscriptLine: (callId: number, line: TranscriptLine) => void;
  clearActiveCalls: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  user: null,
  activeCalls: {},
  
  setToken: (token) => set(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
    return { token };
  }),
  
  setUser: (user) => set({ user }),
  
  addCall: (call) => set((state) => ({
    activeCalls: {
      ...state.activeCalls,
      [call.id]: call
    }
  })),
  
  updateCallStatus: (callId, status) => set((state) => {
    const call = state.activeCalls[callId];
    if (!call) return state;
    return {
      activeCalls: {
        ...state.activeCalls,
        [callId]: { ...call, status }
      }
    };
  }),
  
  addTranscriptLine: (callId, line) => set((state) => {
    const call = state.activeCalls[callId];
    if (!call) return state;
    return {
      activeCalls: {
        ...state.activeCalls,
        [callId]: {
          ...call,
          transcripts: [...call.transcripts, line]
        }
      }
    };
  }),
  
  clearActiveCalls: () => set({ activeCalls: {} })
}));

export const getApiUrl = () => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
};
