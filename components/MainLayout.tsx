import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import EmailView from './EmailView';
import ComposeModal from './ComposeModal';
import Settings from './Settings';
import { useAppContext } from '../context/AppContext';
import { ActionType } from '../types';

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
  const { view, conversations, selectedConversationId, composeState, openCompose, deleteConversation, navigateConversationList, handleEscape } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'DIV'].includes(target.tagName) && target.isContentEditable) {
        if (e.key === 'Escape') { handleEscape(); }
        return;
      }
      
       if (e.metaKey || e.ctrlKey) return;

      const selectedConversation = conversations.find(c => c.id === selectedConversationId);
      const latestEmailInConv = selectedConversation?.emails[selectedConversation.emails.length - 1];

      switch(e.key) {
        case 'c':
          e.preventDefault();
          openCompose();
          break;
        case 'r':
          if (latestEmailInConv) {
            e.preventDefault();
            openCompose(ActionType.REPLY, latestEmailInConv);
          }
          break;
        case 'f':
           if (latestEmailInConv) {
            e.preventDefault();
            openCompose(ActionType.FORWARD, latestEmailInConv);
          }
          break;
        case 'd':
        case '#':
          if (selectedConversationId) {
             e.preventDefault();
             deleteConversation(selectedConversationId);
          }
          break;
        case 'j':
          e.preventDefault();
          navigateConversationList('down');
          break;
        case 'k':
          e.preventDefault();
          navigateConversationList('up');
          break;
        case 'o':
        case 'Enter':
          // handled by selecting conversation
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
          break;
        case 'Escape':
           e.preventDefault();
           handleEscape();
           break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };

  }, [conversations, selectedConversationId, openCompose, deleteConversation, navigateConversationList, handleEscape]);


  return (
    <div className="flex flex-col h-screen bg-surface dark:bg-dark-surface">
      <Header onLogout={onLogout} />
      {view === 'settings' ? (
        <Settings />
      ) : (
        <div className="flex flex-grow overflow-hidden">
          <Sidebar />
          <main className="flex flex-grow">
            <EmailList />
            <EmailView />
          </main>
        </div>
      )}
      {composeState.isOpen && <ComposeModal />}
    </div>
  );
};

export default MainLayout;