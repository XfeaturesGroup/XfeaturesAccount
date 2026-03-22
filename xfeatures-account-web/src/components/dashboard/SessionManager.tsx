import { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { useTranslation } from '../../lib/i18n';

interface Session {
    id: string;
    full_id: string;
    ip_address: string;
    user_agent: string;
    created_at: number;
    location?: string;
    is_current: boolean;
}

export const SessionManager = () => {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addLog } = useStore();

    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/user/sessions');
            setSessions(response.data.sessions);
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                addLog('error', error.response?.data?.error || 'Failed to load sessions.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [addLog]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleRevoke = async (sessionId: string) => {
        try {
            await api.post('/api/user/sessions/revoke', { sessionId });
            addLog('success', `Device signed out successfully.`);
            fetchSessions();
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                addLog('error', error.response?.data?.error || 'Failed to sign out device.');
            }
        }
    };

    const getDeviceType = (ua: string) => {
        if (ua.includes('Android') || ua.includes('iPhone') || ua.includes('iPad')) return 'Mobile Device';
        if (ua.includes('Windows')) return 'Windows PC';
        if (ua.includes('Mac OS')) return 'Mac Computer';
        if (ua.includes('Linux')) return 'Linux Node';
        return 'Unknown Device';
    };

    return (
        <div className="flex flex-col gap-4">

            <div className="focus-card relative z-10 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-medium text-white mb-1">{t('sessions_title')}</h3>
                    <p className="text-sm text-white/40 font-mono">{t('sessions_desc')}</p>
                </div>
                <button onClick={fetchSessions} disabled={isLoading} className="text-sm font-medium text-white/40 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all w-fit shrink-0">
                    {t('sessions_refresh')}
                </button>
            </div>

            {isLoading && sessions.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-sm text-white/30 animate-pulse uppercase tracking-widest font-mono">
                    {t('sessions_loading')}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {sessions.map((session) => {
                        const isCurrent = session.is_current;

                        return (
                            <div
                                key={session.full_id}
                                className={`focus-card relative z-10 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-500 border ${
                                    isCurrent
                                        ? 'bg-white/[0.05] border-white/20 shadow-edge-lit'
                                        : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30 shadow-inner'
                                }`}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-base font-medium text-white/90">
                                            {getDeviceType(session.user_agent)}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[10px] font-bold bg-fluid-peach/10 text-fluid-peach px-2.5 py-0.5 rounded-md border border-fluid-peach/30 uppercase tracking-widest shadow-[0_0_10px_rgba(255,126,103,0.1)]">
                                                {t('sessions_this_device')}
                                            </span>
                                        )}
                                    </div>

                                    {!isCurrent && (
                                        <div className="shrink-0">
                                            <Button variant="hold" holdTimeMs={1500} onHoldComplete={() => handleRevoke(session.full_id)} className="!py-2 !px-4 text-xs">
                                                {t('sessions_sign_out')}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm mt-1">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-xs tracking-widest uppercase font-semibold text-white/30">{t('sessions_ip')}</span>
                                        <span className="text-sm font-mono text-white/80 break-all">{session.ip_address}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-xs tracking-widest uppercase font-semibold text-white/30">{t('sessions_location')}</span>
                                        <span className="text-sm text-white/80 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                            <span className="truncate">{session.location || t('sessions_unknown_loc')}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-xs tracking-widest uppercase font-semibold text-white/30">{t('sessions_signed_in')}</span>
                                        <span className="text-sm text-white/80 font-mono">
                                            {new Date(session.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-[11px] text-white/30 bg-black/40 p-3 rounded-xl border border-white/5 break-all mt-2 shadow-inner font-mono">
                                    {session.user_agent}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};