import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../../lib/i18n';

export const SecurityForm = () => {
    const navigate = useNavigate();
    const { user, setUser, addLog } = useStore();
    const { t } = useTranslation();

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [is2faModalOpen, setIs2faModalOpen] = useState(false);
    const [twoFaMode, setTwoFaMode] = useState<'setup' | 'backup' | 'disable'>('setup');
    const [qrUri, setQrUri] = useState<string | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [totpCode, setTotpCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteTotpCode, setDeleteTotpCode] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const PASSWORD_REGEX = /^(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d).{8,}$/;

    const closePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleRotateKey = async () => {
        if (newPassword !== confirmPassword) {
            addLog('error', 'New passwords do not match.');
            return;
        }

        if (!PASSWORD_REGEX.test(newPassword)) {
            addLog('warning', 'Password does not meet security requirements.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/api/user/change-password', { currentPassword, newPassword });
            addLog('success', 'Password updated successfully.');
            closePasswordModal();
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Failed to update password.');
        } finally {
            setIsLoading(false);
        }
    };

    const close2faModal = () => {
        setIs2faModalOpen(false);
        setQrUri(null);
        setTotpCode('');
        setDisablePassword('');
    };

    const start2faSetup = async () => {
        setIsLoading(true);
        try {
            const response = await api.post('/api/user/2fa/generate');
            setQrUri(response.data.uri);
            setBackupCodes(response.data.backupCodes);
            setTwoFaMode('setup');
            setIs2faModalOpen(true);
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Failed to generate QR code.');
        } finally {
            setIsLoading(false);
        }
    };

    const confirm2faSetup = async () => {
        setIsLoading(true);
        try {
            await api.post('/api/user/2fa/enable', { code: totpCode });
            const meResponse = await api.get('/api/user/me');
            setUser(meResponse.data.user);
            addLog('success', 'Two-Factor Authentication is now enabled!');
            setTwoFaMode('backup');
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Invalid code.');
        } finally {
            setIsLoading(false);
        }
    };

    const disable2fa = async () => {
        setIsLoading(true);
        try {
            await api.post('/api/user/2fa/disable', { password: disablePassword, code: totpCode });
            const meResponse = await api.get('/api/user/me');
            setUser(meResponse.data.user);
            addLog('success', 'Two-Factor Authentication has been disabled.');
            close2faModal();
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletePassword('');
        setDeleteTotpCode('');
    };

    const handleDeleteAccount = async () => {
        setIsLoading(true);
        try {
            await api.delete('/api/user/account', {
                data: { password: deletePassword, code: deleteTotpCode }
            });

            addLog('success', 'Your account has been permanently deleted.');
            setUser(null);
            closeDeleteModal();
            navigate('/login');
        } catch (error: unknown) {
            if (isAxiosError(error)) addLog('error', error.response?.data?.error || 'Failed to delete account.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-col gap-6">

                <div className="focus-card relative z-10 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass hover:bg-white/[0.03]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-2">{t('security_2fa_title')}</h3>
                            <p className="text-sm text-white/40 font-mono">{t('security_2fa_desc')}</p>
                        </div>
                        {user?.is_2fa_enabled ? (
                            <span className="text-[#32D74B] bg-[#32D74B]/10 px-3 py-1 rounded-md text-xs font-medium border border-[#32D74B]/20 tracking-wide uppercase">
                                {t('security_2fa_enabled')}
                            </span>
                        ) : (
                            <span className="text-fluid-peach bg-fluid-peach/10 px-3 py-1 rounded-md text-xs font-medium border border-fluid-peach/20 tracking-wide uppercase shadow-[0_0_10px_rgba(255,126,103,0.1)]">
                                {t('security_2fa_disabled')}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-t border-white/5 gap-4 mt-2">
                        <div className="flex flex-col gap-1.5 max-w-md">
                            <span className="text-sm font-medium text-white/90">{t('security_2fa_app')}</span>
                            <span className="text-sm text-white/40">{t('security_2fa_app_desc')}</span>
                        </div>
                        {user?.is_2fa_enabled ? (
                            <button onClick={() => { setTwoFaMode('disable'); setIs2faModalOpen(true); }} className="text-sm font-medium text-fluid-pink hover:text-white px-4 py-2 rounded-lg hover:bg-fluid-pink/10 transition-all border border-transparent hover:border-fluid-pink/30 hover:shadow-[0_0_15px_rgba(255,51,102,0.2)] shrink-0">
                                {t('security_2fa_disable_btn')}
                            </button>
                        ) : (
                            <Button onClick={start2faSetup} disabled={isLoading} className="shrink-0">{t('security_2fa_enable_btn')}</Button>
                        )}
                    </div>
                </div>

                <div className="focus-card relative z-10 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass hover:bg-white/[0.03]">
                    <h3 className="text-lg font-medium text-white mb-2">{t('security_pass_title')}</h3>
                    <p className="text-sm text-white/40 mb-6 font-mono">{t('security_pass_desc')}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-t border-white/5 gap-4 mt-2 group">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs tracking-widest uppercase font-semibold text-white/40">{t('security_pass_current')}</span>
                            <span className="text-sm font-mono text-white/60 mt-1">••••••••••••••••</span>
                        </div>
                        <button onClick={() => setIsPasswordModalOpen(true)} className="text-sm font-medium text-white/40 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all w-fit opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                            {t('security_pass_btn')}
                        </button>
                    </div>
                </div>

                <div className="focus-card relative z-10 bg-fluid-pink/5 backdrop-blur-md border border-fluid-pink/20 rounded-2xl p-6 overflow-hidden shadow-[0_0_30px_rgba(255,51,102,0.05)] group/card hover:bg-fluid-pink/10">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-fluid-pink to-transparent opacity-50 group-hover/card:opacity-100 transition-opacity"></div>
                    <h3 className="text-lg font-medium text-fluid-pink mb-2 drop-shadow-[0_0_8px_rgba(255,51,102,0.5)]">{t('security_danger_zone')}</h3>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4 mt-2">
                        <div className="flex flex-col gap-1 max-w-md">
                            <span className="text-sm font-medium text-white/90">{t('security_delete_title')}</span>
                            <span className="text-sm text-white/50">{t('security_delete_desc')}</span>
                        </div>
                        <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="shrink-0">
                            {t('security_delete_btn')}
                        </Button>
                    </div>
                </div>

            </div>

            {}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-black/80 backdrop-blur-3xl border border-fluid-pink/30 rounded-2xl shadow-[0_0_50px_rgba(255,51,102,0.15)] overflow-hidden flex flex-col animate-in zoom-in-[0.98] duration-300">

                        <div className="border-b border-fluid-pink/20 p-5 flex justify-between items-center bg-fluid-pink/5">
                            <h3 className="text-base font-medium text-fluid-pink drop-shadow-[0_0_5px_rgba(255,51,102,0.5)]">{t('security_delete_modal_title')}</h3>
                            <button onClick={closeDeleteModal} className="text-white/40 hover:text-fluid-pink transition-colors p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="p-6 flex flex-col gap-5">
                            <div className="bg-fluid-pink/10 border border-fluid-pink/20 rounded-xl p-4 text-sm text-fluid-pink/90">
                                {t('security_delete_modal_desc')}
                            </div>

                            <Input label={t('profile_current_password')} type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} disabled={isLoading} />

                            {user?.is_2fa_enabled && (
                                <Input label={t('auth_2fa_code')} type="text" value={deleteTotpCode} onChange={(e) => setDeleteTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="tracking-[0.5em] font-mono text-fluid-pink" disabled={isLoading} />
                            )}

                            <Button variant="danger" holdTimeMs={2000} onClick={handleDeleteAccount} disabled={isLoading || !deletePassword || (user?.is_2fa_enabled && deleteTotpCode.length !== 6)} className="w-full justify-center mt-2">
                                {isLoading ? t('security_deleting') : t('security_delete_confirm')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-glass overflow-hidden flex flex-col animate-in zoom-in-[0.98] duration-300">
                        <div className="border-b border-white/10 p-5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-base font-medium text-white">{t('security_pass_btn')}</h3>
                            <button onClick={closePasswordModal} className="text-white/40 hover:text-white transition-colors p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <Input label={t('security_pass_current')} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isLoading} />
                            <div className="w-full h-px bg-white/5 my-1"></div>
                            <Input label={t('security_pass_new')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isLoading} />
                            <Input label={t('security_pass_confirm')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} />

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xs font-mono text-white/30 uppercase tracking-wider">{t('profile_hold_save')}</span>
                                <Button variant="hold" holdTimeMs={1500} onHoldComplete={handleRotateKey} disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}>
                                    {t('security_pass_update_btn')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {}
            {is2faModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-glass overflow-hidden flex flex-col animate-in zoom-in-[0.98] duration-300">
                        <div className="border-b border-white/10 p-5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-base font-medium text-white">
                                {twoFaMode === 'setup' || twoFaMode === 'backup' ? t('security_2fa_setup_title') : t('security_2fa_disable_title')}
                            </h3>
                            <button onClick={close2faModal} className="text-white/40 hover:text-white transition-colors p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            {twoFaMode === 'setup' ? (
                                <>
                                    <p className="text-sm text-white/50 text-center font-mono">{t('security_2fa_scan_desc')}</p>
                                    {qrUri ? (
                                        <div className="bg-white p-4 rounded-xl mx-auto flex items-center justify-center w-fit shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                            <QRCodeSVG value={qrUri} size={180} level="H" includeMargin={false} />
                                        </div>
                                    ) : (
                                        <div className="w-[180px] h-[180px] bg-white/5 rounded-xl mx-auto animate-pulse flex items-center justify-center border border-white/10">
                                            <span className="text-xs text-white/40 uppercase tracking-widest">{t('security_2fa_generating')}</span>
                                        </div>
                                    )}
                                    <div className="w-full h-px bg-white/5"></div>
                                    <div className="flex flex-col gap-2 text-center">
                                        <span className="text-sm font-medium text-white">{t('security_2fa_verify_setup')}</span>
                                        <span className="text-xs text-white/40 mb-2">{t('security_2fa_enter_code')}</span>
                                        <Input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="text-center tracking-[0.5em] font-mono text-lg text-fluid-peach" disabled={isLoading || !qrUri} />
                                    </div>
                                    <Button variant="primary" onClick={confirm2faSetup} disabled={isLoading || totpCode.length !== 6} className="w-full justify-center">
                                        {isLoading ? t('security_2fa_verifying') : t('security_2fa_enable_btn')}
                                    </Button>
                                </>
                            ) : twoFaMode === 'backup' ? (
                                <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="bg-fluid-peach/10 border border-fluid-peach/20 rounded-xl p-4 text-sm text-fluid-peach mb-6 shadow-inner">
                                        <span className="font-semibold block mb-1 tracking-wide">{t('security_2fa_save_recovery')}</span>
                                        {t('security_2fa_recovery_desc')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {backupCodes.map((code, idx) => (
                                            <div key={idx} className="bg-black/40 border border-white/10 py-2.5 px-1 rounded-lg text-center font-mono text-sm text-white tracking-[0.2em] select-all hover:bg-black/60 hover:border-white/30 transition-colors">
                                                {code}
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={close2faModal} className="w-full justify-center">
                                        {t('security_2fa_saved_btn')}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-fluid-pink/10 border border-fluid-pink/20 rounded-xl p-4 text-sm text-fluid-pink">
                                        <span className="font-semibold block mb-1">{t('security_2fa_security_verify')}</span>
                                        {t('security_2fa_disable_req')}
                                    </div>
                                    <div className="flex flex-col gap-4 mt-2">
                                        <Input label={t('profile_current_password')} type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} disabled={isLoading} />
                                        <Input label={t('auth_2fa_code')} type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="tracking-[0.5em] font-mono text-fluid-pink" disabled={isLoading} />
                                    </div>
                                    <Button variant="danger" onClick={disable2fa} disabled={isLoading || !disablePassword || totpCode.length !== 6} className="w-full justify-center mt-2">
                                        {isLoading ? t('security_2fa_disabling') : t('security_2fa_disable_btn')}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};