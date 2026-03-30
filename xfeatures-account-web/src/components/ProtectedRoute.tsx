import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isInitializing } = useStore();

    if (isInitializing) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center font-mono text-blood text-sm animate-pulse">
                ESTABLISHING SECURE CONNECTION...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};