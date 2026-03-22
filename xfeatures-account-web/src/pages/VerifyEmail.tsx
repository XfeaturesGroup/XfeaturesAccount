import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../lib/i18n';

import { LiquidBackground } from '../components/ui/LiquidBackground';
import { GlassPanel } from '../components/ui/GlassPanel';

export const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setMessage('No verification token provided in the URL.');
                return;
            }

            try {
                const response = await api.post('/api/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully. Your account is now secured.');
            } catch (error: unknown) {
                setStatus('error');
                if (isAxiosError(error)) {
                    setMessage(error.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
                } else {
                    setMessage('An unknown error occurred during verification.');
                }
            }
        };

        void verifyToken();
    }, [token]);

    return (
        <div className="relative min-h-screen font-sans flex items-center justify-center p-4 overflow-hidden">
            <LiquidBackground />

            <div className="w-full max-w-[400px] relative z-10">
                <GlassPanel delay={0.2}>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="mb-8 flex justify-center h-16 items-center">
                            {status === 'loading' && (
                                <div className="w-10 h-10 rounded-full border-[3px] border-white/10 border-t-fluid-peach animate-spin shadow-edge-lit"></div>
                            )}

                            {status === 'success' && (
                                <div className="w-12 h-12 rounded-full bg-fluid-peach/10 border border-fluid-peach/30 flex items-center justify-center text-fluid-peach shadow-[0_0_20px_rgba(255,126,103,0.3)] animate-in zoom-in duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="w-12 h-12 rounded-full bg-fluid-pink/10 border border-fluid-pink/30 flex items-center justify-center text-fluid-pink shadow-[0_0_20px_rgba(255,51,102,0.3)] animate-in zoom-in duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </div>
                            )}
                        </div>

                        <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
                            {status === 'loading' ? t('verify_title_loading') :
                                status === 'success' ? t('verify_title_success') : t('verify_title_error')}
                        </h2>

                        <p className="text-white/50 text-sm leading-relaxed mb-8 font-mono">
                            {message || t('loading')}
                        </p>

                        <Button
                            onClick={() => navigate('/dashboard')}
                            className="w-full justify-center"
                            variant={status === 'error' ? 'outline' : 'primary'}
                        >
                            {status === 'loading' ? t('verify_btn_return') :
                                status === 'success' ? t('verify_btn_continue') : t('verify_btn_back')}
                        </Button>
                    </div>

                </GlassPanel>
            </div>
        </div>
    );
};