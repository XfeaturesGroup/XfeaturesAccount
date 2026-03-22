import { useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

export const AvatarUpload = () => {
    const { user, setUser, addLog } = useStore();
    const { t } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const backendUrl = import.meta.env.VITE_API_URL || '';

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            addLog('error', 'File size exceeds 5MB limit.');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setIsUploading(true);
        try {
            const response = await api.post('/api/user/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const meResponse = await api.get('/api/user/me');
            setUser(meResponse.data.user);

            addLog('success', response.data.message || 'Avatar updated successfully.');
        } catch (error: unknown) {
            if (isAxiosError(error)) {
                addLog('error', error.response?.data?.error || 'Failed to upload avatar.');
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        setIsUploading(true);
        try {
            await api.delete('/api/user/avatar');
            const meResponse = await api.get('/api/user/me');
            setUser(meResponse.data.user);
            addLog('info', 'Avatar removed.');
        } catch {
            addLog('error', 'Failed to remove avatar.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-6">
            <div className="relative group">
                {user?.avatar_url ? (
                    <img
                        src={`${backendUrl}${user.avatar_url}`}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#222222] bg-black"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-[#0A0A0A] border-2 border-[#222222] flex items-center justify-center">
                        <span className="text-2xl font-medium text-[#666666]">
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-base font-medium text-white">{t('avatar_title')}</span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-sm font-medium text-black bg-white hover:bg-[#EAEAEA] px-4 py-1.5 rounded-md transition-all disabled:opacity-50"
                    >
                        {isUploading ? t('avatar_uploading') : t('avatar_upload')}
                    </button>
                    {user?.avatar_url && (
                        <button
                            onClick={handleRemove}
                            disabled={isUploading}
                            className="text-sm font-medium text-[#FF453A] hover:bg-[#FF453A]/10 px-4 py-1.5 rounded-md transition-all disabled:opacity-50"
                        >
                            {t('avatar_remove')}
                        </button>
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                />
            </div>
        </div>
    );
};