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

export const Login = () => {
    const navigate = useNavigate();
    const setUser = useStore((state) => state.setUser);
    const addLog = useStore((state) => state.addLog);
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [requires2FA, setRequires2FA] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/api/auth/login', { email, password, totpCode });

            const meResponse = await api.get('/api/user/me');
            setUser(meResponse.data.user);

            addLog('success', 'Authentication successful.');
            navigate('/dashboard');
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                if (error.response?.status === 403 && error.response.data?.require2FA) {
                    setRequires2FA(true);
                    addLog('info', 'Two-Factor Authentication required.');
                } else {
                    addLog('error', error.response?.data?.error || 'Authentication failed.');
                    setTotpCode('');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen font-sans flex items-center justify-center p-4 overflow-hidden">

            {}
            <LiquidBackground />

            {}
            <div className="w-full max-w-[400px] relative z-10">
                <GlassPanel delay={0.2}>
                    <div className="text-center mb-8 relative z-10">
                        <img src="/logo.png" alt="Xfeatures" className="w-12 h-12 mx-auto mb-6 opacity-90 drop-shadow-2xl" />
                        <h2 className="text-2xl font-semibold tracking-tight text-white">
                            {requires2FA ? t('auth_2fa_title') : t('auth_login_title')}
                        </h2>
                        <p className="text-sm text-white/50 mt-2 font-mono tracking-wide">
                            {requires2FA ? t('auth_2fa_desc') : t('auth_login_desc')}
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-5 relative z-10">
                        {!requires2FA ? (
                            <div className="flex flex-col gap-5 animate-in slide-in-from-left-4 fade-in duration-300">
                                <Input
                                    label={t('auth_email')}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('auth_email_placeholder')}
                                    required
                                    disabled={isLoading}
                                    autoComplete="username"
                                />

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        {}
                                        <label className="text-sm font-medium text-white/70">{t('auth_password')}</label>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/forgot-password')}
                                            className="text-xs font-medium text-white/40 hover:text-fluid-peach transition-colors"
                                        >
                                            {t('auth_forgot')}
                                        </button>
                                    </div>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        required
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                    />
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full justify-center mt-2">
                                    {isLoading ? t('auth_authenticating') : t('auth_continue')}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 fade-in duration-300">
                                <Input
                                    label={t('auth_2fa_code')}
                                    type="text"
                                    value={totpCode}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
                                        setTotpCode(val);
                                    }}
                                    placeholder="000000"
                                    className="text-center tracking-[0.5em] font-mono text-lg text-fluid-peach"
                                    required
                                    disabled={isLoading}
                                    autoFocus
                                    autoComplete="one-time-code"
                                />

                                <div className="flex flex-col gap-3 mt-2">
                                    <Button type="submit" disabled={isLoading || (totpCode.length !== 6 && totpCode.length !== 8)} className="w-full justify-center">
                                        {isLoading ? t('security_2fa_verifying') : t('auth_2fa_verify')}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRequires2FA(false);
                                            setTotpCode('');
                                            setPassword('');
                                        }}
                                        disabled={isLoading}
                                        className="text-sm text-white/40 hover:text-white transition-colors py-2"
                                    >
                                        {t('auth_2fa_cancel')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    {!requires2FA && (
                        <div className="mt-8 pt-6 border-t border-white/10 text-center relative z-10 animate-in fade-in">
                            <p className="text-sm text-white/50">
                                {t('auth_no_account')}{' '}
                                <button
                                    onClick={() => navigate('/register')}
                                    className="font-medium text-white hover:text-fluid-peach transition-colors"
                                >
                                    {t('auth_sign_up')}
                                </button>
                            </p>
                        </div>
                    )}
                </GlassPanel>
            </div>
        </div>
    );
};