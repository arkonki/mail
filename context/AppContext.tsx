
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { Email, ActionType, UserFolder, Conversation, User, AppSettings, Signature, AutoResponder, Rule, Folder, Contact } from '../types';
import { useToast } from './ToastContext';
import { mockContacts } from '../data/mockData';


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

  // --- API Abstractions ---
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (response.status === 401) {
      setUser(null); // Session expired or invalid
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'An API error occurred');
    }
    return response;
  }, []);

  const fetchEmails = useCallback(async (folder: string) => {
      try {
          const response = await apiFetch(`/api/emails/${encodeURIComponent(folder)}`);
          const data: Email[] = await response.json();
          setEmails(data);
      } catch (error) {
          console.error(`Failed to fetch emails for ${folder}`, error);
          addToast(`Error loading emails from ${folder}.`);
          setEmails([]);
      }
  }, [apiFetch, addToast]);

  const fetchFolders = useCallback(async () => {
    try {
        const response = await apiFetch('/api/mailboxes');
        const data: UserFolder[] = await response.json();
        const systemFolderNames = Object.values(Folder);
        // Exclude system folders from user folders list if they exist
        const filteredUserFolders = data.filter(f => !systemFolderNames.includes(f.name as Folder));
        setUserFolders(filteredUserFolders);
    } catch(error) {
        console.error("Failed to fetch folders", error);
        addToast("Error loading folders.");
    }
  }, [apiFetch, addToast]);

  const checkUserSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/me');
      const userData = await response.json();
      setUser(userData);
      await fetchFolders();
      await fetchEmails(Folder.INBOX);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, fetchFolders, fetchEmails]);
  
  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      await checkUserSession();
    } catch (error: any) {
      console.error('Login failed:', error);
      setLoginError(error.message);
      setUser(null);
      setIsLoading(false);
    }
  }, [apiFetch, checkUserSession]);

  const logout = useCallback(async () => {
      try {
        await apiFetch('/api/logout', { method: 'POST' });
      } catch (error) {
        console.error("Logout failed on server:", error);
      } finally {
        setUser(null);
        setEmails([]);
        setUserFolders([]);
        setCurrentFolder(Folder.INBOX);
        setSelectedConversationId(null);
        setLoginError(null);
        addToast('You have been logged out.');
      }
  }, [apiFetch, addToast]);


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
        const participants = [...new Map(convEmails.map(e => [e.senderEmail, { name: e.senderName, email: e.senderEmail }])).values()];

        return {
          id,
          subject: lastEmail.subject || '(no subject)',
          emails: convEmails,
          participants,
          lastTimestamp: lastEmail.timestamp,
          isRead: convEmails.every(e => e.isRead),
          isStarred: convEmails.some(e => e.isStarred),
          isSnoozed: false, // Snooze not implemented with live backend
          folder: lastEmail.folder,
          hasAttachments: convEmails.some(e => e.attachments && e.attachments.length > 0)
        };
      })
      .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [emails]);


  const displayedConversations = useMemo(() => {
    let filteredConversations = allConversations;
    // Search takes precedence
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
  
  const performMailAction = useCallback(async (endpoint: string, payload: object, successMessage: string) => {
    try {
        await apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        addToast(successMessage);
        await fetchEmails(currentFolder);
    } catch (error: any) {
        console.error(`Action failed at ${endpoint}:`, error);
        addToast(`Error: ${error.message}`, { duration: 5000 });
    }
  }, [apiFetch, addToast, currentFolder, fetchEmails]);
  
  const getActionsPayloadForConversations = useCallback((conversationIds: string[]) => {
      const emailsForConvs = emails.filter(e => conversationIds.includes(e.conversationId));
      const uidsByMailbox = emailsForConvs.reduce((acc, email) => {
        if (!acc[email.folder]) acc[email.folder] = [];
        acc[email.folder].push(Number(email.id));
        return acc;
      }, {} as Record<string, number[]>);
      return Object.entries(uidsByMailbox).map(([mailbox, uids]) => ({ mailbox, uids }));
  }, [emails]);


  // --- Context Functions ---

  const setCurrentFolderCallback = useCallback((folder: string) => {
    setView('mail');
    setCurrentFolder(folder);
    fetchEmails(folder);
    setSelectedConversationId(null);
    setFocusedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
  }, [fetchEmails]);

  const openCompose = useCallback((config: { action?: ActionType; email?: Email; recipient?: string; bodyPrefix?: string; } = {}) => {
    setComposeState({ isOpen: true, ...config });
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false }), []);
  
  const deselectAllConversations = useCallback(() => setSelectedConversationIds(new Set()), []);
  
  const moveConversations = useCallback(async (conversationIds: string[], targetFolder: string) => {
    const actions = getActionsPayloadForConversations(conversationIds);
    if (actions.length === 0) return;
    
    await performMailAction('/api/actions/move', { actions, targetFolder }, `Moved ${conversationIds.length} conversation(s) to ${targetFolder}.`);
    
    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [getActionsPayloadForConversations, performMailAction, selectedConversationId, selectedConversationIds, deselectAllConversations]);

  const sendEmail = useCallback(async (data: { to: string; subject: string; body: string; attachments: File[] }) => {
    await performMailAction('/api/send', data, 'Message sent.');
    // Optionally, switch to and refresh 'Sent' folder
    if (currentFolder !== Folder.SENT) {
        // This is a UX decision. For now, we just refresh the current folder.
        // A more advanced implementation might fetch sent items in the background.
    }
  }, [performMailAction, currentFolder]);
  
  const toggleStar = useCallback(async (conversationId: string, isCurrentlyStarred: boolean) => {
    const actions = getActionsPayloadForConversations([conversationId]);
    if (actions.length === 0) return;
    await performMailAction('/api/actions/star', { actions, isStarred: !isCurrentlyStarred }, 'Star updated.');
  }, [getActionsPayloadForConversations, performMailAction]);

  const deleteConversation = useCallback(async (conversationIds: string[]) => {
    const actions = getActionsPayloadForConversations(conversationIds);
    if (actions.length === 0) return;

    await performMailAction('/api/actions/delete', { actions }, `${conversationIds.length} conversation(s) moved to Trash.`);
    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [getActionsPayloadForConversations, performMailAction, selectedConversationId, selectedConversationIds, deselectAllConversations]);

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
  
  const bulkAction = useCallback(async (action: 'read' | 'unread' | 'delete') => {
    const ids = Array.from(selectedConversationIds);
    if (ids.length === 0) return;
    
    if (action === 'delete') {
      await deleteConversation(ids);
    } else {
      const endpoint = action === 'read' ? '/api/actions/mark-as-read' : '/api/actions/mark-as-unread';
      const actions = getActionsPayloadForConversations(ids);
      await performMailAction(endpoint, { actions }, `Marked ${ids.length} conversation(s) as ${action}.`);
    }
    deselectAllConversations();
  }, [selectedConversationIds, deleteConversation, deselectAllConversations, getActionsPayloadForConversations, performMailAction]);

  const bulkDelete = useCallback(() => bulkAction('delete'), [bulkAction]);
  const bulkMarkAsRead = useCallback(() => bulkAction('read'), [bulkAction]);
  const bulkMarkAsUnread = useCallback(() => bulkAction('unread'), [bulkAction]);
  
  const markAsRead = useCallback(async (conversationId: string) => {
    const actions = getActionsPayloadForConversations([conversationId]);
    // No toast message for this common action
    await performMailAction('/api/actions/mark-as-read', { actions }, '');
  }, [getActionsPayloadForConversations, performMailAction]);

  const navigateConversationList = useCallback((direction: 'up' | 'down') => {
    if (displayedConversations.length === 0) return;
    const currentId = focusedConversationId || selectedConversationId;
    const index = displayedConversations.findIndex(c => c.id === currentId);
    let nextIndex = index + (direction === 'down' ? 1 : -1);
    nextIndex = Math.max(0, Math.min(displayedConversations.length - 1, nextIndex));
    if (nextIndex !== index) {
      setFocusedConversationId(displayedConversations[nextIndex].id);
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

  const createUserFolder = useCallback((name: string) => addToast("Folder creation not implemented."), [addToast]);
  const renameUserFolder = useCallback((id: string, newName: string) => addToast("Folder rename not implemented."), [addToast]);
  const deleteUserFolder = useCallback((id: string) => addToast("Folder deletion not implemented."), [addToast]);

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

  const updateSignature = useCallback((signature: Signature) => setAppSettings(prev => ({...prev, signature})), []);
  const updateAutoResponder = useCallback((autoResponder: AutoResponder) => setAppSettings(prev => ({...prev, autoResponder})), []);
  const addRule = useCallback((rule: Omit<Rule, 'id'>) => { addToast("Rules not implemented on backend."); }, [addToast]);
  const deleteRule = useCallback((ruleId: string) => { addToast("Rules not implemented on backend."); }, [addToast]);

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
    toggleStar, deleteConversation, moveConversations, markAsRead, markAsSpam, markAsNotSpam,
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
