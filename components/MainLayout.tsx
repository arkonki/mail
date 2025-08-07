
import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import EmailView from './EmailView';
import ComposeModal from './ComposeModal';
import Settings from './Settings';
import { useAppContext } from '../context/AppContext';

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
  const { composeState, handleEscape, view } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEscape();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEscape]);


  return (
    <div className="flex flex-col h-screen bg-surface dark:bg-dark-surface">
      <Header onLogout={onLogout} />
      <div className="flex flex-grow overflow-hidden">
        {view === 'mail' ? (
          <>
            <Sidebar />
            <main className="flex flex-grow">
              <EmailList />
              <EmailView />
            </main>
          </>
        ) : (
          <Settings />
        )}
      </div>
      {view === 'mail' && composeState.isOpen && <ComposeModal />}
    </div>
  );
};

export default MainLayout;
