import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { useTranslation } from '../../lib/i18n';

interface Integration {
    id: string;
    provider: string;
    provider_id: string;
    provider_username: string;
    is_active: number;
}

const SUPPORTED_PROVIDERS = [
    { id: 'github', name: 'GitHub', color: 'bg-[#24292F]', icon: 'G', isImplemented: true },
    { id: 'discord', name: 'Discord', color: 'bg-[#5865F2]', icon: 'D', isImplemented: true },
    { id: 'steam', name: 'Steam', color: 'bg-[#171A21]', icon: 'S', isImplemented: false },
    { id: 'spotify', name: 'Spotify', color: 'bg-[#1DB954]', icon: 'Sp', isImplemented: false },
    { id: 'youtube', name: 'YouTube', color: 'bg-[#FF0000]', icon: 'Y', isImplemented: false }
];

export const IntegrationsManager = () => {
    const { t } = useTranslation();
    const { addLog } = useStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const backendUrl = import.meta.env.VITE_API_URL || '';

    const fetchIntegrations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/user/integrations');
            setIntegrations(response.data.integrations);
        } catch {
            addLog('error', 'Failed to load integrations.');
        } finally {
            setIsLoading(false);
        }
    }, [addLog]);

    useEffect(() => {
        const oauthStatus = searchParams.get('oauth');
        const errorStatus = searchParams.get('error');

        if (oauthStatus === 'success') {
            addLog('success', 'Account connected successfully!');
            searchParams.delete('oauth');
            setSearchParams(searchParams);
        } else if (errorStatus) {
            const errorMsg = errorStatus === 'account_already_linked'
                ? 'This account is already linked to another user.'
                : 'Failed to connect account.';
            addLog('error', errorMsg);
            searchParams.delete('error');
            setSearchParams(searchParams);
        }

        fetchIntegrations();
    }, [fetchIntegrations, searchParams, setSearchParams, addLog]);

    const toggleStatus = async (id: string, currentStatus: number) => {
        try {
            await api.patch(`/api/user/integrations/${id}/toggle`, { is_active: !currentStatus });
            fetchIntegrations();
        } catch {
            addLog('error', 'Failed to update status.');
        }
    };

    const toggleAll = async (targetStatus: boolean) => {
        setIsLoading(true);
        try {
            await api.post('/api/user/integrations/toggle-all', { is_active: targetStatus });
            fetchIntegrations();
            addLog('success', targetStatus ? 'All integrations enabled.' : 'All integrations disabled.');
        } catch {
            addLog('error', 'Failed to toggle all.');
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/api/user/integrations/${id}`);
            addLog('info', 'Integration disconnected.');
            fetchIntegrations();
        } catch {
            addLog('error', 'Failed to disconnect account.');
        }
    };

    const startOAuthFlow = (providerId: string) => {
        window.location.href = `${backendUrl}/api/oauth/${providerId}`;
    };

    return (
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4 border-b border-white/5 pb-6">
                <div>
                    <h3 className="text-lg font-medium text-white mb-1">{t('int_title')}</h3>
                    <p className="text-sm text-white/40 font-mono">{t('int_desc')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {integrations.length > 0 && (
                        <>
                            <button onClick={() => toggleAll(true)} className="text-xs font-medium text-[#32D74B] hover:bg-[#32D74B]/10 px-4 py-2 rounded-lg border border-[#32D74B]/20 transition-all uppercase tracking-wide">
                                {t('int_enable_all')}
                            </button>
                            <button onClick={() => toggleAll(false)} className="text-xs font-medium text-fluid-pink hover:bg-fluid-pink/10 px-4 py-2 rounded-lg border border-fluid-pink/20 transition-all uppercase tracking-wide">
                                {t('int_disable_all')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-8 text-sm text-white/30 animate-pulse font-mono uppercase tracking-widest">
                    {t('int_loading')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {SUPPORTED_PROVIDERS.map((provider) => {
                        const connectedData = integrations.find(i => i.provider === provider.id);

                        return (
                            <div key={provider.id} className={`rounded-2xl p-5 flex flex-col gap-4 border transition-all duration-300 ${connectedData ? (connectedData.is_active ? 'bg-white/[0.05] border-white/20 shadow-edge-lit' : 'bg-black/20 border-white/5 opacity-70') : 'bg-black/20 border-white/5 hover:border-white/10 shadow-inner'}`}>

                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl ${provider.color} flex items-center justify-center font-bold text-white uppercase shadow-glass shrink-0 ${!connectedData && !provider.isImplemented ? 'opacity-30 grayscale' : ''}`}>
                                        {provider.icon}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-medium text-white/90">
                                            {provider.name}
                                            {!provider.isImplemented && !connectedData && <span className="ml-2 text-[10px] text-fluid-peach border border-fluid-peach/30 bg-fluid-peach/10 px-1.5 rounded uppercase tracking-wide">Soon</span>}
                                        </span>
                                        {connectedData ? (
                                            <span className="text-xs text-white/50 font-mono mt-0.5">@{connectedData.provider_username}</span>
                                        ) : (
                                            <span className="text-xs text-white/30 font-mono mt-0.5">Not connected</span>
                                        )}
                                    </div>

                                    {connectedData && (
                                        <div className="ml-auto">
                                            <button onClick={() => toggleStatus(connectedData.id, connectedData.is_active)} className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors uppercase tracking-wide ${connectedData.is_active ? 'bg-[#32D74B]/10 text-[#32D74B] border-[#32D74B]/30 hover:bg-[#32D74B]/20 shadow-[0_0_10px_rgba(50,215,75,0.1)]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>
                                                {connectedData.is_active ? t('int_active') : t('int_inactive')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 flex items-center gap-3">
                                    {connectedData ? (
                                        <Button variant="hold" holdTimeMs={1500} onHoldComplete={() => handleDelete(connectedData.id)} className="w-full justify-center !py-2.5 text-xs">
                                            {t('int_disconnect')}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            onClick={() => startOAuthFlow(provider.id)}
                                            disabled={!provider.isImplemented}
                                            className="w-full justify-center !py-2.5 text-xs"
                                        >
                                            {t('int_connect')} {provider.name}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};