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

export const Register = () => {
    const navigate = useNavigate();
    const addLog = useStore((state) => state.addLog);
    const { t } = useTranslation();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/api/auth/register', { username, email, password });
            addLog('success', 'Identity created. You can now log in.');
            navigate('/login');
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                addLog('error', error.response?.data?.error || 'Registration failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen font-sans flex items-center justify-center p-4 overflow-hidden">

            <LiquidBackground />

            <div className="w-full max-w-[900px] relative z-10">
                <GlassPanel delay={0.2}>
                    
                    <div className="flex flex-col md:flex-row gap-12 md:gap-0">
                        
                        <div className="w-full md:w-1/2 flex flex-col justify-center relative md:pr-12">
                            <div className="relative z-10">
                                
                                <img src="/logo.png" alt="Xfeatures" className="w-12 h-12 mb-8 opacity-90 drop-shadow-2xl" />

                                <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">
                                    {t('auth_marketing_title')}
                                </h2>
                                <p className="text-sm text-white/50 leading-relaxed mb-10 font-mono tracking-wide">
                                    {t('auth_marketing_desc')}
                                </p>

                                
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-center gap-4 text-sm text-white/60">
                                        <span><strong className="text-white font-medium">{t('auth_marketing_intel')}</strong> AI, API, Tools</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-white/60">
                                        <span><strong className="text-white font-medium">{t('auth_marketing_infra')}</strong> Hosting, CDN, LIR</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-white/60">
                                        <span><strong className="text-white font-medium">{t('auth_marketing_sec')}</strong> Guard, Zero Trust, Networking</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full md:w-1/2 flex flex-col justify-center md:pl-12 border-t md:border-t-0 md:border-l border-white/5 pt-8 md:pt-0">
                            <div className="text-left mb-8">
                                <h2 className="text-xl font-semibold tracking-tight text-white">{t('auth_reg_title')}</h2>
                                <p className="text-sm text-white/40 mt-2 font-mono">{t('auth_reg_desc')}</p>
                            </div>

                            <form onSubmit={handleRegister} className="flex flex-col gap-5">
                                <Input
                                    label={t('auth_reg_username')}
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="xfeatures_user"
                                    required
                                    disabled={isLoading}
                                />

                                <Input
                                    label={t('auth_email')}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('auth_email_placeholder')}
                                    required
                                    disabled={isLoading}
                                />

                                <Input
                                    label={t('auth_password')}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••••••"
                                    required
                                    disabled={isLoading}
                                />

                                <Button type="submit" disabled={isLoading} className="w-full justify-center mt-4">
                                    {isLoading ? t('auth_creating') : t('auth_reg_btn')}
                                </Button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-white/5 text-left">
                                <p className="text-sm text-white/50">
                                    {t('auth_has_account')}{' '}
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="font-medium text-white hover:text-fluid-peach transition-colors"
                                    >
                                        {t('auth_log_in')}
                                    </button>
                                </p>
                            </div>
                        </div>

                    </div>
                </GlassPanel>
            </div>
        </div>
    );
};