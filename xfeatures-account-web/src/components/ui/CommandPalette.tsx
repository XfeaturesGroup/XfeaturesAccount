import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';
import { cn } from '../../lib/utils';

type TabType = 'profile' | 'security' | 'sessions' | 'integrations';

interface CommandPaletteProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    // eslint-disable-next-line no-unused-vars
    setActiveTab: (tab: TabType) => void;
}

export const CommandPalette = ({ isOpen, setIsOpen, setActiveTab }: CommandPaletteProps) => {
    const { t } = useTranslation();
    const { user, setUser, addLog } = useStore();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

            const isCmdK = (e.metaKey || e.ctrlKey) && e.code === 'KeyK';
            const isSlash = e.code === 'Slash' || e.key === '/';

            if (isCmdK || (isSlash && !isInputFocused)) {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen((prev) => !prev);
            }
            if (e.code === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [setIsOpen]);

    useEffect(() => {
        if (isOpen) {
            if (search !== '' || activeIndex !== 0 || document.activeElement !== inputRef.current) {
                const id = window.setTimeout(() => {
                    setSearch('');
                    setActiveIndex(0);
                    inputRef.current?.focus();
                }, 50);

                return () => clearTimeout(id);
            }
        }
    }, [isOpen, search, activeIndex]);

    const handleLogout = async () => {
        setIsOpen(false);
        try {
            await api.post('/api/auth/logout');
            setUser(null);
            addLog('info', 'Signed out successfully.');
            navigate('/login');
        } catch {
            addLog('error', 'Logout failed.');
        }
    };

    const allCommands = [
        { id: 'nav-profile', label: 'Go to Profile', section: 'Navigation', icon: '👤', action: () => setActiveTab('profile') },
        { id: 'nav-security', label: 'Go to Security', section: 'Navigation', icon: '🔒', action: () => setActiveTab('security') },
        { id: 'nav-sessions', label: 'Go to Sessions', section: 'Navigation', icon: '💻', action: () => setActiveTab('sessions') },
        { id: 'nav-integrations', label: 'Go to Integrations', section: 'Navigation', icon: '🔗', action: () => setActiveTab('integrations') },
        { id: 'action-copy-id', label: 'Copy User Email', section: 'Actions', icon: '📋', action: async () => {
                await navigator.clipboard.writeText(user?.email || '');
                addLog('info', 'Email copied to clipboard');
            }},
        { id: 'action-logout', label: 'Sign Out', section: 'Danger', icon: '🚪', action: handleLogout, isDanger: true },
    ];

    const filteredCommands = search
        ? allCommands.filter(cmd => cmd.label.toLowerCase().includes(search.toLowerCase()) || cmd.section.toLowerCase().includes(search.toLowerCase()))
        : allCommands;

    useEffect(() => {
        const handleNavigation = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[activeIndex]) {
                    filteredCommands[activeIndex].action();
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleNavigation);
        return () => window.removeEventListener('keydown', handleNavigation);
    }, [isOpen, filteredCommands, activeIndex, setIsOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-xl"
                        onClick={() => setIsOpen(false)}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-2xl bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col"
                    >
                        <div className="relative flex items-center px-4 border-b border-white/10 bg-white/[0.02]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setActiveIndex(0);
                                }}
                                placeholder="Type a command or search..."
                                className="w-full bg-transparent border-none text-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-0 px-4 py-5 h-16"
                            />
                            <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                <span>ESC</span>
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                            {filteredCommands.length === 0 ? (
                                <div className="py-12 text-center text-white/40 text-sm font-mono tracking-wide">
                                    No commands found.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {filteredCommands.map((cmd, idx) => {
                                        const showSection = idx === 0 || filteredCommands[idx - 1].section !== cmd.section;
                                        return (
                                            <div key={cmd.id}>
                                                {showSection && (
                                                    <div className="px-3 py-2 mt-2 text-[10px] font-semibold tracking-widest uppercase text-white/30">
                                                        {cmd.section}
                                                    </div>
                                                )}
                                                <button
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    onClick={() => { cmd.action(); setIsOpen(false); }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 text-sm text-left",
                                                        activeIndex === idx
                                                            ? cmd.isDanger
                                                                ? "bg-fluid-pink/10 text-fluid-pink shadow-[inset_0_0_0_1px_rgba(255,51,102,0.3)]"
                                                                : "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                                                            : "text-white/60 hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-base">{cmd.icon}</span>
                                                        <span className="font-medium">{cmd.label}</span>
                                                    </div>
                                                    {activeIndex === idx && (
                                                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-50">
                                                            {t('save')}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};