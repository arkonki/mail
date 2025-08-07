
import React, { useState, useCallback, useEffect } from 'react';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import { AppContextProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';

const ThemedApp: React.FC = () => {
  const { theme } = useAppContext();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);


  return (
    <div className="h-screen w-screen font-sans">
      {isAuthenticated ? (
        <MainLayout onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}


const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContextProvider>
        <ThemedApp />
      </AppContextProvider>
    </ToastProvider>
  );
};

export default App;
