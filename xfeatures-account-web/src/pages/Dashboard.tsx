import { useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { ProfileForm } from '../components/dashboard/ProfileForm';
import { SecurityForm } from '../components/dashboard/SecurityForm';
import { SessionManager } from '../components/dashboard/SessionManager';
import { AuditLogViewer } from '../components/dashboard/AuditLogViewer';
import { IntegrationsManager } from '../components/dashboard/IntegrationsManager';
import { CommandPalette } from '../components/ui/CommandPalette';
import { useTranslation } from '../lib/i18n';
import { LiquidBackground } from '../components/ui/LiquidBackground';

const TABS = ['profile', 'security', 'sessions', 'integrations'] as const;
type TabType = typeof TABS[number];

export const Dashboard = () => {
    const { user, setUser, addLog } = useStore();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isCmdOpen, setIsCmdOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout');
            setUser(null);
            addLog('info', 'Signed out successfully.');
        } catch {
            addLog('error', 'Logout failed.');
        }
    };

    const backendUrl = import.meta.env.VITE_API_URL || '';

    return (
        <div
            className="relative h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden transition-[padding] duration-300 box-border"
            style={{ paddingBottom: 'var(--buffer-height, 0px)' }}
        >
            <LiquidBackground />

            {}
            <CommandPalette isOpen={isCmdOpen} setIsOpen={setIsCmdOpen} setActiveTab={setActiveTab} />

            <div className="absolute inset-0 z-10 flex flex-col md:flex-row pointer-events-none">

                <aside className="glass-dimmable w-full md:w-64 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col justify-between shrink-0 z-20 pointer-events-auto shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                    <div>
                        <div className="h-16 flex items-center px-6 border-b border-white/5 bg-white/[0.02]">
                            <img src="/logo.png" alt="Xfeatures Logo" className="w-6 h-6 mr-3 opacity-90 drop-shadow-md" />
                            <span className="font-semibold text-base tracking-tight text-white">{t('app_name')}</span>
                        </div>

                        <nav className="p-4 flex flex-col gap-2">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-300 ${
                                        activeTab === tab
                                            ? 'bg-white/[0.05] text-white font-medium border border-white/10 shadow-edge-lit'
                                            : 'text-white/50 hover:text-white hover:bg-white/[0.02] border border-transparent'
                                    }`}
                                >
                                    {t(`tab_${tab}`)}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-4 border-t border-white/5 bg-white/[0.02] pb-[calc(1rem+var(--buffer-height,0px))] transition-[padding] duration-300">
                        <div className="flex items-center gap-3 px-2 mb-4">
                            {user?.avatar_url ? (
                                <img
                                    src={`${backendUrl}${user.avatar_url}`}
                                    alt="Avatar"
                                    className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0 shadow-glass"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-glass">
                                    <span className="text-sm font-medium text-white/70">
                                        {user?.username?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-col overflow-hidden">
                                <p className="text-sm font-medium text-white/90 truncate">{user?.username}</p>
                                <p className="text-xs text-white/40 truncate font-mono">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2.5 text-sm text-white/50 hover:text-white hover:bg-black/20 border border-transparent hover:border-white/10 hover:shadow-edge-lit rounded-xl transition-all duration-300"
                        >
                            {t('sign_out')}
                        </button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col relative h-full overflow-hidden pointer-events-auto">

                    <header className="glass-dimmable h-auto min-h-16 py-3 sm:py-0 border-b border-white/5 bg-black/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between px-8 shrink-0 gap-3 z-10 shadow-sm">

                        <div className="flex items-center flex-wrap justify-start sm:justify-end gap-3">
                            {}
                            <button
                                onClick={() => setIsCmdOpen(true)}
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-white/50 hover:text-white transition-all group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <span>Search</span>
                                <kbd className="ml-2 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono tracking-widest text-white/40 group-hover:text-white/70">CTRL+K</kbd>
                            </button>

                            <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>

                            {!user?.email_verified && (
                                <span className="text-fluid-peach bg-fluid-peach/10 px-3 py-1 rounded-md text-[11px] font-medium border border-fluid-peach/20 uppercase tracking-wide">
                                    {t('status_email_unverified')}
                                </span>
                            )}

                            {user?.is_2fa_enabled ? (
                                <span className="text-[#32D74B] bg-[#32D74B]/10 px-3 py-1 rounded-md text-[11px] font-medium border border-[#32D74B]/20 uppercase tracking-wide">
                                    {t('status_2fa_active')}
                                </span>
                            ) : (
                                <span className="text-fluid-pink bg-fluid-pink/10 px-3 py-1 rounded-md text-[11px] font-medium border border-fluid-pink/20 uppercase tracking-wide shadow-[0_0_10px_rgba(255,51,102,0.2)]">
                                    {t('status_2fa_inactive')}
                                </span>
                            )}

                            {user?.anti_phishing_code ? (
                                <span className="text-[#32D74B] bg-[#32D74B]/10 px-3 py-1 rounded-md text-[11px] font-medium border border-[#32D74B]/20 uppercase tracking-wide">
                                    {t('status_phish_active')}
                                </span>
                            ) : (
                                <span className="text-white/40 bg-white/5 px-3 py-1 rounded-md text-[11px] font-medium border border-white/10 uppercase tracking-wide">
                                    {t('status_phish_inactive')}
                                </span>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 relative z-0 custom-scrollbar">
                        <div className="max-w-4xl mx-auto pb-8">
                            {activeTab === 'profile' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="glass-dimmable text-2xl font-semibold tracking-tight text-white mb-8">{t('tab_profile')}</h2>
                                    <ProfileForm />
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="glass-dimmable text-2xl font-semibold tracking-tight text-white mb-8">{t('tab_security')}</h2>
                                    <SecurityForm />
                                    <div className="mt-8">
                                        <AuditLogViewer />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'sessions' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="glass-dimmable text-2xl font-semibold tracking-tight text-white mb-8">{t('tab_sessions')}</h2>
                                    <SessionManager />
                                </div>
                            )}

                            {activeTab === 'integrations' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="glass-dimmable text-2xl font-semibold tracking-tight text-white mb-8">{t('tab_integrations')}</h2>
                                    <IntegrationsManager />
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};