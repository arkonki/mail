
import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import EmailView from './EmailView';
import ComposeModal from './ComposeModal';
import Settings from './Settings';
import ContactsView from './ContactsView';
import { useAppContext } from '../context/AppContext';

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
  const { composeState, handleEscape, view, isSidebarOpen, toggleSidebar, isSidebarOpen: isSidebarCollapsed, selectedConversationId } = useAppContext();

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

  const renderMailView = () => (
    <div className="flex flex-grow overflow-hidden">
      <div className={`md:flex flex-grow`}>
        <EmailList />
        <EmailView />
      </div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case 'settings':
        return <Settings />;
      case 'contacts':
        return <ContactsView />;
      case 'mail':
      default:
        return renderMailView();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface dark:bg-dark-surface text-on-surface dark:text-dark-on-surface">
      <Header onLogout={onLogout} />
      <div className="flex flex-grow overflow-hidden relative">
        {isSidebarOpen && <div onClick={toggleSidebar} className="fixed inset-0 bg-black/50 z-10 md:hidden" />}
        <Sidebar />
        <main className={`flex-grow transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          {renderView()}
        </main>
      </div>
      {composeState.isOpen && <ComposeModal />}
    </div>
  );
};

export default MainLayout;
