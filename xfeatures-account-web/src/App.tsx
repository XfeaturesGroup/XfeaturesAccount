import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { api } from './lib/api';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActionBuffer } from './components/ui/ActionBuffer';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

function App() {
    const { setUser, addLog } = useStore();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await api.get('/api/user/me');
                setUser(response.data.user);
                addLog('success', 'SYS: Authentication restored from cache.');
            } catch {
                setUser(null);
                addLog('info', 'SYS: No active session found. Awaiting user input.');
            }
        };

        void checkAuth();

        const handleUnauthorized = () => setUser(null);
        window.addEventListener('auth_unauthorized', handleUnauthorized);

        return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
    }, [setUser, addLog]);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route
                    path="/dashboard/*"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <ActionBuffer />
        </BrowserRouter>
    );
}

export default App;