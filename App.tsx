
import React, { useState, useCallback, useEffect } from 'react';
import Login, { UserCredentials } from './components/Login';
import MainLayout from './components/MainLayout';
import { AppContextProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';

// This component is always rendered INSIDE the AppContextProvider,
// so it can safely use the context for theming.
const ThemedMailClient: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { theme } = useAppContext();

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);
    
    return <MainLayout onLogout={onLogout} />;
};

// This component is rendered OUTSIDE the context provider.
// It gets theme info from localStorage to prevent a flash of incorrect theme.
const ThemedLogin: React.FC<{ onLoginSuccess: (creds: UserCredentials) => void }> = ({ onLoginSuccess }) => {
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        const root = window.document.documentElement;
        if (storedTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, []);

    return <Login onLoginSuccess={onLoginSuccess} />;
}

const App: React.FC = () => {
    const [credentials, setCredentials] = useState<UserCredentials | null>(null);

    const handleLoginSuccess = useCallback((creds: UserCredentials) => {
        setCredentials(creds);
    }, []);

    const handleLogout = useCallback(() => {
        setCredentials(null);
        // On logout, we can reset the theme to default light or just remove the class
        window.document.documentElement.classList.remove('dark');
    }, []);

    return (
        <ToastProvider>
             <div className="h-screen w-screen font-sans">
                {credentials ? (
                    <AppContextProvider credentials={credentials}>
                        <ThemedMailClient onLogout={handleLogout} />
                    </AppContextProvider>
                ) : (
                    <ThemedLogin onLoginSuccess={handleLoginSuccess} />
                )}
            </div>
        </ToastProvider>
    );
};

export default App;
