import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../lib/i18n';

import { LiquidBackground } from '../components/ui/LiquidBackground';
import { GlassPanel } from '../components/ui/GlassPanel';

export const ForgotPassword = () => {
    const navigate = useNavigate();
    const addLog = useStore((state) => state.addLog);
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/api/auth/forgot-password', { email });
            setIsSent(true);
            addLog('success', 'Reset link dispatched.');
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Request failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen font-sans flex items-center justify-center p-4 overflow-hidden">
            <LiquidBackground />

            <div className="w-full max-w-[400px] relative z-10">
                <GlassPanel delay={0.2}>
                    <div className="text-center mb-8 relative z-10">
                        <img src="/logo.png" alt="Xfeatures" className="w-12 h-12 mx-auto mb-6 opacity-90 drop-shadow-2xl" />
                        <h2 className="text-xl font-semibold tracking-tight text-white">{t('auth_forgot_title')}</h2>
                        <p className="text-sm text-white/50 mt-2 font-mono">{t('auth_forgot_desc')}</p>
                    </div>

                    <div className="relative z-10">
                        {!isSent ? (
                            <form onSubmit={handleRequest} className="flex flex-col gap-5 animate-in fade-in duration-300">
                                <Input
                                    label={t('auth_email')} type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('auth_email_placeholder')} required disabled={isLoading}
                                />
                                <Button type="submit" disabled={isLoading} className="w-full justify-center mt-2">
                                    {isLoading ? t('auth_sending') : t('auth_forgot_btn')}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center p-6 bg-white/[0.02] rounded-xl border border-white/10 shadow-inner animate-in zoom-in duration-300">
                                <p className="text-sm text-white/80 font-medium">
                                    {t('auth_forgot_success', { email })}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
                        <button onClick={() => navigate('/login')} className="text-sm font-medium text-white/50 hover:text-fluid-peach transition-colors">
                            {t('auth_return_login')}
                        </button>
                    </div>
                </GlassPanel>
            </div>
        </div>
    );
};