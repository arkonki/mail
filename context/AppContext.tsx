
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Email, ActionType, UserFolder, Conversation, User, AppSettings, Signature, AutoResponder, Rule } from '../types';
import { UserCredentials } from '../components/Login';
import { useToast } from './ToastContext';

interface ComposeState {
  isOpen: boolean;
  action?: ActionType;
  email?: Email;
  draftId?: string;
  conversationId?: string;
}

type Theme = 'light' | 'dark';
type View = 'mail' | 'settings';

const API_BASE_URL = 'http://localhost:3001/api';

const initialAppSettings: AppSettings = {
  signature: { isEnabled: false, body: '' },
  autoResponder: { isEnabled: false, subject: '', message: '' },
  rules: []
};

interface AppContextType {
  emails: Email[];
  conversations: Conversation[];
  userFolders: UserFolder[];
  currentFolder: string;
  selectedConversationId: string | null;
  composeState: ComposeState;
  searchQuery: string;
  selectedConversationIds: Set<string>;
  theme: Theme;
  displayedConversations: Conversation[];
  isSidebarCollapsed: boolean;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  view: View;
  appSettings: AppSettings;
  setCurrentFolder: (folder: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  openCompose: (action?: ActionType, email?: Email) => void;
  closeCompose: () => void;
  toggleStar: (conversationId: string, emailId?: string) => void;
  sendEmail: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => Promise<void>;
  saveDraft: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string) => Promise<string | undefined>;
  deleteConversation: (conversationIds: string[]) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleConversationSelection: (conversationId: string) => void;
  selectAllConversations: (conversationIds: string[]) => void;
  deselectAllConversations: () => void;
  bulkDelete: () => void;
  bulkMarkAsRead: () => void;
  bulkMarkAsUnread: () => void;
  moveConversations: (conversationIds: string[], targetFolder: string) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  navigateConversationList: (direction: 'up' | 'down') => void;
  handleEscape: () => void;
  setView: (view: View) => void;
  markAsRead: (conversationId: string) => void;
  updateSignature: (signature: Signature) => void;
  updateAutoResponder: (autoResponder: AutoResponder) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  deleteRule: (ruleId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode; credentials: UserCredentials }> = ({ children, credentials }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false });
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const [selectedConversationIds, setSelectedConversationIds] = useState(new Set<string>());
  const { addToast } = useToast();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('mail');
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  
  const user = useMemo(() => ({
    email: credentials.email,
    name: credentials.email.split('@')[0],
  }), [credentials]);

  const fetchEmails = useCallback(async (folder: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const response = await fetch(`${API_BASE_URL}/emails/${folder}`);
        if (!response.ok) throw new Error('Failed to fetch emails.');
        const data = await response.json();
        setEmails(data);
    } catch (err: any) {
        setError(err.message);
        addToast(err.message, { duration: 5000 });
    } finally {
        setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [mailboxesRes, settingsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/mailboxes`),
                fetch(`${API_BASE_URL}/settings`),
            ]);
            if (!mailboxesRes.ok) throw new Error('Failed to fetch mailboxes.');
            if (!settingsRes.ok) throw new Error('Failed to fetch settings.');
            
            const mailboxesData: UserFolder[] = await mailboxesRes.json();
            setUserFolders(mailboxesData);

            const settingsData = await settingsRes.json();
            setAppSettings(settingsData);

        } catch (err: any) {
             setError(err.message);
             addToast(err.message, { duration: 5000 });
        }
    };
    fetchInitialData();
  }, [addToast]);
  
  useEffect(() => {
      fetchEmails(currentFolder);
  }, [currentFolder, fetchEmails]);


  const conversations = useMemo<Conversation[]>(() => {
    const groupedByConversationId = emails.reduce((acc, email) => {
        const key = email.conversationId || email.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(email);
        return acc;
    }, {} as Record<string, Email[]>);

    return Object.entries(groupedByConversationId).map(([id, convEmails]) => {
        convEmails.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const lastEmail = convEmails[convEmails.length - 1];
        
        const participants = convEmails.reduce((acc, email) => {
            if (email.senderEmail && !acc.some(p => p.email === email.senderEmail)) {
                acc.push({ name: email.senderName, email: email.senderEmail });
            }
            return acc;
        }, [] as { name: string, email: string }[]);

        return {
            id,
            subject: lastEmail.subject,
            emails: convEmails,
            participants,
            lastTimestamp: lastEmail.timestamp,
            isRead: convEmails.every(e => e.isRead),
            isStarred: convEmails.some(e => e.isStarred),
            folder: lastEmail.folder,
            hasAttachments: convEmails.some(e => e.attachments && e.attachments.length > 0)
        };
    });
  }, [emails]);

  const displayedConversations = useMemo(() => {
    if (searchQuery.length > 0) {
        const lowercasedQuery = searchQuery.toLowerCase();
        return conversations.filter(conv => 
            conv.emails.some(email =>
                (email.subject?.toLowerCase() || '').includes(lowercasedQuery) ||
                (email.senderName?.toLowerCase() || '').includes(lowercasedQuery)
            )
        );
    }
    return conversations.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [conversations, searchQuery]);

  const setCurrentFolderCallback = useCallback((folder: string) => {
      setCurrentFolder(folder);
      setSelectedConversationId(null);
      setSearchQueryState('');
      setSelectedConversationIds(new Set());
  }, []);

  const openCompose = useCallback((action?: ActionType, email?: Email) => {
    setComposeState({ 
        isOpen: true, 
        action, 
        email, 
        draftId: email?.folder === 'Drafts' ? email.id : undefined, 
        conversationId: email?.conversationId 
    });
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false }), []);
  
  const getActionsPayload = (conversationIds: string[]) => {
      const payload: {mailbox: string; uids: number[]}[] = [];
      const convMap = new Map(conversations.map(c => [c.id, c]));
      
      const emailActions = conversationIds.reduce((acc, cId) => {
          const conv = convMap.get(cId);
          if (conv) {
              conv.emails.forEach(e => {
                  if (!acc[e.folder]) acc[e.folder] = new Set();
                  acc[e.folder].add(parseInt(e.id, 10));
              });
          }
          return acc;
      }, {} as Record<string, Set<number>>);

      for(const mailbox in emailActions) {
          payload.push({ mailbox, uids: Array.from(emailActions[mailbox]) });
      }
      return payload;
  };

  const sendEmail = async (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => {
      try {
          const response = await fetch(`${API_BASE_URL}/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...data, attachments: [] }) // Note: attachment handling is complex
          });
          if (!response.ok) throw new Error('Failed to send email.');
          addToast('Email sent successfully!');
          fetchEmails(currentFolder); // Refresh
      } catch (err: any) {
          addToast(err.message, { duration: 5000 });
      }
  };

  const toggleStar = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    
    const isCurrentlyStarred = conv.isStarred;
    const optimisticEmails = emails.map(e => e.conversationId === conversationId ? { ...e, isStarred: !isCurrentlyStarred } : e);
    setEmails(optimisticEmails);

    try {
        const payload = getActionsPayload([conversationId]);
        const response = await fetch(`${API_BASE_URL}/actions/star`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ actions: payload, isStarred: !isCurrentlyStarred })
        });
        if (!response.ok) throw new Error('Failed to update star');
    } catch(err) {
        addToast('Failed to update star.', {duration: 3000});
        setEmails(emails); // Revert on failure
    }
  };

  const deleteConversation = async (conversationIds: string[]) => {
      const originalEmails = [...emails];
      const optimisticEmails = emails.filter(e => !conversationIds.includes(e.conversationId));
      setEmails(optimisticEmails);
      addToast('Deleting...');
      
      try {
        const payload = getActionsPayload(conversationIds);
        const response = await fetch(`${API_BASE_URL}/actions/delete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ actions: payload })
        });
        if (!response.ok) throw new Error('Failed to delete');
        addToast('Conversation deleted.');
        if (selectedConversationIds.size > 0) deselectAllConversations();
        if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
      } catch (err) {
        addToast('Failed to delete conversation.', {duration: 3000});
        setEmails(originalEmails);
      }
  };

  const moveConversations = async (conversationIdsToMove: string[], targetFolder: string) => {
    const originalEmails = [...emails];
    const optimisticEmails = emails.filter(e => !conversationIdsToMove.includes(e.conversationId));
    setEmails(optimisticEmails);
    addToast('Moving...');
    
    try {
        const payload = getActionsPayload(conversationIdsToMove);
        await fetch(`${API_BASE_URL}/actions/move`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ actions: payload, targetFolder })
        });
        deselectAllConversations();
        addToast('Moved successfully.');
        if(conversationIdsToMove.includes(selectedConversationId!)) setSelectedConversationId(null);
    } catch (err) {
        addToast('Failed to move conversations.', {duration: 3000});
        setEmails(originalEmails);
    }
  };
  
  const handleEscape = useCallback(() => {
      if (composeState.isOpen) closeCompose();
      else if (selectedConversationId) setSelectedConversationId(null);
      else if (searchQuery) setSearchQueryState('');
  }, [composeState.isOpen, selectedConversationId, searchQuery, closeCompose]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        return newTheme;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  const toggleConversationSelection = useCallback((conversationId: string) => {
    setSelectedConversationIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(conversationId)) newSet.delete(conversationId);
        else newSet.add(conversationId);
        return newSet;
    });
  }, []);

  const selectAllConversations = useCallback((conversationIds: string[]) => {
    setSelectedConversationIds(new Set(conversationIds));
  }, []);

  const deselectAllConversations = useCallback(() => {
    setSelectedConversationIds(new Set());
  }, []);
  
  const markAsRead = useCallback(async (conversationId: string) => {
    const originalEmails = [...emails];
    setEmails(prev => prev.map(e => e.conversationId === conversationId ? {...e, isRead: true } : e));
    try {
        const payload = getActionsPayload([conversationId]);
        await fetch(`${API_BASE_URL}/actions/mark-as-read`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ actions: payload })
        });
    } catch(err) {
        addToast('Failed to mark as read.', {duration: 3000});
        setEmails(originalEmails);
    }
  }, [addToast, emails, conversations]);
  
  const markAsUnread = async (conversationIds: string[]) => {
    const originalEmails = [...emails];
    setEmails(prev => prev.map(e => conversationIds.includes(e.conversationId) ? {...e, isRead: false } : e));
    try {
        const payload = getActionsPayload(conversationIds);
        await fetch(`${API_BASE_URL}/actions/mark-as-unread`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ actions: payload })
        });
    } catch(err) {
        addToast('Failed to mark as unread.', {duration: 3000});
        setEmails(originalEmails);
    }
  };

  const bulkAction = async (action: 'read' | 'unread' | 'delete') => {
      const ids = Array.from(selectedConversationIds);
      if (ids.length === 0) return;
      
      addToast('Processing...');
      if (action === 'delete') {
          await deleteConversation(ids);
      } else if (action === 'read') {
          const originalEmails = [...emails];
          setEmails(prev => prev.map(e => ids.includes(e.conversationId) ? {...e, isRead: true } : e));
          try {
              const payload = getActionsPayload(ids);
              await fetch(`${API_BASE_URL}/actions/mark-as-read`, {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ actions: payload })
              });
              addToast('Marked as read.');
          } catch(err) {
              addToast('Failed to mark as read.', {duration: 3000});
              setEmails(originalEmails);
          }
      } else if (action === 'unread') {
          await markAsUnread(ids);
      }
      deselectAllConversations();
  };

  const bulkMarkAsRead = () => bulkAction('read');
  const bulkMarkAsUnread = () => bulkAction('unread');
  const bulkDelete = () => bulkAction('delete');

  const updateSettings = async (newSettings: AppSettings) => {
      try {
          await fetch(`${API_BASE_URL}/settings`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ settings: newSettings })
          });
          setAppSettings(newSettings);
          addToast('Settings saved successfully!');
      } catch (err) {
          addToast('Failed to save settings.', {duration: 3000});
      }
  }

  const updateSignature = (signature: Signature) => updateSettings({ ...appSettings, signature });
  const updateAutoResponder = (autoResponder: AutoResponder) => updateSettings({ ...appSettings, autoResponder });
  
  const addRule = (rule: Omit<Rule, 'id'>) => {
      const newRule = { ...rule, id: `rule-${Date.now()}` };
      const updatedRules = [...appSettings.rules, newRule];
      updateSettings({ ...appSettings, rules: updatedRules });
  };
  
  const deleteRule = (ruleId: string) => {
      const updatedRules = appSettings.rules.filter(r => r.id !== ruleId);
      updateSettings({ ...appSettings, rules: updatedRules });
  };

  const contextValue: AppContextType = useMemo(() => ({
    emails, conversations, userFolders, currentFolder, selectedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, isSidebarCollapsed, isLoading, error, user, view, appSettings,
    setCurrentFolder: setCurrentFolderCallback, setSelectedConversationId, openCompose, closeCompose, toggleStar, sendEmail, deleteConversation, setSearchQuery: setSearchQueryState, toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, moveConversations, toggleTheme, toggleSidebar, handleEscape, navigateConversationList: () => {}, saveDraft: async () => undefined, setView, markAsRead, updateSignature, updateAutoResponder, addRule, deleteRule,
  }), [emails, conversations, userFolders, currentFolder, selectedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, isSidebarCollapsed, isLoading, error, user, view, appSettings, setCurrentFolderCallback, openCompose, closeCompose, toggleStar, sendEmail, deleteConversation, moveConversations, toggleTheme, toggleSidebar, handleEscape, toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, markAsRead, updateSignature, updateAutoResponder, addRule, deleteRule]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
