
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Email, ActionType, UserFolder, Conversation, User, AppSettings, Signature, AutoResponder, Rule, Folder, Contact } from '../types';
import { useToast } from './ToastContext';
import { mockContacts, mockEmails, mockUser, mockUserFolders as initialMockUserFolders } from '../data/mockData';


interface ComposeState {
  isOpen: boolean;
  action?: ActionType;
  email?: Email;
  recipient?: string;
  bodyPrefix?: string;
  draftId?: string;
  conversationId?: string;
}

type Theme = 'light' | 'dark';
type View = 'mail' | 'settings' | 'contacts';

const initialAppSettings: AppSettings = {
  signature: { isEnabled: false, body: '' },
  autoResponder: { isEnabled: false, subject: '', message: '' },
  rules: []
};

interface AppContextType {
  // State
  user: User | null;
  emails: Email[];
  conversations: Conversation[];
  userFolders: UserFolder[];
  currentFolder: string;
  selectedConversationId: string | null;
  focusedConversationId: string | null;
  composeState: ComposeState;
  searchQuery: string;
  selectedConversationIds: Set<string>;
  theme: Theme;
  displayedConversations: Conversation[];
  isSidebarCollapsed: boolean;
  view: View;
  appSettings: AppSettings;
  contacts: Contact[];
  selectedContactId: string | null;
  isLoading: boolean;
  loginError: string | null;
  
  // Auth
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  checkUserSession: () => void;
  
  // Mail Navigation
  setCurrentFolder: (folder: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Compose
  openCompose: (config?: { action?: ActionType; email?: Email; recipient?: string; bodyPrefix?: string; }) => void;
  closeCompose: () => void;
  sendEmail: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => Promise<void>;
  
  // Mail Actions
  toggleStar: (conversationId: string, isCurrentlyStarred: boolean) => void;
  deleteConversation: (conversationIds: string[]) => void;
  moveConversations: (conversationIds: string[], targetFolder: string) => void;
  markAsRead: (conversationId: string) => void;
  markAsUnread: (conversationId: string) => void;
  markAsSpam: (conversationIds: string[]) => void;
  markAsNotSpam: (conversationIds: string[]) => void;

  // Bulk Selection
  toggleConversationSelection: (conversationId: string) => void;
  selectAllConversations: (conversationIds: string[]) => void;
  deselectAllConversations: () => void;
  bulkDelete: () => void;
  bulkMarkAsRead: () => void;
  bulkMarkAsUnread: () => void;

  // UI
  toggleTheme: () => void;
  toggleSidebar: () => void;
  handleEscape: () => void;
  navigateConversationList: (direction: 'up' | 'down') => void;
  openFocusedConversation: () => void;
  setView: (view: View) => void;
  
  // Settings
  updateSignature: (signature: Signature) => void;
  updateAutoResponder: (autoResponder: AutoResponder) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  deleteRule: (ruleId: string) => void;
  
  // Folder Management
  createUserFolder: (name: string) => void;
  renameUserFolder: (id: string, newName: string) => void;
  deleteUserFolder: (id: string) => void;

  // Contacts
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => void;
  setSelectedContactId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const savedContacts = localStorage.getItem('contacts');
    return savedContacts ? JSON.parse(savedContacts) : mockContacts;
  });
  const [currentFolder, setCurrentFolder] = useState<string>(Folder.INBOX);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConversationIds, setSelectedConversationIds] = useState(new Set<string>());
  const { addToast } = useToast();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('isSidebarCollapsed') === 'true');
  const [view, setView] = useState<View>('mail');
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      const savedSettings = localStorage.getItem('appSettings');
      return savedSettings ? JSON.parse(savedSettings) : initialAppSettings;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(appSettings)); }, [appSettings]);
  useEffect(() => { localStorage.setItem('contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem('emails', JSON.stringify(emails)); }, [emails]);
  useEffect(() => { localStorage.setItem('userFolders', JSON.stringify(userFolders)); }, [userFolders]);

  const loadInitialData = useCallback(() => {
      const savedEmails = localStorage.getItem('emails');
      const savedFolders = localStorage.getItem('userFolders');
      setEmails(savedEmails ? JSON.parse(savedEmails) : mockEmails);
      setUserFolders(savedFolders ? JSON.parse(savedFolders) : initialMockUserFolders);
  }, []);

  const checkUserSession = useCallback(async () => {
    setIsLoading(true);
    // In a real app, you'd check a session token. Here, we just auto-login the mock user.
    setUser(mockUser);
    loadInitialData();
    setCurrentFolder(Folder.INBOX);
    setTimeout(() => setIsLoading(false), 500); // Simulate loading
  }, [loadInitialData]);
  
  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    setLoginError(null);
    // Mock login: succeed with any non-empty credentials
    if (email && pass) {
        await checkUserSession();
        addToast(`Welcome, ${mockUser.name}!`);
    } else {
        setLoginError('Please enter both email and password.');
        setUser(null);
        setIsLoading(false);
    }
  }, [checkUserSession, addToast]);

  const logout = useCallback(async () => {
    setUser(null);
    setEmails([]);
    setUserFolders([]);
    setCurrentFolder(Folder.INBOX);
    setSelectedConversationId(null);
    setLoginError(null);
    // Optionally clear mock data from storage on logout
    // localStorage.removeItem('emails');
    // localStorage.removeItem('userFolders');
    addToast('You have been logged out.');
  }, [addToast]);


  // --- Data Transformation ---
  const allConversations = useMemo<Conversation[]>(() => {
    if (emails.length === 0) return [];
    const grouped = emails.reduce((acc, email) => {
      const convId = email.conversationId || email.id;
      if (!acc[convId]) {
        acc[convId] = [];
      }
      acc[convId].push(email);
      return acc;
    }, {} as Record<string, Email[]>);

    return Object.entries(grouped)
      .map(([id, convEmails]) => {
        convEmails.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const lastEmail = convEmails[convEmails.length - 1];
        const participants = [...new Map(convEmails.map(e => [e.senderEmail, { name: e.senderEmail === user?.email ? 'Me' : e.senderName, email: e.senderEmail }])).values()];

        return {
          id,
          subject: lastEmail.subject || '(no subject)',
          emails: convEmails,
          participants,
          lastTimestamp: lastEmail.timestamp,
          isRead: convEmails.every(e => e.isRead),
          isStarred: convEmails.some(e => e.isStarred),
          isSnoozed: false,
          folder: lastEmail.folder,
          hasAttachments: convEmails.some(e => e.attachments && e.attachments.length > 0)
        };
      })
      .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [emails, user]);


  const displayedConversations = useMemo(() => {
    let filteredConversations = allConversations;
    if (searchQuery.length > 0) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filteredConversations = filteredConversations.filter(conv => 
            conv.subject.toLowerCase().includes(lowercasedQuery) ||
            conv.participants.some(p => p.name.toLowerCase().includes(lowercasedQuery) || p.email.toLowerCase().includes(lowercasedQuery)) ||
            conv.emails.some(e => e.snippet.toLowerCase().includes(lowercasedQuery))
        );
    } else {
      if (currentFolder === Folder.STARRED) {
        filteredConversations = allConversations.filter(c => c.isStarred && c.folder !== Folder.TRASH && c.folder !== Folder.SPAM);
      } else {
        filteredConversations = allConversations.filter(c => c.folder === currentFolder);
      }
    }
    return filteredConversations;
  }, [allConversations, currentFolder, searchQuery]);
  

  const setCurrentFolderCallback = useCallback((folder: string) => {
    setView('mail');
    setCurrentFolder(folder);
    setSelectedConversationId(null);
    setFocusedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
  }, []);

  const openCompose = useCallback((config: { action?: ActionType; email?: Email; recipient?: string; bodyPrefix?: string; } = {}) => {
    setComposeState({ isOpen: true, ...config });
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false }), []);
  
  const deselectAllConversations = useCallback(() => setSelectedConversationIds(new Set()), []);
  
  const moveConversations = useCallback(async (conversationIds: string[], targetFolder: string) => {
    setEmails(prevEmails => {
        return prevEmails.map(email => 
            conversationIds.includes(email.conversationId)
                ? { ...email, folder: targetFolder, isRead: true } 
                : email
        );
    });
    addToast(`Moved ${conversationIds.length} conversation(s) to ${targetFolder}.`);
    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [addToast, selectedConversationId, selectedConversationIds.size, deselectAllConversations]);

  const sendEmail = useCallback(async (data: { to: string; subject: string; body: string; attachments: File[] }) => {
    if (!user) return;
    const newEmail: Email = {
      id: `email-${Date.now()}`,
      conversationId: `conv-${Date.now()}`,
      senderName: user.name,
      senderEmail: user.email,
      recipientEmail: data.to,
      subject: data.subject || '(no subject)',
      body: data.body,
      snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
      timestamp: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      folder: Folder.SENT,
      attachments: data.attachments.map(f => ({fileName: f.name, fileSize: f.size})),
    };

    setEmails(prev => [newEmail, ...prev]);
    addToast('Message sent.');
    setCurrentFolderCallback(Folder.SENT);
  }, [addToast, user, setCurrentFolderCallback]);
  
  const toggleStar = useCallback(async (conversationId: string, isCurrentlyStarred: boolean) => {
    setEmails(prevEmails => 
        prevEmails.map(email => 
            email.conversationId === conversationId ? { ...email, isStarred: !isCurrentlyStarred } : email
        )
    );
    addToast('Star updated.');
  }, [addToast]);

  const deleteConversation = useCallback(async (conversationIds: string[]) => {
    setEmails(prevEmails => {
        const emailsToTrash = prevEmails.filter(e => conversationIds.includes(e.conversationId) && e.folder !== Folder.TRASH);
        const emailsToDelete = prevEmails.filter(e => conversationIds.includes(e.conversationId) && e.folder === Folder.TRASH);
        const remainingEmails = prevEmails.filter(e => !conversationIds.includes(e.conversationId));

        const trashedEmails = emailsToTrash.map(e => ({...e, folder: Folder.TRASH}));
        return [...remainingEmails, ...trashedEmails];
    });

    addToast(`${conversationIds.length} conversation(s) moved to Trash.`);
    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [addToast, selectedConversationId, selectedConversationIds.size, deselectAllConversations]);

  const handleEscape = useCallback(() => {
    if (composeState.isOpen) closeCompose();
    else if (selectedConversationId) setSelectedConversationId(null);
    else if (searchQuery) setSearchQuery('');
    else if (focusedConversationId) setFocusedConversationId(null);
  }, [composeState.isOpen, selectedConversationId, searchQuery, focusedConversationId, closeCompose]);

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
      localStorage.setItem('isSidebarCollapsed', String(newState));
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

  const markConversationsAsRead = useCallback((conversationIds: string[], isRead: boolean) => {
    setEmails(prevEmails => 
        prevEmails.map(email => 
            conversationIds.includes(email.conversationId) ? { ...email, isRead } : email
        )
    );
  }, []);
  
  const bulkAction = useCallback(async (action: 'read' | 'unread' | 'delete') => {
    const ids = Array.from(selectedConversationIds);
    if (ids.length === 0) return;
    
    if (action === 'delete') {
      await deleteConversation(ids);
    } else {
      markConversationsAsRead(ids, action === 'read');
      addToast(`Marked ${ids.length} conversation(s) as ${action}.`);
    }
    deselectAllConversations();
  }, [selectedConversationIds, deleteConversation, deselectAllConversations, markConversationsAsRead, addToast]);

  const bulkDelete = useCallback(() => bulkAction('delete'), [bulkAction]);
  const bulkMarkAsRead = useCallback(() => bulkAction('read'), [bulkAction]);
  const bulkMarkAsUnread = useCallback(() => bulkAction('unread'), [bulkAction]);
  
  const markAsRead = useCallback(async (conversationId: string) => {
    markConversationsAsRead([conversationId], true);
  }, [markConversationsAsRead]);
  
  const markAsUnread = useCallback(async (conversationId: string) => {
    markConversationsAsRead([conversationId], false);
  }, [markConversationsAsRead]);

  const navigateConversationList = useCallback((direction: 'up' | 'down') => {
    if (displayedConversations.length === 0) return;
    const currentId = focusedConversationId || selectedConversationId;
    const index = displayedConversations.findIndex(c => c.id === currentId);
    let nextIndex = index + (direction === 'down' ? 1 : -1);
    nextIndex = Math.max(0, Math.min(displayedConversations.length - 1, nextIndex));
    if (nextIndex !== index || !currentId) {
      setFocusedConversationId(displayedConversations[nextIndex]?.id || null);
    }
  }, [displayedConversations, focusedConversationId, selectedConversationId]);
  
  const openFocusedConversation = useCallback(() => {
    if (focusedConversationId) {
        setSelectedConversationId(focusedConversationId);
        const conv = allConversations.find(c => c.id === focusedConversationId);
        if (conv && !conv.isRead) {
            markAsRead(focusedConversationId);
        }
    }
  }, [focusedConversationId, allConversations, markAsRead]);

  const createUserFolder = useCallback((name: string) => {
      const newFolder = { id: `folder-${Date.now()}`, name };
      setUserFolders(prev => [...prev, newFolder]);
      addToast(`Folder "${name}" created.`);
  }, [addToast]);

  const renameUserFolder = useCallback((id: string, newName: string) => {
      let oldName = '';
      setUserFolders(prev => prev.map(f => {
          if (f.id === id) {
              oldName = f.name;
              return { ...f, name: newName };
          }
          return f;
      }));
      setEmails(prev => prev.map(e => e.folder === oldName ? { ...e, folder: newName } : e));
      addToast(`Folder renamed to "${newName}".`);
  }, [addToast]);

  const deleteUserFolder = useCallback((id: string) => {
      let folderToDelete: UserFolder | undefined;
      setUserFolders(prev => {
          folderToDelete = prev.find(f => f.id === id);
          return prev.filter(f => f.id !== id);
      });
      if (folderToDelete) {
          setEmails(prev => prev.filter(e => e.folder !== folderToDelete?.name));
          addToast(`Folder "${folderToDelete.name}" deleted.`);
      }
  }, [addToast]);

  const markAsSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, Folder.SPAM);
  }, [moveConversations]);

  const markAsNotSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, Folder.INBOX);
  }, [moveConversations]);

  const addContact = useCallback((contactData: Omit<Contact, 'id'>) => {
    const newContact: Contact = { ...contactData, id: `contact-${Date.now()}` };
    setContacts(prev => [...prev, newContact].sort((a,b) => a.name.localeCompare(b.name)));
    addToast('Contact added.');
    setSelectedContactId(newContact.id);
  }, [addToast]);
  
  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c).sort((a,b) => a.name.localeCompare(b.name)));
    addToast('Contact updated.');
  }, [addToast]);

  const deleteContact = useCallback((contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    addToast('Contact deleted.');
    setSelectedContactId(null);
  }, [addToast]);

  const updateSignature = useCallback((signature: Signature) => {
      setAppSettings(prev => ({...prev, signature}));
      addToast('Signature settings updated.');
  }, [addToast]);

  const updateAutoResponder = useCallback((autoResponder: AutoResponder) => {
      setAppSettings(prev => ({...prev, autoResponder}));
      addToast('Auto-responder settings updated.');
  }, [addToast]);

  const addRule = useCallback((ruleData: Omit<Rule, 'id'>) => {
      const newRule = { ...ruleData, id: `rule-${Date.now()}`};
      setAppSettings(prev => ({...prev, rules: [...prev.rules, newRule]}));
      addToast("Rule added.");
  }, [addToast]);

  const deleteRule = useCallback((ruleId: string) => {
      setAppSettings(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== ruleId) }));
      addToast("Rule deleted.");
  }, [addToast]);

  const setViewCallback = useCallback((newView: View) => {
    setView(newView);
    setSelectedConversationId(null);
    setFocusedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
    setSelectedContactId(null);
  }, []);

  const contextValue: AppContextType = {
    user, emails, conversations: allConversations, userFolders, currentFolder, selectedConversationId, focusedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, isSidebarCollapsed, view, appSettings, contacts, selectedContactId, isLoading, loginError,
    login, logout, checkUserSession,
    setCurrentFolder: setCurrentFolderCallback, setSelectedConversationId, setSearchQuery,
    openCompose, closeCompose, sendEmail,
    toggleStar, deleteConversation, moveConversations, markAsRead, markAsUnread, markAsSpam, markAsNotSpam,
    toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread,
    toggleTheme, toggleSidebar, handleEscape, navigateConversationList, openFocusedConversation, setView: setViewCallback,
    updateSignature, updateAutoResponder, addRule, deleteRule,
    createUserFolder, renameUserFolder, deleteUserFolder,
    addContact, updateContact, deleteContact, setSelectedContactId,
  };

  return (
    <AppContext.Provider value={useMemo(() => contextValue, [contextValue])}>
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
