import { create } from 'zustand';

interface User {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    email_verified: number;
    avatar_url?: string;
    anti_phishing_code?: string;
    is_2fa_enabled?: boolean;
    language?: string;
}

interface SystemLog {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface AppState {
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    logs: SystemLog[];

    setUser: (user: User | null) => void;
    addLog: (type: SystemLog['type'], message: string) => void;
    clearLogs: () => void;
}

export const useStore = create<AppState>((set) => ({
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    logs: [],

    setUser: (user) => set({ user, isAuthenticated: !!user, isInitializing: false }),

    addLog: (type, message) => set((state) => {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

        const newLog = { id: crypto.randomUUID(), timestamp: timeString, type, message };
        return { logs: [newLog, ...state.logs].slice(0, 50) };
    }),

    clearLogs: () => set({ logs: [] })
}));