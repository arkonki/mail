import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Email, Folder, User, ActionType, Attachment, UserFolder, Conversation, AppSettings, Signature, AutoResponder, Rule } from '../types';
import { mockEmails, mockUserFolders } from '../data/mockData';
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

interface PendingSend {
  email: Email;
  timerId: number;
}

const defaultSettings: AppSettings = {
  signature: { isEnabled: false, body: '' },
  autoResponder: { isEnabled: false, subject: '', message: '' },
  rules: [],
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
  view: View;
  appSettings: AppSettings;
  isSidebarCollapsed: boolean;
  setView: (view: View) => void;
  setCurrentFolder: (folder: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  openCompose: (action?: ActionType, email?: Email) => void;
  closeCompose: () => void;
  toggleStar: (conversationId: string, emailId?: string) => void;
  markAsRead: (conversationId: string) => void;
  sendEmail: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => void;
  scheduleEmail: (data: { to: string; subject: string; body: string; attachments: File[] }, sendTime: Date, draftId?: string, conversationId?: string) => void;
  saveDraft: (data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string) => string;
  deleteEmail: (emailId: string, isDraftDiscard?: boolean) => void;
  deleteConversation: (conversationId: string) => void;
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
  createUserFolder: (name: string) => boolean;
  renameUserFolder: (oldName: string, newName: string) => boolean;
  deleteUserFolder: (name: string) => void;
  summarizeConversation: (conversationId: string) => Promise<string>;
  updateSignature: (signature: Signature) => void;
  updateAutoResponder: (responder: AutoResponder) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  deleteRule: (ruleId: string) => void;
  simulateNewEmail: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const demoUser: User = {
    email: 'demo@example.com',
    name: 'Demo User'
};

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [userFolders, setUserFolders] = useState<UserFolder[]>(mockUserFolders);
  const [currentFolder, setCurrentFolder] = useState<string>(Folder.INBOX);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false });
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const [selectedConversationIds, setSelectedConversationIds] = useState(new Set<string>());
  const { addToast } = useToast();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [view, setView] = useState<View>('mail');
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
        const storedSettings = localStorage.getItem('appSettings');
        return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch {
        return defaultSettings;
    }
  });
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);
  const scheduledTimers = useRef<Record<string, number>>({});
  const ai = useMemo(() => process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null, []);

  useEffect(() => {
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }, [appSettings]);
  
  const updateSignature = useCallback((signature: Signature) => {
      setAppSettings(prev => ({ ...prev, signature }));
      addToast('Signature updated.');
  }, [addToast]);
  
  const updateAutoResponder = useCallback((autoResponder: AutoResponder) => {
      setAppSettings(prev => ({ ...prev, autoResponder }));
      addToast('Auto-responder updated.');
  }, [addToast]);

  const addRule = useCallback((rule: Omit<Rule, 'id'>) => {
      setAppSettings(prev => ({
          ...prev,
          rules: [...prev.rules, { ...rule, id: `rule-${Date.now()}` }]
      }));
      addToast('Rule added.');
  }, [addToast]);
  
  const deleteRule = useCallback((ruleId: string) => {
      setAppSettings(prev => ({
          ...prev,
          rules: prev.rules.filter(r => r.id !== ruleId)
      }));
      addToast('Rule deleted.');
  }, [addToast]);

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
            const sender = { name: email.senderName, email: email.senderEmail };
            if (!acc.some(p => p.email === sender.email)) {
                acc.push(sender);
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

  const processNewEmail = useCallback((newEmail: Email) => {
    let finalEmail = { ...newEmail };

    // Apply rules
    for (const rule of appSettings.rules) {
        if (rule.condition.field === 'sender' && rule.condition.operator === 'contains') {
            if (finalEmail.senderEmail.toLowerCase().includes(rule.condition.value.toLowerCase())) {
                finalEmail.folder = rule.action.folder;
                addToast(`Rule applied: Email from ${finalEmail.senderEmail} moved to ${finalEmail.folder}.`);
                break; // Stop after first matching rule
            }
        }
    }
    
    // Check and apply auto-responder
    const { autoResponder } = appSettings;
    if (autoResponder.isEnabled) {
        const now = new Date();
        const startDate = autoResponder.startDate ? new Date(autoResponder.startDate) : null;
        const endDate = autoResponder.endDate ? new Date(autoResponder.endDate) : null;
        
        if ((!startDate || now >= startDate) && (!endDate || now <= endDate)) {
            const replyEmail: Email = {
                id: `email-${Date.now()}`,
                conversationId: newEmail.conversationId,
                senderName: demoUser.name,
                senderEmail: demoUser.email,
                recipientEmail: newEmail.senderEmail,
                subject: autoResponder.subject,
                body: autoResponder.message,
                snippet: autoResponder.message.substring(0, 100),
                timestamp: new Date().toISOString(),
                isRead: true,
                isStarred: false,
                folder: Folder.SENT,
            };
            setEmails(prev => [replyEmail, ...prev]);
            addToast(`Auto-response sent to ${newEmail.senderEmail}.`);
        }
    }
    
    setEmails(prev => [finalEmail, ...prev]);
  }, [appSettings, addToast]);

  const simulateNewEmail = useCallback(() => {
    const newEmail: Email = {
        id: `email-${Date.now()}`,
        conversationId: `conv-${Date.now()}`,
        senderName: 'Test Sender',
        senderEmail: 'newsletter@example.com',
        recipientEmail: demoUser.email,
        subject: 'This is a test email',
        snippet: 'This email is to test your rules and auto-responder settings.',
        body: '<p>This email is to test your rules and auto-responder settings.</p>',
        timestamp: new Date().toISOString(),
        isRead: false,
        isStarred: false,
        folder: Folder.INBOX,
    };
    processNewEmail(newEmail);
  }, [processNewEmail]);

  const actuallySendEmail = useCallback((email: Email) => {
    setEmails(prevEmails => [email, ...prevEmails]);
  }, []);

  const cancelScheduledTimer = useCallback((emailId: string) => {
    if (scheduledTimers.current[emailId]) {
      clearTimeout(scheduledTimers.current[emailId]);
      delete scheduledTimers.current[emailId];
    }
  }, []);
  
  const openCompose = useCallback((action?: ActionType, email?: Email) => {
    if(email?.folder === Folder.SCHEDULED) { cancelScheduledTimer(email.id); }
    const isDraftOrScheduled = email?.folder === Folder.DRAFTS || email?.folder === Folder.SCHEDULED;
    
    let bodyWithSignature = email?.body || '';
    if (!action && appSettings.signature.isEnabled) {
      bodyWithSignature = `<br><br>${appSettings.signature.body}`;
    }

    setComposeState({ 
        isOpen: true, 
        action, 
        email: email ? { ...email, body: bodyWithSignature } : undefined, 
        draftId: isDraftOrScheduled ? email.id : undefined, 
        conversationId: email?.conversationId 
    });
  }, [cancelScheduledTimer, appSettings.signature]);

  const sendEmail = useCallback((data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string, conversationId?: string) => {
    if (pendingSend) {
      clearTimeout(pendingSend.timerId);
      actuallySendEmail(pendingSend.email);
    }
    
    if (draftId) {
        setEmails(prev => prev.filter(e => e.id !== draftId));
    }

    const newEmail: Email = {
        id: `email-${Date.now()}`,
        conversationId: conversationId || `conv-${Date.now()}`,
        senderName: demoUser.name,
        senderEmail: demoUser.email,
        recipientEmail: data.to,
        subject: data.subject || '(no subject)',
        snippet: data.body.substring(0, 100).replace(/<[^>]+>/g, '') + '...',
        body: data.body,
        timestamp: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.SENT,
        attachments: data.attachments.map(file => ({ fileName: file.name, fileSize: file.size }))
    };

    const timerId = window.setTimeout(() => {
        actuallySendEmail(newEmail);
        setPendingSend(null);
    }, 5000);

    setPendingSend({ email: newEmail, timerId });

    addToast('Message sent.', {
        duration: 5000,
        action: {
            label: 'Undo',
            onClick: () => {
                clearTimeout(timerId);
                setPendingSend(null);
                openCompose(draftId ? ActionType.DRAFT : undefined, {
                  ...newEmail,
                  folder: draftId ? Folder.DRAFTS : Folder.SENT,
                  id: draftId || '',
                  recipientEmail: data.to,
                });
            }
        }
    });
  }, [addToast, actuallySendEmail, pendingSend, openCompose]);

  const setScheduledTimer = useCallback((email: Email) => {
      if (!email.scheduledSendTime) return;
      
      const sendTime = new Date(email.scheduledSendTime).getTime();
      const now = new Date().getTime();
      const delay = sendTime - now;

      if (delay > 0) {
          const timerId = window.setTimeout(() => {
              setEmails(prev => prev.map(e => e.id === email.id ? { ...e, folder: Folder.SENT, scheduledSendTime: undefined } : e));
              delete scheduledTimers.current[email.id];
              addToast(`Email "${email.subject}" sent.`);
          }, delay);
          scheduledTimers.current[email.id] = timerId;
      } else {
          setEmails(prev => prev.map(e => e.id === email.id ? { ...e, folder: Folder.SENT, scheduledSendTime: undefined } : e));
      }
  }, [addToast]);

  useEffect(() => {
      emails.forEach(email => {
          if (email.folder === Folder.SCHEDULED) {
              setScheduledTimer(email);
          }
      });
      return () => { Object.values(scheduledTimers.current).forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const scheduleEmail = useCallback((data: { to: string; subject: string; body: string; attachments: File[] }, sendTime: Date, draftId?: string, conversationId?: string) => {
    if (draftId) { setEmails(prev => prev.filter(e => e.id !== draftId)); }
    const newEmail: Email = {
        id: `email-${Date.now()}`,
        conversationId: conversationId || `conv-${Date.now()}`,
        senderName: demoUser.name,
        senderEmail: demoUser.email,
        recipientEmail: data.to,
        subject: data.subject || '(no subject)',
        snippet: data.body.substring(0, 100).replace(/<[^>]+>/g, '') + '...',
        body: data.body,
        timestamp: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.SCHEDULED,
        attachments: data.attachments.map(file => ({ fileName: file.name, fileSize: file.size })),
        scheduledSendTime: sendTime.toISOString(),
    };
    setEmails(prevEmails => [newEmail, ...prevEmails]);
    setScheduledTimer(newEmail);
    addToast('Message scheduled.');
  }, [addToast, setScheduledTimer]);

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

  const displayedConversations = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    
    let filteredConversations = conversations;

    if (searchQuery.length > 0) {
        filteredConversations = conversations.filter(conv => 
            conv.emails.some(email =>
                (email.subject?.toLowerCase() || '').includes(lowercasedQuery) ||
                (email.snippet?.toLowerCase() || '').includes(lowercasedQuery) ||
                (email.body?.toLowerCase() || '').includes(lowercasedQuery) ||
                (email.senderName?.toLowerCase() || '').includes(lowercasedQuery)
            )
        );
    } else {
        if (currentFolder === Folder.STARRED) {
            filteredConversations = conversations.filter(conv => conv.isStarred && conv.folder !== Folder.TRASH);
        } else {
            filteredConversations = conversations.filter((conv) => conv.folder === currentFolder);
        }
    }
    return filteredConversations.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [conversations, currentFolder, searchQuery]);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setSelectedConversationId(null);
    setSelectedConversationIds(new Set());
  }, []);
  
  const setCurrentFolderCallback = useCallback((folder: string) => {
      setCurrentFolder(folder);
      setSelectedConversationId(null);
      setSearchQueryState('');
      setSelectedConversationIds(new Set());
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false }), []);

  const toggleStar = useCallback((conversationId: string, emailId?: string) => {
    setEmails(prevEmails =>
      prevEmails.map(email => {
        if (email.conversationId === conversationId && (emailId ? email.id === emailId : true)) {
          // If emailId is provided, toggle only that email. Otherwise, toggle all in conversation.
          const currentIsStarred = emails.find(e => e.id === (emailId || email.id))?.isStarred;
          return { ...email, isStarred: !currentIsStarred };
        }
        return email;
      })
    );
  }, [emails]);

  const markAsRead = useCallback((conversationId: string) => {
    setEmails(prevEmails =>
      prevEmails.map(email =>
        email.conversationId === conversationId ? { ...email, isRead: true } : email
      )
    );
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    conv.emails.forEach(email => {
        if(email.folder === Folder.SCHEDULED) cancelScheduledTimer(email.id);
    });

    setEmails(prevEmails => {
        if (conv.folder === Folder.TRASH) {
            addToast('Conversation permanently deleted.');
            return prevEmails.filter(e => e.conversationId !== conversationId);
        } else {
            addToast('Conversation moved to Trash.');
            return prevEmails.map(e => e.conversationId === conversationId ? {...e, folder: Folder.TRASH, isRead: true} : e);
        }
    });
    if(selectedConversationId === conversationId) setSelectedConversationId(null);
    setSelectedConversationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
    });
  }, [conversations, selectedConversationId, addToast, cancelScheduledTimer]);

  const deleteEmail = useCallback((emailId: string, isDraftDiscard: boolean = false) => {
    const emailToDelete = emails.find(e => e.id === emailId);
    if (!emailToDelete) return;

    if (isDraftDiscard) {
        setEmails(prev => prev.filter(e => e.id !== emailId));
        addToast('Draft discarded.');
    } else {
        deleteConversation(emailToDelete.conversationId);
    }
  }, [emails, deleteConversation, addToast]);

  const saveDraft = useCallback((data: { to: string; subject: string; body: string; attachments: File[] }, draftId?: string): string => {
    const draftEmailData = {
        senderName: demoUser.name,
        senderEmail: demoUser.email,
        recipientEmail: data.to,
        subject: data.subject || '(no subject)',
        snippet: data.body.substring(0, 100).replace(/<[^>]+>/g, '') + '...',
        body: data.body,
        timestamp: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.DRAFTS,
        attachments: data.attachments.map(file => ({ fileName: file.name, fileSize: file.size }))
    };
    
    let newDraftId = draftId;
    setEmails(prevEmails => {
        const existingDraft = draftId ? prevEmails.find(e => e.id === draftId) : null;
        if(existingDraft) {
            return prevEmails.map(e => e.id === draftId ? {...e, ...draftEmailData, folder: Folder.DRAFTS, scheduledSendTime: undefined } : e);
        } else {
            newDraftId = `email-${Date.now()}`;
            const newEmail: Email = {
                id: newDraftId,
                conversationId: `conv-${Date.now()}`,
                ...draftEmailData
            };
            return [newEmail, ...prevEmails];
        }
    });
    return newDraftId!;
  }, []);

  const toggleConversationSelection = useCallback((conversationId: string) => {
    setSelectedConversationIds(prev => {
        const newSet = new Set(prev);
        newSet.has(conversationId) ? newSet.delete(conversationId) : newSet.add(conversationId);
        return newSet;
    });
  }, []);

  const selectAllConversations = useCallback((ids: string[]) => setSelectedConversationIds(new Set(ids)), []);
  const deselectAllConversations = useCallback(() => setSelectedConversationIds(new Set()), []);

  const bulkAction = useCallback((action: 'delete' | 'read' | 'unread') => {
    const count = selectedConversationIds.size;
    if (count === 0) return;

    setEmails(prev => {
        let emailIdsToUpdate = new Set<string>();
        prev.forEach(e => {
            if(selectedConversationIds.has(e.conversationId)) {
                emailIdsToUpdate.add(e.id);
                if (e.folder === Folder.SCHEDULED) cancelScheduledTimer(e.id);
            }
        });
        return prev.map(email => {
            if (!emailIdsToUpdate.has(email.id)) return email;
            switch(action) {
                case 'delete': return { ...email, folder: Folder.TRASH, isRead: true };
                case 'read': return { ...email, isRead: true };
                case 'unread': return { ...email, isRead: false };
                default: return email;
            }
        });
    });

    addToast(`${count} conversation${count > 1 ? 's' : ''} ${action === 'delete' ? 'moved to Trash' : `marked as ${action}`}.`);
    setSelectedConversationIds(new Set());
    setSelectedConversationId(null);
  }, [selectedConversationIds, addToast, cancelScheduledTimer]);

  const bulkDelete = useCallback(() => bulkAction('delete'), [bulkAction]);
  const bulkMarkAsRead = useCallback(() => bulkAction('read'), [bulkAction]);
  const bulkMarkAsUnread = useCallback(() => bulkAction('unread'), [bulkAction]);

  const moveConversations = useCallback((conversationIdsToMove: string[], targetFolder: string) => {
      const count = conversationIdsToMove.length;
      if (count === 0) return;
  
      setEmails(prev => {
          let emailIdsToUpdate = new Set<string>();
          prev.forEach(e => {
              if (conversationIdsToMove.includes(e.conversationId)) {
                  emailIdsToUpdate.add(e.id);
                  if (e.folder === Folder.SCHEDULED) cancelScheduledTimer(e.id);
              }
          });
          return prev.map(email => 
              emailIdsToUpdate.has(email.id) ? { ...email, folder: targetFolder } : email
          );
      });
      addToast(`${count} conversation${count > 1 ? 's' : ''} moved to ${targetFolder}.`);
      setSelectedConversationIds(new Set());
      setSelectedConversationId(null);
  }, [addToast, cancelScheduledTimer]);

  const navigateConversationList = useCallback((direction: 'up' | 'down') => {
      if (displayedConversations.length === 0) return;
      const currentIndex = selectedConversationId ? displayedConversations.findIndex(c => c.id === selectedConversationId) : -1;
      let nextIndex;
      if (direction === 'down') { nextIndex = currentIndex < displayedConversations.length - 1 ? currentIndex + 1 : 0; }
      else { nextIndex = currentIndex > 0 ? currentIndex - 1 : displayedConversations.length - 1; }
      
      const newSelectedConversation = displayedConversations[nextIndex];
      setSelectedConversationId(newSelectedConversation.id);
      if (!newSelectedConversation.isRead) markAsRead(newSelectedConversation.id);
  }, [displayedConversations, selectedConversationId, markAsRead]);
  
  const handleEscape = useCallback(() => {
      if (composeState.isOpen) closeCompose();
      else if (selectedConversationId) setSelectedConversationId(null);
      else if (searchQuery) setSearchQuery('');
  }, [composeState.isOpen, selectedConversationId, searchQuery, closeCompose, setSearchQuery]);

  const createUserFolder = useCallback((name: string): boolean => {
    if (!name.trim() || userFolders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        addToast('Folder name already exists or is invalid.', { duration: 3000 }); return false;
    }
    const newFolder: UserFolder = { id: `folder-${Date.now()}`, name };
    setUserFolders(prev => [...prev, newFolder].sort((a,b) => a.name.localeCompare(b.name)));
    addToast(`Folder "${name}" created.`);
    return true;
  }, [userFolders, addToast]);

  const renameUserFolder = useCallback((oldName: string, newName: string): boolean => {
    if (!newName.trim() || userFolders.some(f => f.name.toLowerCase() === newName.toLowerCase() && f.name !== oldName)) {
        addToast('Folder name already exists or is invalid.', { duration: 3000 }); return false;
    }
    setUserFolders(prev => prev.map(f => f.name === oldName ? { ...f, name: newName } : f).sort((a,b) => a.name.localeCompare(b.name)));
    setEmails(prev => prev.map(e => e.folder === oldName ? { ...e, folder: newName } : e));
    if (currentFolder === oldName) setCurrentFolder(newName);
    addToast(`Folder renamed to "${newName}".`);
    return true;
  }, [currentFolder, userFolders, addToast]);

  const deleteUserFolder = useCallback((name: string) => {
    if(window.confirm(`Are you sure you want to delete the folder "${name}"? All emails inside will be moved to Trash.`)) {
        setUserFolders(prev => prev.filter(f => f.name !== name));
        setEmails(prev => prev.map(e => e.folder === name ? { ...e, folder: Folder.TRASH } : e));
        if (currentFolder === name) setCurrentFolder(Folder.INBOX);
        addToast(`Folder "${name}" deleted.`);
    }
  }, [currentFolder, addToast]);

  const summarizeConversation = useCallback(async (conversationId: string): Promise<string> => {
    if (!ai) return "AI features are not available. Please configure your API key.";
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || conversation.emails.length < 2) return "This conversation is too short to summarize.";
    
    const prompt = `Summarize the following email conversation in a few bullet points. Focus on key decisions and action items. The conversation is between: ${conversation.participants.map(p => p.name).join(', ')}.
    
    --- START OF CONVERSATION ---
    ${conversation.emails.map(email => `
    From: ${email.senderName} <${email.senderEmail}>
    To: ${email.recipientEmail}
    Subject: ${email.subject}
    Date: ${new Date(email.timestamp).toUTCString()}
    
    ${email.body.replace(/<[^>]+>/g, '')}
    `).join('\n--- END OF MESSAGE ---\n--- NEW MESSAGE ---')}
    --- END OF CONVERSATION ---
    
    Summary:`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch(e) {
        console.error("Gemini API Error:", e);
        return "Sorry, I was unable to summarize this conversation at this time.";
    }
}, [ai, conversations]);


  const contextValue = useMemo(() => ({
    emails, conversations, userFolders, currentFolder, selectedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, view, appSettings, isSidebarCollapsed,
    setView, setCurrentFolder: setCurrentFolderCallback, setSelectedConversationId, openCompose, closeCompose, toggleStar, markAsRead, deleteEmail, deleteConversation, sendEmail, saveDraft, setSearchQuery, toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, moveConversations, toggleTheme, toggleSidebar, navigateConversationList: navigateConversationList, handleEscape, scheduleEmail, createUserFolder, renameUserFolder, deleteUserFolder, summarizeConversation,
    updateSignature, updateAutoResponder, addRule, deleteRule, simulateNewEmail,
  }), [emails, conversations, userFolders, currentFolder, selectedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, view, appSettings, isSidebarCollapsed, setCurrentFolderCallback, openCompose, closeCompose, toggleStar, markAsRead, deleteEmail, deleteConversation, sendEmail, saveDraft, setSearchQuery, toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, moveConversations, toggleTheme, toggleSidebar, navigateConversationList, handleEscape, scheduleEmail, createUserFolder, renameUserFolder, deleteUserFolder, summarizeConversation, updateSignature, updateAutoResponder, addRule, deleteRule, simulateNewEmail]);

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