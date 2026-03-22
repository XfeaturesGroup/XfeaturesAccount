import { useState, useEffect, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AvatarUpload } from './AvatarUpload';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n';
import { languageNames, type Language } from '../../locales/.index.ts';

type EditMode = 'none' | 'username' | 'email' | 'name' | 'phishing' | 'language';

interface DataRowProps {
    label: string;
    value?: string | null;
    onEdit: () => void;
    isVerified?: boolean;
    onVerify?: () => void | Promise<void>;
    cooldown?: number;
}

export const ProfileForm = () => {
    const { user, setUser, addLog } = useStore();
    const { t } = useTranslation();

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [editMode, setEditMode] = useState<EditMode>('none');
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const [password, setPassword] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        phishCode: '',
        language: ''
    });

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openModal = (mode: EditMode) => {
        setFormData({
            username: user?.username || '',
            email: user?.email || '',
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            phishCode: user?.anti_phishing_code || '',
            language: user?.language || 'en'
        });
        setPassword('');
        setEditMode(mode);
    };

    const closeModal = () => {
        setEditMode('none');
        setPassword('');
    };

    const handleSendVerification = async () => {
        if (cooldown > 0) return;
        setIsLoading(true);
        try {
            const response = await api.post('/api/user/send-verification');
            addLog('success', response.data.message || 'Verification link sent.');
            setCooldown(60);
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                addLog('error', error.response?.data?.error || 'Failed to send verification.');
                if (error.response?.status === 429) {
                    const match = error.response.data.error.match(/wait (\d+) seconds/);
                    if (match) setCooldown(parseInt(match[1]));
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMutate = async () => {
        if (!password) {
            addLog('warning', 'Password required to save changes.');
            return;
        }

        setIsLoading(true);

        const payload: Record<string, string> = { currentPassword: password };
        if (editMode === 'username') payload.newUsername = formData.username;
        if (editMode === 'email') payload.newEmail = formData.email;
        if (editMode === 'name') {
            payload.firstName = formData.firstName;
            payload.lastName = formData.lastName;
        }
        if (editMode === 'phishing') payload.antiPhishingCode = formData.phishCode;
        if (editMode === 'language') payload.language = formData.language;

        try {
            await api.put('/api/user/profile', payload);

            const meResponse = await api.get('/api/user/me');
            setUser(meResponse.data.user);

            addLog('success', 'Profile updated successfully.');
            closeModal();
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                addLog('error', error.response?.data?.error || 'Update failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getFieldName = (mode: EditMode) => {
        switch(mode) {
            case 'username': return t('profile_username');
            case 'email': return t('profile_email');
            case 'name': return t('profile_fullname');
            case 'phishing': return t('profile_phishing');
            case 'language': return t('profile_language');
            default: return '';
        }
    };

    const DataRow = ({ label, value, onEdit, isVerified, onVerify, cooldown = 0 }: DataRowProps) => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-white/5 last:border-0 gap-4 group">
            <div className="flex flex-col gap-1.5">
                <span className="text-xs tracking-widest uppercase font-semibold text-white/40">{label}</span>
                <div className="flex items-center gap-3">
                    <span className={cn("text-base", !value ? "text-white/30 italic" : "text-white/90 font-medium")}>
                        {value || t('profile_not_provided')}
                    </span>

                    {isVerified !== undefined && (
                        <div className="flex items-center gap-3">
                            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border tracking-wide uppercase", isVerified ? "bg-[#32D74B]/10 text-[#32D74B] border-[#32D74B]/20" : "bg-fluid-peach/10 text-fluid-peach border-fluid-peach/20 shadow-[0_0_10px_rgba(255,126,103,0.1)]")}>
                                {isVerified ? t('status_verified') : t('status_unverified')}
                            </span>

                            {!isVerified && onVerify && (
                                <button
                                    onClick={onVerify}
                                    disabled={isLoading || cooldown > 0}
                                    className="text-xs font-medium text-fluid-pink hover:text-fluid-peach transition-colors disabled:opacity-50"
                                >
                                    {cooldown > 0 ? t('profile_wait_s', { time: cooldown }) : t('profile_resend_email')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <button
                onClick={onEdit}
                className="text-sm font-medium text-white/40 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
                {t('edit')}
            </button>
        </div>
    );

    return (
        <div className="relative">
            <div className="flex flex-col gap-6">

                {}
                <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass hover:bg-white/[0.03] transition-colors duration-500">
                    <AvatarUpload />
                </div>

                {}
                <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass hover:bg-white/[0.03] transition-colors duration-500">
                    <h3 className="text-lg font-medium text-white mb-2">{t('profile_personal_info')}</h3>
                    <p className="text-sm text-white/40 mb-6 font-mono">{t('profile_personal_desc')}</p>

                    <div className="flex flex-col">
                        <DataRow label={t('profile_username')} value={user?.username} onEdit={() => openModal('username')} />
                        <DataRow
                            label={t('profile_email')}
                            value={user?.email}
                            isVerified={!!user?.email_verified}
                            onEdit={() => openModal('email')}
                            onVerify={handleSendVerification}
                            cooldown={cooldown}
                        />
                        <DataRow
                            label={t('profile_fullname')}
                            value={`${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
                            onEdit={() => openModal('name')}
                        />
                        <DataRow
                            label={t('profile_language')}
                            value={languageNames[(user?.language as Language) || 'en']}
                            onEdit={() => openModal('language')}
                        />
                    </div>
                </div>

                {}
                <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-glass hover:bg-white/[0.03] transition-colors duration-500">
                    <h3 className="text-lg font-medium text-white mb-2">{t('profile_phishing')}</h3>
                    <p className="text-sm text-white/40 mb-6 font-mono">{t('profile_phishing_desc')}</p>

                    <div className="flex justify-between items-center bg-black/40 p-5 rounded-xl border border-white/5 shadow-inner">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs tracking-widest uppercase font-semibold text-white/40">{t('profile_current_code')}</span>
                            <span className="text-base font-mono font-medium text-white/80">
                                {user?.anti_phishing_code ? '••••••••' : t('profile_not_configured')}
                            </span>
                        </div>
                        <button
                            onClick={() => openModal('phishing')}
                            className="text-sm font-medium text-fluid-peach hover:text-white px-4 py-2 rounded-lg hover:bg-fluid-peach/10 transition-all border border-transparent hover:border-fluid-peach/30 hover:shadow-[0_0_15px_rgba(255,126,103,0.2)]"
                        >
                            {t('configure')}
                        </button>
                    </div>
                </div>
            </div>

            {}
            {editMode !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-glass overflow-hidden flex flex-col animate-in zoom-in-[0.98] duration-300">

                        <div className="border-b border-white/10 p-5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-base font-medium text-white capitalize">
                                {t('profile_edit_title', { field: getFieldName(editMode) })}
                            </h3>
                            <button onClick={closeModal} className="text-white/40 hover:text-fluid-pink transition-colors p-1 hover:rotate-90 duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="p-6 flex flex-col gap-5">
                            {editMode === 'username' && (
                                <Input label={t('profile_new_username')} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={isLoading} />
                            )}
                            {editMode === 'email' && (
                                <Input label={t('profile_new_email')} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={isLoading} autoComplete="off" />
                            )}
                            {editMode === 'name' && (
                                <div className="flex gap-4">
                                    <Input label={t('profile_first_name')} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} disabled={isLoading} autoComplete="off" />
                                    <Input label={t('profile_last_name')} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} disabled={isLoading} autoComplete="off" />
                                </div>
                            )}
                            {editMode === 'phishing' && (
                                <Input label={t('profile_phishing')} placeholder="e.g. VORTEX-77" value={formData.phishCode} onChange={e => setFormData({...formData, phishCode: e.target.value})} disabled={isLoading} autoComplete="off" />
                            )}

                            {editMode === 'language' && (
                                <div className="flex flex-col gap-2" ref={dropdownRef}>
                                    <label className="text-sm font-medium text-white/60 tracking-wide">{t('profile_select_language')}</label>
                                    <div className="relative">
                                        <div className="relative group">
                                            <input
                                                type="search"
                                                name="languageSearchOff"
                                                id="languageSearchOff"
                                                autoComplete="new-password"
                                                data-lpignore="true"
                                                data-1p-ignore="true"
                                                value={searchTerm}
                                                placeholder={languageNames[formData.language as Language] || "Search language..."}
                                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3.5 pr-10 text-white text-sm focus:outline-none focus:shadow-focus-ring focus:bg-black/40 transition-all placeholder:text-white/30 shadow-inner hover:border-white/10 [&::-webkit-search-cancel-button]:hidden"
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                    if (!isDropdownOpen) setIsDropdownOpen(true);
                                                }}
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            />
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/40">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                    className={cn("transition-transform duration-300", isDropdownOpen && "rotate-180 text-fluid-peach")}
                                                >
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "absolute z-[60] mt-2 w-full bg-black/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-glass overflow-hidden transition-all duration-300 origin-top",
                                            isDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
                                        )}>
                                            <div className="max-h-[180px] overflow-y-auto custom-scrollbar p-1.5">
                                                {Object.entries(languageNames)
                                                    .filter(([code, name]) =>
                                                        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                        code.toLowerCase().includes(searchTerm.toLowerCase())
                                                    )
                                                    .map(([code, name]) => (
                                                        <button
                                                            key={code}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({...formData, language: code});
                                                                setIsDropdownOpen(false);
                                                                setSearchTerm('');
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                                                                formData.language === code ? "bg-white/10 text-white shadow-edge-lit" : "text-white/50 hover:bg-white/5 hover:text-white"
                                                            )}
                                                        >
                                                            <span>{name}</span>
                                                            {formData.language === code && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-fluid-peach" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            )}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 pt-6 border-t border-white/10">
                                <Input
                                    label={t('profile_current_password')}
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={t('profile_confirm_save')}
                                    required
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs font-mono text-white/30 uppercase tracking-wider">
                                    {t('profile_hold_save')}
                                </span>
                                <Button
                                    variant="hold"
                                    holdTimeMs={1500}
                                    onHoldComplete={handleMutate}
                                    disabled={isLoading || !password}
                                >
                                    {t('save')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};