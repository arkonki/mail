
import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Email, ActionType, UserFolder, Conversation, User, AppSettings, Signature, AutoResponder, Rule, Folder, Attachment, Contact } from '../types';
import { useToast } from './ToastContext';
import { mockEmails } from '../data/mockData';
import { mockUserFolders } from '../data/mockData';
import { mockContacts } from '../data/mockData';


interface ComposeState {
  isOpen: boolean;
  action?: ActionType;
  email?: Email;
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

const MOCK_USER: User = {
    email: 'you@example.com',
    name: 'You',
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
  isSidebarOpen: boolean;
  user: User | null;
  view: View;
  appSettings: AppSettings;
  contacts: Contact[];
  setCurrentFolder: (folder: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  openCompose: (action?: ActionType, email?: Email) => void;
  closeCompose: () => void;
  toggleStar: (conversationId: string, emailId?: string) => void;
  sendEmail: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => void;
  saveDraft: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => Promise<string | undefined>;
  deleteConversation: (conversationIds: string[]) => void;
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
  summarizeConversation: (conversationId: string) => Promise<string | null>;
  scheduleEmail: (data: { to: string; subject: string; body: string; attachments: File[], scheduledTime: Date }, draftId?: string, conversationId?: string) => void;
  simulateNewEmail: () => void;
  createUserFolder: (name: string) => void;
  renameUserFolder: (id: string, newName: string) => void;
  deleteUserFolder: (id: string) => void;
  markAsSpam: (conversationIds: string[]) => void;
  markAsNotSpam: (conversationIds: string[]) => void;
  snoozeConversation: (conversationIds: string[], snoozeUntil: Date) => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [emails, setEmails] = useState<Email[]>(() => {
    const savedEmails = localStorage.getItem('emails');
    return savedEmails ? JSON.parse(savedEmails) : mockEmails;
  });
  const [userFolders, setUserFolders] = useState<UserFolder[]>(() => {
    const savedFolders = localStorage.getItem('userFolders');
    return savedFolders ? JSON.parse(savedFolders) : mockUserFolders;
  });
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const savedContacts = localStorage.getItem('contacts');
    return savedContacts ? JSON.parse(savedContacts) : mockContacts;
  });
  const [currentFolder, setCurrentFolder] = useState<string>(Folder.INBOX);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConversationIds, setSelectedConversationIds] = useState(new Set<string>());
  const { addToast } = useToast();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => localStorage.getItem('isSidebarOpen') !== 'false');
  const [view, setView] = useState<View>('mail');
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      const savedSettings = localStorage.getItem('appSettings');
      return savedSettings ? JSON.parse(savedSettings) : initialAppSettings;
  });

  const pendingSendTimer = useRef<NodeJS.Timeout | null>(null);
  const scheduledTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Persist state to localStorage
  useEffect(() => { localStorage.setItem('emails', JSON.stringify(emails)); }, [emails]);
  useEffect(() => { localStorage.setItem('userFolders', JSON.stringify(userFolders)); }, [userFolders]);
  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(appSettings)); }, [appSettings]);
  useEffect(() => { localStorage.setItem('contacts', JSON.stringify(contacts)); }, [contacts]);

  const allConversations = useMemo<Conversation[]>(() => {
    const grouped = emails.reduce((acc, email) => {
      if (!acc[email.conversationId]) {
        acc[email.conversationId] = [];
      }
      acc[email.conversationId].push(email);
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
          isSnoozed: convEmails.some(e => !!e.snoozedUntil && new Date(e.snoozedUntil) > new Date()),
          folder: lastEmail.folder,
          hasAttachments: convEmails.some(e => e.attachments && e.attachments.length > 0)
        };
      })
      .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [emails]);


  const displayedConversations = useMemo(() => {
    let filteredConversations = allConversations;

    if (searchQuery.length > 0) {
        const lowercasedQuery = searchQuery.toLowerCase();
        const tokens = lowercasedQuery.split(/\s+/);

        const operators: { [key: string]: string } = {};
        const terms: string[] = [];

        tokens.forEach(token => {
            const parts = token.split(':');
            const key = parts[0];
            const value = parts.slice(1).join(':');

            if (['is', 'has', 'from', 'to', 'subject'].includes(key) && value) {
                operators[key] = value;
            } else {
                terms.push(token);
            }
        });

        filteredConversations = filteredConversations.filter(conv => {
            if (operators.is) {
                if (operators.is === 'unread' && conv.isRead) return false;
                if (operators.is === 'read' && !conv.isRead) return false;
                if (operators.is === 'starred' && !conv.isStarred) return false;
                if (operators.is === 'snoozed' && !conv.isSnoozed) return false;
                if (operators.is === 'spam' && conv.folder !== Folder.SPAM) return false;
            }
            if (operators.has && operators.has === 'attachment' && !conv.hasAttachments) return false;
            if (operators.from && !conv.participants.some(p => p.name.toLowerCase().includes(operators.from) || p.email.toLowerCase().includes(operators.from))) return false;
            if (operators.to && !conv.emails.some(e => e.recipientEmail.toLowerCase().includes(operators.to))) return false;
            if (operators.subject && !conv.subject.toLowerCase().includes(operators.subject)) return false;

            if(terms.length > 0) {
              const searchTerm = terms.join(' ');
              return conv.subject.toLowerCase().includes(searchTerm) ||
                conv.participants.some(p => p.name.toLowerCase().includes(searchTerm) || p.email.toLowerCase().includes(searchTerm)) ||
                conv.emails.some(e => e.snippet.toLowerCase().includes(searchTerm));
            }
            return true;
        });
    } else {
      if (currentFolder === Folder.STARRED) {
        filteredConversations = allConversations.filter(c => c.isStarred && c.folder !== Folder.TRASH && c.folder !== Folder.SPAM);
      } else if (currentFolder === Folder.SNOOZED) {
        filteredConversations = allConversations.filter(c => c.isSnoozed);
      } else {
        filteredConversations = allConversations.filter(c => c.folder === currentFolder && !c.isSnoozed);
      }
    }
    return filteredConversations;
  }, [allConversations, currentFolder, searchQuery]);

  const setCurrentFolderCallback = useCallback((folder: string) => {
    setView('mail');
    setCurrentFolder(folder);
    setSelectedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
  }, []);

  const openCompose = useCallback((action?: ActionType, email?: Email) => {
    setComposeState({
      isOpen: true,
      action,
      email,
      draftId: email?.folder === Folder.DRAFTS ? email.id : undefined,
      conversationId: email?.conversationId
    });
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false }), []);
  
  const moveEmails = useCallback((emailIds: string[], targetFolder: string) => {
    setEmails(prevEmails => {
      // Cancel any timers for emails being moved
      emailIds.forEach(id => {
          if(scheduledTimers.current.has(id)) {
              clearTimeout(scheduledTimers.current.get(id)!);
              scheduledTimers.current.delete(id);
          }
      });
      return prevEmails.map(e => emailIds.includes(e.id) ? { ...e, folder: targetFolder, snoozedUntil: undefined } : e);
    });
  }, []);

  const deselectAllConversations = useCallback(() => {
    setSelectedConversationIds(new Set());
  }, []);
  
  const moveConversations = useCallback((conversationIds: string[], targetFolder: string) => {
    const emailIdsToMove = emails.filter(e => conversationIds.includes(e.conversationId)).map(e => e.id);
    moveEmails(emailIdsToMove, targetFolder);
    addToast(`Moved ${conversationIds.length} conversation(s) to ${targetFolder}.`);
    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [emails, addToast, moveEmails, selectedConversationId, selectedConversationIds, deselectAllConversations]);

  const sendEmail = useCallback((data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => {
    if (pendingSendTimer.current) {
        clearTimeout(pendingSendTimer.current);
    }

    const performSend = () => {
        setEmails(prevEmails => {
            const newEmail: Email = {
                id: `email-${Date.now()}`,
                conversationId: conversationId || `conv-${Date.now()}`,
                senderName: MOCK_USER.name,
                senderEmail: MOCK_USER.email,
                recipientEmail: data.to,
                subject: data.subject || '(no subject)',
                body: data.body, // Signature is added in compose modal now
                snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
                timestamp: new Date().toISOString(),
                isRead: true,
                isStarred: false,
                folder: Folder.SENT,
                attachments: data.attachments.map(f => ({ fileName: f.name, fileSize: f.size }))
            };
            return draftId ? [...prevEmails.filter(e => e.id !== draftId), newEmail] : [...prevEmails, newEmail];
        });
        addToast('Message sent.');
    };
    
    addToast('Message sent.', {
        duration: 5000,
        action: { label: 'Undo', onClick: () => {
             if (pendingSendTimer.current) {
                clearTimeout(pendingSendTimer.current);
                pendingSendTimer.current = null;
                const draftToReopen = emails.find(e => e.id === draftId);
                const fallbackEmail = {
                    ...data,
                    attachments: data.attachments.map(f => ({ fileName: f.name, fileSize: f.size })),
                };
                 
                openCompose(
                    draftId ? ActionType.DRAFT : undefined,
                    { ...(draftToReopen || fallbackEmail), id: draftId || '', conversationId: conversationId || '', senderName: MOCK_USER.name, senderEmail: MOCK_USER.email, recipientEmail: data.to, snippet: '', timestamp: '', isRead: true, isStarred: false, folder: Folder.DRAFTS }
                );
                addToast('Send undone.');
            }
        }}
    });

    pendingSendTimer.current = setTimeout(performSend, 5000);
  }, [addToast, emails, openCompose]);
  
  const scheduleEmail = useCallback((data: { to: string; subject: string; body: string; attachments: File[], scheduledTime: Date }, draftId?: string, conversationId?: string) => {
    const newEmail: Email = {
      id: draftId || `email-${Date.now()}`,
      conversationId: conversationId || `conv-${Date.now()}`,
      senderName: MOCK_USER.name,
      senderEmail: MOCK_USER.email,
      recipientEmail: data.to,
      subject: data.subject || '(no subject)',
      body: data.body,
      snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
      timestamp: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      folder: Folder.SCHEDULED,
      attachments: data.attachments.map(f => ({ fileName: f.name, fileSize: f.size })),
      scheduledSendTime: data.scheduledTime.toISOString(),
    };

    setEmails(prev => {
        const otherEmails = prev.filter(e => e.id !== newEmail.id);
        return [...otherEmails, newEmail];
    });

    const delay = data.scheduledTime.getTime() - new Date().getTime();
    if (delay > 0) {
        const timerId = setTimeout(() => {
            moveEmails([newEmail.id], Folder.SENT);
            addToast(`Email to ${data.to} sent.`);
            scheduledTimers.current.delete(newEmail.id);
        }, delay);
        scheduledTimers.current.set(newEmail.id, timerId);
    }
    
    addToast(`Email scheduled for ${data.scheduledTime.toLocaleString()}`);
  }, [moveEmails, addToast]);

  const saveDraft = useCallback(async (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string): Promise<string | undefined> => {
    return new Promise(resolve => {
        let newDraftId = draftId || `email-${Date.now()}`;
        const newDraft: Email = {
            id: newDraftId,
            conversationId: conversationId || `conv-${Date.now()}`,
            senderName: MOCK_USER.name,
            senderEmail: MOCK_USER.email,
            recipientEmail: data.to,
            subject: data.subject || '(no subject)',
            body: data.body,
            snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100),
            timestamp: new Date().toISOString(),
            isRead: true,
            isStarred: false,
            folder: Folder.DRAFTS,
            attachments: data.attachments.map(f => ({ fileName: f.name, fileSize: f.size })),
        };
        setEmails(prev => {
            const otherEmails = prev.filter(e => e.id !== newDraftId);
            return [...otherEmails, newDraft];
        });
        resolve(newDraftId);
    });
  }, []);

  const toggleStar = useCallback((conversationId: string, emailId?: string) => {
    setEmails(prev => prev.map(e => {
        const match = emailId ? e.id === emailId : e.conversationId === conversationId;
        if (match) {
            return { ...e, isStarred: !e.isStarred };
        }
        return e;
    }));
  }, []);

  const deleteConversation = useCallback((conversationIds: string[]) => {
    const emailsToDelete = emails.filter(e => conversationIds.includes(e.conversationId));
    const trashEmails = emailsToDelete.filter(e => e.folder === Folder.TRASH);
    const nonTrashEmails = emailsToDelete.filter(e => e.folder !== Folder.TRASH);
    
    const remainingEmails = emails.filter(e => !trashEmails.some(te => te.id === e.id));
    
    const updatedEmails = remainingEmails.map(e => {
        if(nonTrashEmails.some(nte => nte.id === e.id)) {
            return {...e, folder: Folder.TRASH };
        }
        return e;
    });

    setEmails(updatedEmails);
    addToast(`${conversationIds.length} conversation(s) moved to Trash.`);
    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [emails, addToast, selectedConversationId, selectedConversationIds, deselectAllConversations]);

  const handleEscape = useCallback(() => {
    if (composeState.isOpen) closeCompose();
    else if (selectedConversationId) setSelectedConversationId(null);
    else if (searchQuery) setSearchQuery('');
  }, [composeState.isOpen, selectedConversationId, searchQuery, closeCompose]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('isSidebarOpen', String(newState));
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
  
  const bulkAction = useCallback((action: 'read' | 'unread' | 'delete') => {
    const ids = Array.from(selectedConversationIds);
    if (ids.length === 0) return;
    
    if (action === 'delete') {
      deleteConversation(ids);
    } else {
      const isRead = action === 'read';
      setEmails(prev => prev.map(e => ids.includes(e.conversationId) ? { ...e, isRead } : e));
      addToast(`Marked ${ids.length} conversation(s) as ${action}.`);
    }
    deselectAllConversations();
  }, [selectedConversationIds, deleteConversation, deselectAllConversations, addToast]);

  const bulkDelete = useCallback(() => bulkAction('delete'), [bulkAction]);
  const bulkMarkAsRead = useCallback(() => bulkAction('read'), [bulkAction]);
  const bulkMarkAsUnread = useCallback(() => bulkAction('unread'), [bulkAction]);
  
  const markAsRead = useCallback((conversationId: string) => {
      setEmails(prev => prev.map(e => e.conversationId === conversationId ? { ...e, isRead: true } : e));
  }, []);

  const navigateConversationList = useCallback((direction: 'up' | 'down') => {
    const index = displayedConversations.findIndex(c => c.id === selectedConversationId);
    let nextIndex = index + (direction === 'down' ? 1 : -1);
    nextIndex = Math.max(0, Math.min(displayedConversations.length - 1, nextIndex));
    if(nextIndex !== index) {
      const newSelectedConv = displayedConversations[nextIndex];
      setSelectedConversationId(newSelectedConv.id);
      if(!newSelectedConv.isRead) markAsRead(newSelectedConv.id);
    }
  }, [displayedConversations, selectedConversationId, markAsRead]);

  const summarizeConversation = useCallback(async (conversationId: string): Promise<string | null> => {
    const conversation = displayedConversations.find(c => c.id === conversationId);
    if (!conversation || !process.env.API_KEY) {
        addToast("Cannot summarize: API key or conversation not found.");
        return null;
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash';
        
        const prompt = `Summarize the following email conversation. Focus on key points, decisions, and action items. Here is the thread:\n\n` + 
        conversation.emails.map(e => `From: ${e.senderName}\nSubject: ${e.subject}\n\n${e.body.replace(/<[^>]*>?/gm, '')}`).join('\n\n---\n\n');

        const response = await ai.models.generateContent({model, contents: prompt});
        return response.text;
    } catch (error) {
        console.error("Error summarizing conversation:", error);
        addToast("Failed to generate summary.", { duration: 5000 });
        return null;
    }
  }, [displayedConversations, addToast]);

  const processNewEmail = useCallback((email: Email) => {
    let finalEmail = { ...email };
    let didAutoRespond = false;
    let appliedRule = false;
    
    for(const rule of appSettings.rules) {
        let conditionMet = false;
        const value = rule.condition.value.toLowerCase();
        
        if (rule.condition.field === 'sender' && email.senderEmail.toLowerCase().includes(value)) conditionMet = true;
        else if (rule.condition.field === 'recipient' && email.recipientEmail.toLowerCase().includes(value)) conditionMet = true;
        else if (rule.condition.field === 'subject' && email.subject.toLowerCase().includes(value)) conditionMet = true;

        if (conditionMet) {
            appliedRule = true;
            if (rule.action.type === 'move' && rule.action.folder) {
                finalEmail.folder = rule.action.folder;
                addToast(`Rule applied: Moved email to ${rule.action.folder}.`);
            }
            if (rule.action.type === 'star') finalEmail.isStarred = true;
            if (rule.action.type === 'markAsRead') finalEmail.isRead = true;
            break; // Stop after first matching rule
        }
    }
    
    if (appSettings.autoResponder.isEnabled && finalEmail.folder === Folder.INBOX) {
        const { startDate, endDate } = appSettings.autoResponder;
        const now = new Date();
        const isWithinDateRange = (!startDate || now >= new Date(startDate)) && (!endDate || now <= new Date(endDate));
        
        if (isWithinDateRange) {
            const reply: Email = {
                id: `email-${Date.now()}`,
                conversationId: email.conversationId,
                senderName: MOCK_USER.name,
                senderEmail: MOCK_USER.email,
                recipientEmail: email.senderEmail,
                subject: appSettings.autoResponder.subject,
                body: appSettings.autoResponder.message,
                snippet: appSettings.autoResponder.message.substring(0, 100),
                timestamp: new Date().toISOString(),
                isRead: true,
                isStarred: false,
                folder: Folder.SENT,
            };
            setEmails(prev => [...prev, reply]);
            didAutoRespond = true;
        }
    }
    
    setEmails(prev => [...prev, finalEmail]);
    if (!appliedRule) addToast(`New email from ${email.senderName}. ${didAutoRespond ? 'Auto-reply sent.' : ''}`);

  }, [appSettings, addToast]);

  const simulateNewEmail = useCallback(() => {
    const newEmail: Email = {
        id: `email-sim-${Date.now()}`,
        conversationId: `conv-sim-${Date.now()}`,
        senderName: 'Stripe',
        senderEmail: 'billing@stripe.com',
        recipientEmail: MOCK_USER.email,
        subject: 'Your latest invoice is ready',
        body: '<p>Hi there,</p><p>Your invoice #123-456 for this month is now available for download.</p><p>Thanks,<br/>The Stripe Team</p>',
        snippet: 'Hi there, Your invoice #123-456 for this month is now available...',
        timestamp: new Date().toISOString(),
        isRead: false,
        isStarred: false,
        folder: Folder.INBOX,
    };
    processNewEmail(newEmail);
  }, [processNewEmail]);

  const createUserFolder = useCallback((name: string) => {
      if(userFolders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
          addToast("A folder with that name already exists.", { duration: 3000 });
          return;
      }
      const newFolder: UserFolder = { id: `folder-${Date.now()}`, name };
      setUserFolders(prev => [...prev, newFolder]);
  }, [userFolders, addToast]);

  const renameUserFolder = useCallback((id: string, newName: string) => {
      const oldName = userFolders.find(f => f.id === id)?.name;
      if (!oldName) return;

      setUserFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      setEmails(prev => prev.map(e => e.folder === oldName ? { ...e, folder: newName } : e));
  }, [userFolders]);

  const deleteUserFolder = useCallback((id: string) => {
      const folderToDelete = userFolders.find(f => f.id === id);
      if (!folderToDelete) return;

      moveConversations(
        allConversations.filter(c => c.folder === folderToDelete.name).map(c => c.id),
        Folder.TRASH
      );
      setUserFolders(prev => prev.filter(f => f.id !== id));
  }, [userFolders, allConversations, moveConversations]);

  const markAsSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, Folder.SPAM);
    addToast(`Moved ${conversationIds.length} conversation(s) to Spam.`);
  }, [moveConversations, addToast]);

  const markAsNotSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, Folder.INBOX);
    addToast(`Moved ${conversationIds.length} conversation(s) to Inbox.`);
  }, [moveConversations, addToast]);

  const snoozeConversation = useCallback((conversationIds: string[], snoozeUntil: Date) => {
    const snoozeUntilString = snoozeUntil.toISOString();
    setEmails(prevEmails => {
      return prevEmails.map(e => {
        if (conversationIds.includes(e.conversationId)) {
          return { ...e, snoozedUntil: snoozeUntilString };
        }
        return e;
      });
    });
    addToast(`Snoozed ${conversationIds.length} conversation(s).`);
    deselectAllConversations();
    setSelectedConversationId(null);
  }, [addToast, deselectAllConversations]);

  // Effect to check for "waking up" snoozed emails
  useEffect(() => {
    const checkSnoozedEmails = () => {
      const now = new Date();
      const emailsToWake = emails.filter(e => e.snoozedUntil && new Date(e.snoozedUntil) <= now);
      if (emailsToWake.length > 0) {
        setEmails(prev => prev.map(e => {
          if (emailsToWake.some(wake => wake.id === e.id)) {
            addToast(`Email "${e.subject}" returned to Inbox.`);
            return { ...e, snoozedUntil: undefined, folder: Folder.INBOX };
          }
          return e;
        }));
      }
    };
    const interval = setInterval(checkSnoozedEmails, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [emails, addToast]);

  // Contact management
  const addContact = useCallback((contactData: Omit<Contact, 'id'>) => {
    const newContact: Contact = { ...contactData, id: `contact-${Date.now()}` };
    setContacts(prev => [...prev, newContact]);
    addToast('Contact added.');
  }, [addToast]);
  
  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    addToast('Contact updated.');
  }, [addToast]);

  const deleteContact = useCallback((contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    addToast('Contact deleted.');
  }, [addToast]);

  const updateSignature = useCallback((signature: Signature) => setAppSettings(prev => ({...prev, signature})), []);
  const updateAutoResponder = useCallback((autoResponder: AutoResponder) => setAppSettings(prev => ({...prev, autoResponder})), []);
  
  const addRule = useCallback((rule: Omit<Rule, 'id'>) => {
    const newRule = { ...rule, id: `rule-${Date.now()}`};
    setAppSettings(prev => ({...prev, rules: [...prev.rules, newRule]}));
  }, []);
  
  const deleteRule = useCallback((ruleId: string) => {
    setAppSettings(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== ruleId) }));
  }, []);

  const setViewCallback = useCallback((newView: View) => {
    setView(newView);
    setSelectedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
  }, []);

  const contextValue: AppContextType = {
    emails, conversations: allConversations, userFolders, currentFolder, selectedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, isSidebarOpen, user: MOCK_USER, view, appSettings, contacts,
    setCurrentFolder: setCurrentFolderCallback, setSelectedConversationId, openCompose, closeCompose, toggleStar, sendEmail, deleteConversation, setSearchQuery, toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, moveConversations, toggleTheme, toggleSidebar, handleEscape, navigateConversationList, saveDraft, setView: setViewCallback, markAsRead, updateSignature, updateAutoResponder, addRule, deleteRule, summarizeConversation, scheduleEmail, simulateNewEmail, createUserFolder, renameUserFolder, deleteUserFolder, markAsSpam, markAsNotSpam, snoozeConversation, addContact, updateContact, deleteContact
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
