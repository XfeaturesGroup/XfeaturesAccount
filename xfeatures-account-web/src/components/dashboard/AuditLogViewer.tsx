import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

interface AuditLog {
    id: string;
    action: string;
    ip_address: string;
    created_at: number;
    details: string;
}

export const AuditLogViewer = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/api/user/audit-logs')
            .then(res => setLogs(res.data.logs))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const formatAction = (action: string) => {
        if (action.includes('login_success')) return t('audit_action_login');
        if (action.includes('login_failed')) return t('audit_action_login_failed');
        if (action.includes('2fa') || action.includes('profile')) return t('audit_action_profile');
        return action;
    };

    const getLocation = (detailsStr: string) => {
        try {
            const details = JSON.parse(detailsStr);
            return details.location || null;
        } catch {
            return null;
        }
    };

    return (
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass mt-6">
            <h3 className="text-lg font-medium text-white mb-1">{t('audit_title')}</h3>
            <p className="text-sm text-white/40 mb-8 font-mono">{t('audit_desc')}</p>

            {isLoading ? (
                <div className="text-sm text-white/30 animate-pulse pl-2 font-mono tracking-widest uppercase">{t('audit_loading')}</div>
            ) : (
                <div className="flex flex-col gap-0 border-l border-white/10 ml-2">
                    {logs.map((log) => {
                        const location = getLocation(log.details);
                        return (
                            <div key={log.id} className="relative pl-6 pb-6 last:pb-0 group">
                                {}
                                <div className="absolute left-[-4.5px] top-1.5 w-[8px] h-[8px] rounded-full bg-white/20 group-hover:bg-fluid-peach transition-all duration-300 outline outline-[4px] outline-black/50 group-hover:shadow-[0_0_10px_rgba(255,126,103,0.8)]"></div>

                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div>
                                        <span className="text-sm font-medium text-white/90 block group-hover:text-white transition-colors">{formatAction(log.action)}</span>
                                        <span className="text-[11px] font-mono text-white/40 mt-1.5 block tracking-wide">
                                            IP: {log.ip_address} {location ? `• ${location}` : ''}
                                        </span>
                                    </div>
                                    <span className="text-xs text-white/30 whitespace-nowrap font-mono group-hover:text-white/50 transition-colors">
                                        {new Date(log.created_at * 1000).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {logs.length === 0 && <span className="text-sm text-white/30 pl-4 font-mono">{t('audit_no_events')}</span>}
                </div>
            )}
        </div>
    );
};