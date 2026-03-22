import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../lib/i18n';

import { LiquidBackground } from '../components/ui/LiquidBackground';
import { GlassPanel } from '../components/ui/GlassPanel';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const addLog = useStore((state) => state.addLog);
    const { t } = useTranslation();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            addLog('error', 'No reset token provided in the URL.');
            return;
        }
        if (newPassword !== confirmPassword) {
            addLog('error', 'Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/api/auth/reset-password', { token, newPassword });
            addLog('success', 'Password reset successfully. You can now log in.');
            navigate('/login');
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Reset failed.');
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
                        <h2 className="text-xl font-semibold tracking-tight text-white">{t('auth_reset_title')}</h2>
                        <p className="text-sm text-white/50 mt-2 font-mono">{t('auth_reset_desc')}</p>
                    </div>

                    <form onSubmit={handleReset} className="flex flex-col gap-5 relative z-10">
                        <Input
                            label={t('security_pass_new')} type="password" value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)} required disabled={isLoading}
                            placeholder="••••••••••••••••"
                        />
                        <Input
                            label={t('security_pass_confirm')} type="password" value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading}
                            placeholder="••••••••••••••••"
                        />
                        <Button type="submit" disabled={isLoading} className="w-full justify-center mt-2">
                            {isLoading ? t('auth_resetting') : t('auth_reset_btn')}
                        </Button>
                    </form>
                </GlassPanel>
            </div>
        </div>
    );
};