
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Email, ActionType, Label, Conversation, User, AppSettings, Signature, AutoResponder, Rule, SystemLabel, Contact, ContactGroup, SystemFolder, UserFolder } from '../types';
import { useToast } from './ToastContext';
import { mockLabels, mockContacts, mockEmails, mockUser, mockUserFolders, mockContactGroups } from '../data/mockData';


interface ComposeState {
  isOpen: boolean;
  isMinimized?: boolean;
  action?: ActionType;
  email?: Email;
  recipient?: string;
  bodyPrefix?: string;
  draftId?: string;
  conversationId?: string;
  initialData?: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      attachments: File[];
  }
}

type Theme = 'light' | 'dark';
type View = 'mail' | 'settings' | 'contacts';
type SelectionType = 'folder' | 'label';

interface AppContextType {
  // State
  user: User | null;
  emails: Email[];
  conversations: Conversation[];
  labels: Label[];
  userFolders: UserFolder[];
  currentSelection: { type: SelectionType, id: string };
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
  contactGroups: ContactGroup[];
  selectedContactId: string | null;
  selectedGroupId: string | null;
  isLoading: boolean;
  
  // Auth
  login: (email: string, pass: string) => void;
  logout: () => void;
  checkUserSession: () => void;
  
  // Mail Navigation
  setCurrentSelection: (type: SelectionType, id: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Compose
  openCompose: (config?: Partial<Omit<ComposeState, 'isOpen'>>) => void;
  closeCompose: () => void;
  toggleMinimizeCompose: () => void;
  sendEmail: (data: SendEmailData, draftId?: string) => void;
  saveDraft: (data: SendEmailData, draftId?: string) => string;
  deleteDraft: (draftId: string) => void;
  cancelSend: () => void;
  
  // Mail Actions
  moveConversations: (conversationIds: string[], targetFolderId: string) => void;
  toggleLabel: (conversationIds: string[], labelId: string) => void;
  applyLabel: (conversationIds: string[], labelId: string) => void;
  removeLabel: (conversationIds: string[], labelId: string) => void;
  deleteConversation: (conversationIds: string[]) => void;
  archiveConversation: (conversationIds: string[]) => void;
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
  updateSendDelay: (sendDelay: AppSettings['sendDelay']) => void;

  // Label Management
  createLabel: (name: string, color: string) => void;
  updateLabel: (id: string, updates: Partial<Omit<Label, 'id'>>) => void;
  deleteLabel: (id: string) => void;

  // Folder Management
  createFolder: (name: string) => void;
  updateFolder: (id: string, newName: string) => void;
  deleteFolder: (id: string) => void;

  // Contacts
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => void;
  setSelectedContactId: (id: string | null) => void;
  importContacts: (newContacts: Omit<Contact, 'id'>[]) => void;
  
  // Contact Groups
  createContactGroup: (name: string) => void;
  renameContactGroup: (groupId: string, newName: string) => void;
  deleteContactGroup: (groupId: string) => void;
  addContactToGroup: (groupId: string, contactId: string) => void;
  removeContactFromGroup: (groupId: string, contactId: string) => void;
  setSelectedGroupId: (id: string | null) => void;
}

interface SendEmailData {
  to: string; 
  cc?: string; 
  bcc?: string; 
  subject: string; 
  body: string; 
  attachments: File[]; 
  scheduleDate?: Date;
}

interface PendingSend {
    timerId: number;
    emailData: SendEmailData;
    draftId?: string;
    conversationId?: string;
}

const initialAppSettings: AppSettings = {
  signature: { isEnabled: false, body: '' },
  autoResponder: { isEnabled: false, subject: '', message: '' },
  rules: [],
  sendDelay: { isEnabled: true, duration: 5 },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const savedContacts = localStorage.getItem('contacts');
    return savedContacts ? JSON.parse(savedContacts) : mockContacts;
  });
   const [contactGroups, setContactGroups] = useState<ContactGroup[]>(() => {
    const savedGroups = localStorage.getItem('contactGroups');
    return savedGroups ? JSON.parse(savedGroups) : mockContactGroups;
  });
  const [currentSelection, setCurrentSelection] = useState<{type: SelectionType, id: string}>({type: 'folder', id: SystemFolder.INBOX});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false, isMinimized: false });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConversationIds, setSelectedConversationIds] = useState(new Set<string>());
  const { addToast } = useToast();
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
        return savedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('isSidebarCollapsed') === 'true');
  const [view, setView] = useState<View>('mail');
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            const mergedSettings = { ...initialAppSettings, ...parsedSettings };
            return mergedSettings;
        } catch (e) {
            console.error("Failed to parse appSettings from localStorage", e);
        }
      }
      return initialAppSettings;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);

  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(appSettings)); }, [appSettings]);
  useEffect(() => { localStorage.setItem('contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem('contactGroups', JSON.stringify(contactGroups)); }, [contactGroups]);

  const checkUserSession = useCallback(() => {
    setIsLoading(true);
    setUser(mockUser);
    setEmails(mockEmails);
    setLabels(mockLabels);
    setUserFolders(mockUserFolders);
    setCurrentSelection({type: 'folder', id: SystemFolder.INBOX});
    setTimeout(() => setIsLoading(false), 500);
  }, []);
  
  const login = useCallback((email: string, pass: string) => {
    setIsLoading(true);
    if (email && pass) {
        checkUserSession();
        addToast(`Welcome, ${mockUser.name}!`);
    } else {
        addToast('Please enter both email and password.');
        setIsLoading(false);
    }
  }, [checkUserSession, addToast]);

  const logout = useCallback(() => {
    setUser(null);
    setEmails([]);
    setLabels([]);
    setUserFolders([]);
    setCurrentSelection({type: 'folder', id: SystemFolder.INBOX});
    setSelectedConversationId(null);
    addToast('You have been logged out.');
  }, [addToast]);


  // --- Data Transformation ---
  const allConversations = useMemo<Conversation[]>(() => {
    if (emails.length === 0) return [];
    const grouped = emails.reduce((acc, email) => {
      const convId = email.conversationId || email.id;
      if (!acc[convId]) acc[convId] = [];
      acc[convId].push(email);
      return acc;
    }, {} as Record<string, Email[]>);

    return Object.entries(grouped)
      .map(([id, convEmails]) => {
        convEmails.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const lastEmail = convEmails[convEmails.length - 1];
        const participants = [...new Map(convEmails.map(e => [e.senderEmail, { name: e.senderEmail === user?.email ? 'Me' : e.senderName, email: e.senderEmail }])).values()];
        const allLabelIds = [...new Set(convEmails.flatMap(e => e.labelIds))];

        return {
          id,
          subject: lastEmail.subject || '(no subject)',
          emails: convEmails,
          participants,
          lastTimestamp: lastEmail.timestamp,
          isRead: convEmails.every(e => e.isRead),
          folderId: lastEmail.folderId,
          labelIds: allLabelIds,
          isSnoozed: false,
          hasAttachments: convEmails.some(e => e.attachments && e.attachments.length > 0)
        };
      })
      .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [emails, user]);


  const displayedConversations = useMemo(() => {
    let baseList = allConversations;
    
    if (currentSelection.type === 'folder') {
        baseList = allConversations.filter(c => c.folderId === currentSelection.id);
    } else if (currentSelection.type === 'label') {
        baseList = allConversations.filter(c => c.labelIds.includes(currentSelection.id) && c.folderId !== SystemFolder.SPAM && c.folderId !== SystemFolder.TRASH);
    }
    
    let filtered = baseList;
    
    if(searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        
        const filters: { type: string, value: string }[] = [];
        const filterRegex = /(from:|to:|subject:|is:|has:)([\w@.-]+)/g;
        
        const textSearch = lowerQuery.replace(filterRegex, '').trim();
        
        let match;
        while ((match = filterRegex.exec(lowerQuery)) !== null) {
            filters.push({ type: match[1].slice(0, -1), value: match[2] });
        }
        
        if (filters.length > 0) {
            filtered = filtered.filter(conv => {
                return filters.every(({ type, value }) => {
                    switch (type) {
                        case 'from':
                            return conv.participants.some(p => p.name.toLowerCase().includes(value) || p.email.toLowerCase().includes(value));
                        case 'to':
                            return conv.emails.some(email =>
                                (email.recipientEmail && email.recipientEmail.toLowerCase().includes(value)) ||
                                (email.cc && email.cc.toLowerCase().includes(value)) ||
                                (email.bcc && email.bcc.toLowerCase().includes(value))
                            );
                        case 'subject':
                            return conv.subject.toLowerCase().includes(value);
                        case 'is':
                            if (value === 'starred') return conv.labelIds.includes(SystemLabel.STARRED);
                            if (value === 'unread') return !conv.isRead;
                            return true;
                        case 'has':
                            return value === 'attachment' ? conv.hasAttachments : true;
                        default:
                            return true;
                    }
                });
            });
        }

        if (textSearch) {
            filtered = filtered.filter(conv => 
                conv.subject.toLowerCase().includes(textSearch) ||
                conv.participants.some(p => p.name.toLowerCase().includes(textSearch) || p.email.toLowerCase().includes(textSearch)) ||
                conv.emails.some(e => e.snippet.toLowerCase().includes(textSearch))
            );
        }
    }
    
    return filtered;

  }, [allConversations, currentSelection, searchQuery]);
  

  const setCurrentSelectionCallback = useCallback((type: SelectionType, id: string) => {
    setView('mail');
    setCurrentSelection({type, id});
    setSelectedConversationId(null);
    setFocusedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
  }, []);

  const openCompose = useCallback((config: Partial<Omit<ComposeState, 'isOpen'>> = {}) => {
    const draftId = (config.action === ActionType.DRAFT && config.email) ? config.email.id : undefined;
    const conversationId = config.email?.conversationId;
    setComposeState({ isOpen: true, isMinimized: false, draftId, conversationId, ...config });
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false, isMinimized: false }), []);
  const toggleMinimizeCompose = useCallback(() => setComposeState(prev => ({ ...prev, isMinimized: !prev.isMinimized })), []);
  const deselectAllConversations = useCallback(() => setSelectedConversationIds(new Set()), []);
  
  const moveConversations = useCallback((conversationIds: string[], targetFolderId: string) => {
     setEmails(prevEmails => {
        return prevEmails.map(email => {
            if (conversationIds.includes(email.conversationId)) {
                return { ...email, folderId: targetFolderId };
            }
            return email;
        });
    });
    const folderName = userFolders.find(f => f.id === targetFolderId)?.name || targetFolderId;
    addToast(`${conversationIds.length} conversation(s) moved to "${folderName}".`);
    deselectAllConversations();
    if (conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [addToast, userFolders, deselectAllConversations, selectedConversationId]);

  const applyLabel = useCallback((conversationIds: string[], labelId: string) => {
    setEmails(prevEmails => {
        return prevEmails.map(email => {
            if (conversationIds.includes(email.conversationId)) {
                const newLabelIds = [...new Set([...email.labelIds, labelId])];
                return { ...email, labelIds: newLabelIds };
            }
            return email;
        });
    });
    const labelName = labels.find(l => l.id === labelId)?.name || labelId;
    addToast(`Applied label "${labelName}" to ${conversationIds.length} conversation(s).`);
  }, [addToast, labels]);

  const removeLabel = useCallback((conversationIds: string[], labelId: string) => {
    setEmails(prevEmails => {
        return prevEmails.map(email => {
            if (conversationIds.includes(email.conversationId)) {
                return { ...email, labelIds: email.labelIds.filter(id => id !== labelId) };
            }
            return email;
        });
    });
  }, []);

  const toggleLabel = useCallback((conversationIds: string[], labelId: string) => {
     const firstConv = allConversations.find(c => c.id === conversationIds[0]);
     if (!firstConv) return;
     if (firstConv.labelIds.includes(labelId)) {
         removeLabel(conversationIds, labelId);
         addToast('Label removed.');
     } else {
         applyLabel(conversationIds, labelId);
     }
  }, [allConversations, applyLabel, removeLabel, addToast]);
  
  const archiveConversation = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, SystemFolder.ARCHIVE);
  }, [moveConversations]);

  const actuallySendEmail = useCallback((data: SendEmailData, draftId?: string, conversationId?: string) => {
      if (!user) return;
      
      const newEmail: Email = {
        id: `email-${Date.now()}`,
        conversationId: conversationId || `conv-${Date.now()}`,
        senderName: user.name,
        senderEmail: user.email,
        recipientEmail: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject || '(no subject)',
        body: data.body,
        snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
        timestamp: new Date().toISOString(),
        isRead: true,
        folderId: data.scheduleDate ? SystemFolder.SCHEDULED : SystemFolder.SENT,
        labelIds: [],
        attachments: data.attachments.map(f => ({fileName: f.name, fileSize: f.size})),
        scheduledSendTime: data.scheduleDate?.toISOString(),
      };

      setEmails(prev => [newEmail, ...prev.filter(e => e.id !== draftId)]);
      
      if (data.scheduleDate) {
          addToast('Message scheduled.');
      } else {
          addToast('Message sent.');
      }
      const targetFolder = data.scheduleDate ? SystemFolder.SCHEDULED : SystemFolder.SENT;
      if (currentSelection.id !== targetFolder) {
          setCurrentSelectionCallback('folder', targetFolder);
      }
  }, [user, addToast, setCurrentSelectionCallback, currentSelection]);

  const cancelSend = useCallback(() => {
    if (pendingSend) {
        clearTimeout(pendingSend.timerId);
        openCompose({ 
            initialData: pendingSend.emailData, 
            draftId: pendingSend.draftId,
            conversationId: pendingSend.conversationId,
        });
        setPendingSend(null);
        addToast('Sending cancelled.');
    }
  }, [pendingSend, openCompose, addToast]);

  const sendEmail = useCallback((data: SendEmailData, draftId?: string) => {
    const convId = composeState.conversationId;
    closeCompose();

    if (data.scheduleDate) {
      actuallySendEmail(data, draftId, convId);
      return;
    }
    
    if (appSettings.sendDelay.isEnabled && appSettings.sendDelay.duration > 0) {
      if (pendingSend?.timerId) clearTimeout(pendingSend.timerId);
      
      const timerId = setTimeout(() => {
        actuallySendEmail(data, draftId, convId);
        setPendingSend(null);
      }, appSettings.sendDelay.duration * 1000);
      
      setPendingSend({ timerId: timerId as unknown as number, emailData: data, draftId, conversationId: convId });
      
      addToast('Sending...', {
        duration: appSettings.sendDelay.duration * 1000,
        action: { label: 'Undo', onClick: cancelSend }
      });
    } else {
      actuallySendEmail(data, draftId, convId);
    }
  }, [closeCompose, actuallySendEmail, appSettings.sendDelay, pendingSend, addToast, cancelSend, composeState.conversationId]);
  
  const saveDraft = useCallback((data: SendEmailData, draftId?: string) => {
      if (!user) return '';
      const conversationId = composeState.conversationId || `conv-${Date.now()}`;
      let newDraftId = draftId;

      if (draftId) {
          setEmails(prev => prev.map(e => e.id === draftId ? {
              ...e,
              recipientEmail: data.to,
              cc: data.cc,
              bcc: data.bcc,
              subject: data.subject || '(no subject)',
              body: data.body,
              snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
              timestamp: new Date().toISOString(),
              attachments: data.attachments.map(f => ({ fileName: f.name, fileSize: f.size })),
          } : e));
          addToast('Draft updated.');
      } else {
          newDraftId = `email-${Date.now()}`;
          const newDraft: Email = {
              id: newDraftId,
              conversationId: conversationId,
              senderName: user.name,
              senderEmail: user.email,
              recipientEmail: data.to,
              cc: data.cc,
              bcc: data.bcc,
              subject: data.subject || '(no subject)',
              body: data.body,
              snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
              timestamp: new Date().toISOString(),
              isRead: true,
              folderId: SystemFolder.DRAFTS,
              labelIds: [],
              attachments: data.attachments.map(f => ({ fileName: f.name, fileSize: f.size })),
          };
          setEmails(prev => [newDraft, ...prev]);
          addToast('Draft saved.');
      }
      if (currentSelection.id !== SystemFolder.DRAFTS) {
        setCurrentSelectionCallback('folder', SystemFolder.DRAFTS);
      }
      return newDraftId || '';
  }, [user, addToast, composeState.conversationId, currentSelection, setCurrentSelectionCallback]);

  const deleteDraft = useCallback((draftId: string) => {
    setEmails(prev => prev.filter(email => email.id !== draftId));
    addToast('Draft discarded.');
  }, [addToast]);

  const deleteConversation = useCallback((conversationIds: string[]) => {
    const convsToDelete = allConversations.filter(c => conversationIds.includes(c.id));
    const isPermanentDelete = convsToDelete.every(c => c.folderId === SystemFolder.TRASH);

    if (isPermanentDelete) {
        const emailIdsToDelete = convsToDelete.flatMap(c => c.emails.map(e => e.id));
        setEmails(prev => prev.filter(e => !emailIdsToDelete.includes(e.id)));
        addToast(`${conversationIds.length} conversation(s) permanently deleted.`);
    } else {
        moveConversations(conversationIds, SystemFolder.TRASH);
        // Also strip labels when moving to trash
        setEmails(prevEmails => prevEmails.map(email => 
            conversationIds.includes(email.conversationId) ? { ...email, labelIds: [] } : email
        ));
    }

    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [allConversations, moveConversations, addToast, selectedConversationId, selectedConversationIds, deselectAllConversations]);

  const handleEscape = useCallback(() => {
    if (composeState.isOpen) return;
    if (selectedConversationId) setSelectedConversationId(null);
    else if (searchQuery) setSearchQuery('');
    else if (focusedConversationId) setFocusedConversationId(null);
  }, [composeState.isOpen, selectedConversationId, searchQuery, focusedConversationId]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  const toggleSidebar = useCallback(() => { setIsSidebarCollapsed(prev => { const newState = !prev; localStorage.setItem('isSidebarCollapsed', String(newState)); return newState; }); }, []);
  const toggleConversationSelection = useCallback((conversationId: string) => { setSelectedConversationIds(prev => { const newSet = new Set(prev); if (newSet.has(conversationId)) newSet.delete(conversationId); else newSet.add(conversationId); return newSet; }); }, []);
  const selectAllConversations = useCallback((conversationIds: string[]) => { setSelectedConversationIds(new Set(conversationIds)); }, []);
  const markConversationsAsRead = useCallback((conversationIds: string[], isRead: boolean) => { setEmails(prevEmails => prevEmails.map(email => conversationIds.includes(email.conversationId) ? { ...email, isRead } : email )); }, []);
  
  const bulkAction = useCallback((action: 'read' | 'unread' | 'delete') => {
    const ids = Array.from(selectedConversationIds);
    if (ids.length === 0) return;
    if (action === 'delete') deleteConversation(ids);
    else { markConversationsAsRead(ids, action === 'read'); addToast(`Marked ${ids.length} conversation(s) as ${action}.`); }
    deselectAllConversations();
  }, [selectedConversationIds, deleteConversation, deselectAllConversations, markConversationsAsRead, addToast]);

  const bulkDelete = useCallback(() => bulkAction('delete'), [bulkAction]);
  const bulkMarkAsRead = useCallback(() => bulkAction('read'), [bulkAction]);
  const bulkMarkAsUnread = useCallback(() => bulkAction('unread'), [bulkAction]);
  const markAsRead = useCallback((conversationId: string) => { markConversationsAsRead([conversationId], true); }, [markConversationsAsRead]);
  const markAsUnread = useCallback((conversationId: string) => { markConversationsAsRead([conversationId], false); }, [markConversationsAsRead]);

  const navigateConversationList = useCallback((direction: 'up' | 'down') => {
    if (displayedConversations.length === 0) return;
    const currentId = focusedConversationId || selectedConversationId;
    const index = displayedConversations.findIndex(c => c.id === currentId);
    let nextIndex = index + (direction === 'down' ? 1 : -1);
    nextIndex = Math.max(0, Math.min(displayedConversations.length - 1, nextIndex));
    if (nextIndex !== index || !currentId) setFocusedConversationId(displayedConversations[nextIndex]?.id || null);
  }, [displayedConversations, focusedConversationId, selectedConversationId]);
  
  const openFocusedConversation = useCallback(() => {
    if (focusedConversationId) {
        setSelectedConversationId(focusedConversationId);
        const conv = allConversations.find(c => c.id === focusedConversationId);
        if (conv && !conv.isRead) markAsRead(focusedConversationId);
    }
  }, [focusedConversationId, allConversations, markAsRead]);

  const createLabel = useCallback((name: string, color: string) => {
      const newLabel = { id: `label-${Date.now()}`, name, color };
      setLabels(prev => [...prev, newLabel]);
      addToast(`Label "${name}" created.`);
  }, [addToast]);

  const updateLabel = useCallback((id: string, updates: Partial<Omit<Label, 'id'>>) => {
      setLabels(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
      addToast(`Label updated.`);
  }, [addToast]);

  const deleteLabel = useCallback((id: string) => {
      let labelToDelete: Label | undefined;
      setLabels(prev => {
          labelToDelete = prev.find(l => l.id === id);
          return prev.filter(l => l.id !== id);
      });
      if (labelToDelete) {
          setEmails(prev => prev.map(e => ({ ...e, labelIds: e.labelIds.filter(lid => lid !== id) })));
          addToast(`Label "${labelToDelete.name}" deleted.`);
      }
  }, [addToast]);
  
  const createFolder = useCallback((name: string) => {
      const newFolder = { id: `folder-${Date.now()}`, name };
      setUserFolders(prev => [...prev, newFolder]);
      addToast(`Folder "${name}" created.`);
  }, [addToast]);

  const updateFolder = useCallback((id: string, newName: string) => {
      setUserFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      addToast(`Folder renamed.`);
  }, [addToast]);

  const deleteFolder = useCallback((id: string) => {
      let folderToDelete: UserFolder | undefined;
      setUserFolders(prev => {
          folderToDelete = prev.find(f => f.id === id);
          return prev.filter(f => f.id !== id);
      });
      if (folderToDelete) {
          // Move emails from the deleted folder to the Archive
          setEmails(prev => prev.map(e => e.folderId === id ? { ...e, folderId: SystemFolder.ARCHIVE } : e));
          addToast(`Folder "${folderToDelete.name}" deleted. Its contents were moved to Archive.`);
      }
  }, [addToast]);

  const markAsSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, SystemFolder.SPAM);
  }, [moveConversations]);

  const markAsNotSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, SystemFolder.INBOX);
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
    setContactGroups(prev => prev.map(g => ({ ...g, contactIds: g.contactIds.filter(id => id !== contactId) })));
    addToast('Contact deleted.');
    setSelectedContactId(null);
  }, [addToast]);
  
  const importContacts = useCallback((newContacts: Omit<Contact, 'id'>[]) => {
    let importedCount = 0, skippedCount = 0;
    setContacts(prev => {
        const existingEmails = new Set(prev.map(c => c.email.toLowerCase()));
        const contactsToAdd: Contact[] = [];
        newContacts.forEach((newContact, index) => {
            if (newContact.email && !existingEmails.has(newContact.email.toLowerCase())) {
                contactsToAdd.push({ ...newContact, id: `contact-${Date.now()}-${index}` });
                existingEmails.add(newContact.email.toLowerCase());
                importedCount++;
            } else {
                skippedCount++;
            }
        });
        return contactsToAdd.length > 0 ? [...prev, ...contactsToAdd].sort((a,b) => a.name.localeCompare(b.name)) : prev;
    });
    let toastMessage = '';
    if (importedCount > 0) toastMessage += `Imported ${importedCount} new contact(s). `;
    if (skippedCount > 0) toastMessage += `Skipped ${skippedCount} duplicate(s).`;
    addToast(toastMessage || 'No new contacts to import.');
  }, [addToast]);
  
  const createContactGroup = useCallback((name: string) => {
      const newGroup: ContactGroup = { id: `group-${Date.now()}`, name, contactIds: [] };
      setContactGroups(prev => [...prev, newGroup].sort((a,b) => a.name.localeCompare(b.name)));
      addToast(`Group "${name}" created.`);
  }, [addToast]);
  
  const renameContactGroup = useCallback((groupId: string, newName: string) => {
      setContactGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g).sort((a,b) => a.name.localeCompare(b.name)));
      addToast('Group renamed.');
  }, [addToast]);
  
  const deleteContactGroup = useCallback((groupId: string) => {
      setContactGroups(prev => prev.filter(g => g.id !== groupId));
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      addToast('Group deleted.');
  }, [addToast, selectedGroupId]);
  
  const addContactToGroup = useCallback((groupId: string, contactId: string) => {
      setContactGroups(prev => prev.map(g => (g.id === groupId && !g.contactIds.includes(contactId)) ? { ...g, contactIds: [...g.contactIds, contactId] } : g));
      const groupName = contactGroups.find(g => g.id === groupId)?.name;
      const contactName = contacts.find(c => c.id === contactId)?.name;
      if(groupName && contactName) addToast(`${contactName} added to ${groupName}.`);
  }, [addToast, contactGroups, contacts]);
  
  const removeContactFromGroup = useCallback((groupId: string, contactId: string) => { setContactGroups(prev => prev.map(g => g.id === groupId ? { ...g, contactIds: g.contactIds.filter(id => id !== contactId) } : g)); }, []);

  const updateSignature = useCallback((signature: Signature) => { setAppSettings(prev => ({...prev, signature})); addToast('Signature settings updated.'); }, [addToast]);
  const updateAutoResponder = useCallback((autoResponder: AutoResponder) => { setAppSettings(prev => ({...prev, autoResponder})); addToast('Auto-responder settings updated.'); }, [addToast]);
  const addRule = useCallback((ruleData: Omit<Rule, 'id'>) => { const newRule = { ...ruleData, id: `rule-${Date.now()}`}; setAppSettings(prev => ({...prev, rules: [...prev.rules, newRule]})); addToast("Rule added."); }, [addToast]);
  const deleteRule = useCallback((ruleId: string) => { setAppSettings(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== ruleId) })); addToast("Rule deleted."); }, [addToast]);
  const updateSendDelay = useCallback((sendDelay: AppSettings['sendDelay']) => { setAppSettings(prev => ({ ...prev, sendDelay })); addToast("Send delay settings updated."); }, [addToast]);
  const setViewCallback = useCallback((newView: View) => { setView(newView); setSelectedConversationId(null); setFocusedConversationId(null); setSearchQuery(''); setSelectedConversationIds(new Set()); setSelectedContactId(null); }, []);

  const contextValue: AppContextType = {
    user, emails, conversations: allConversations, labels, userFolders, currentSelection, selectedConversationId, focusedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, isSidebarCollapsed, view, appSettings, contacts, contactGroups, selectedContactId, selectedGroupId, isLoading,
    login, logout, checkUserSession,
    setCurrentSelection: setCurrentSelectionCallback, setSelectedConversationId, setSearchQuery,
    openCompose, closeCompose, toggleMinimizeCompose, sendEmail, cancelSend, saveDraft, deleteDraft,
    moveConversations,
    toggleLabel, applyLabel, removeLabel, deleteConversation, archiveConversation, markAsRead, markAsUnread, markAsSpam, markAsNotSpam,
    toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread,
    toggleTheme, toggleSidebar, handleEscape, navigateConversationList, openFocusedConversation, setView: setViewCallback,
    updateSignature, updateAutoResponder, addRule, deleteRule, updateSendDelay,
    createLabel, updateLabel, deleteLabel,
    createFolder, updateFolder, deleteFolder,
    addContact, updateContact, deleteContact, setSelectedContactId, importContacts,
    createContactGroup, renameContactGroup, deleteContactGroup, addContactToGroup, removeContactFromGroup, setSelectedGroupId,
  };

  return <AppContext.Provider value={useMemo(() => contextValue, [contextValue])}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppContextProvider');
  return context;
};
