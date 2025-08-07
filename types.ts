

export enum Folder {
  INBOX = 'Inbox',
  STARRED = 'Starred',
  SNOOZED = 'Snoozed',
  SENT = 'Sent',
  SCHEDULED = 'Scheduled',
  SPAM = 'Spam',
  DRAFTS = 'Drafts',
  TRASH = 'Trash',
}

export enum ActionType {
  REPLY = 'reply',
  FORWARD = 'forward',
  DRAFT = 'draft',
}

export interface Attachment {
  fileName: string;
  fileSize: number; // in bytes
}

export interface UserFolder {
  id: string;
  name:string;
}

export interface Email {
  id: string;
  conversationId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  snippet: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  folder: string; // Can be a value from Folder enum or a UserFolder name
  attachments?: Attachment[];
  scheduledSendTime?: string;
  snoozedUntil?: string;
}

export interface Conversation {
    id: string;
    subject: string;
    emails: Email[];
    participants: { name: string, email: string }[];
    lastTimestamp: string;
    isRead: boolean;
    isStarred: boolean;
    isSnoozed: boolean;
    folder: string;
    hasAttachments: boolean;
}

export interface User {
    email: string;
    name: string;
}

export interface Contact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    notes?: string;
}

// Settings Types
export interface Signature {
  isEnabled: boolean;
  body: string;
}

export interface AutoResponder {
  isEnabled: boolean;
  subject: string;
  message: string;
  startDate?: string;
  endDate?: string;
}

export interface Rule {
  id: string;
  condition: {
    field: 'sender' | 'recipient' | 'subject';
    operator: 'contains';
    value: string;
  };
  action: {
    type: 'move' | 'star' | 'markAsRead';
    folder?: string; // only for 'move'
  };
}


export interface AppSettings {
  signature: Signature;
  autoResponder: AutoResponder;
  rules: Rule[];
}