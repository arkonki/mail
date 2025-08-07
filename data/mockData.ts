
import { Contact, Email, User, UserFolder, Folder } from '../types';

export const mockUser: User = {
    email: 'test.user@example.com',
    name: 'Test User',
};

export const mockUserFolders: UserFolder[] = [
    { id: 'folder-1', name: 'Travel' },
    { id: 'folder-2', name: 'Receipts' },
];

export const mockContacts: Contact[] = [
  { id: 'contact-1', name: 'Alex Johnson', email: 'alex.j@example.com', phone: '123-456-7890', company: 'Innovate Inc.', notes: 'Lead developer on Project Alpha.' },
  { id: 'contact-2', name: 'Jane Doe', email: 'jane.d@example.com', phone: '987-654-3210', company: 'Solutions Co.', notes: 'Met at the 2023 tech conference.' },
  { id: 'contact-3', name: 'Sarah Lee', email: 'sarah.k@example.com', company: 'Innovate Inc.' },
  { id: 'contact-4', name: 'GitHub', email: 'noreply@github.com', notes: 'Automated notifications.' },
  { id: 'contact-5', name: 'Vercel', email: 'notifications@vercel.com' },
  { id: 'contact-6', name: 'Figma', email: 'team@figma.com', company: 'Figma' },
  { id: 'contact-7', name: 'Mom', email: 'mom@example.com', phone: '555-123-4567', notes: 'Call on weekends!' },
  { id: 'user', name: mockUser.name, email: mockUser.email},
];


const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(now.getDate() - 2);

export const mockEmails: Email[] = [
    // --- Conversation 1: Design Feedback ---
    {
        id: 'email-1',
        conversationId: 'conv-1',
        senderName: 'Sarah Lee',
        senderEmail: 'sarah.k@example.com',
        recipientEmail: mockUser.email,
        subject: 'Re: Design Feedback',
        body: `<p>Thanks, ${mockUser.name}!</p><p>I've attached the updated mockups with the changes we discussed. Let me know your thoughts!</p><p>Best,<br>Sarah</p>`,
        snippet: "Thanks, Test! I've attached the updated mockups...",
        timestamp: now.toISOString(),
        isRead: false,
        isStarred: true,
        folder: Folder.INBOX,
        attachments: [{ fileName: 'Updated-Mockups.fig', fileSize: 4500000 }],
    },
    {
        id: 'email-2',
        conversationId: 'conv-1',
        senderName: mockUser.name,
        senderEmail: mockUser.email,
        recipientEmail: 'sarah.k@example.com',
        subject: 'Re: Design Feedback',
        body: `<p>Hi Sarah,</p><p>Looks great! Just one minor suggestion: can we try a slightly darker shade for the primary button?</p><p>Thanks,<br>${mockUser.name}</p>`,
        snippet: 'Looks great! Just one minor suggestion...',
        timestamp: new Date(now.getTime() - 10 * 60000).toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.SENT,
    },
     {
        id: 'email-3',
        conversationId: 'conv-1',
        senderName: 'Sarah Lee',
        senderEmail: 'sarah.k@example.com',
        recipientEmail: mockUser.email,
        subject: 'Design Feedback',
        body: `<p>Hi team,</p><p>Here are the initial designs for the new dashboard. Please send any feedback by EOD tomorrow.</p>`,
        snippet: 'Here are the initial designs for the new dashboard...',
        timestamp: new Date(now.getTime() - 20 * 60000).toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.INBOX,
    },

    // --- Conversation 2: GitHub Notification ---
    {
        id: 'email-4',
        conversationId: 'conv-2',
        senderName: 'GitHub',
        senderEmail: 'noreply@github.com',
        recipientEmail: mockUser.email,
        subject: '[GitHub] Your build has failed',
        body: `<p>The build for your repository <strong>'webmail-client'</strong> has failed.</p><p>Please check the logs for more details.</p>`,
        snippet: 'The build for your repository has failed...',
        timestamp: yesterday.toISOString(),
        isRead: false,
        isStarred: false,
        folder: Folder.INBOX,
    },
    
    // --- Conversation 3: Travel Plans ---
    {
        id: 'email-5',
        conversationId: 'conv-3',
        senderName: 'Alex Johnson',
        senderEmail: 'alex.j@example.com',
        recipientEmail: mockUser.email,
        subject: 'Travel Plans',
        body: `<p>Hey!</p><p>Just confirming my flight details for the conference. I land at 10:30 AM on the 15th.</p><p>See you there!</p>`,
        snippet: 'Just confirming my flight details for the conference...',
        timestamp: twoDaysAgo.toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.INBOX,
    },

    // --- Sent Email (No Reply Yet) ---
    {
        id: 'email-6',
        conversationId: 'conv-4',
        senderName: mockUser.name,
        senderEmail: mockUser.email,
        recipientEmail: 'jane.d@example.com',
        subject: 'Project Alpha Update',
        body: `<p>Hi Jane,</p><p>Just wanted to give you a quick update on Project Alpha. We are on track to meet the Q3 deadline.</p><p>I'll send a more detailed report next week.</p>`,
        snippet: "Just wanted to give you a quick update on Project Alpha...",
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60000).toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.SENT,
    },

    // --- Spam Email ---
    {
        id: 'email-7',
        conversationId: 'conv-5',
        senderName: 'Super Deals',
        senderEmail: 'deals@spam-central.com',
        recipientEmail: mockUser.email,
        subject: 'You have won a prize!',
        body: `<p>Click here to claim your exclusive prize! Limited time offer!</p>`,
        snippet: 'Click here to claim your exclusive prize!',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60000).toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.SPAM,
    },

     // --- Draft Email ---
    {
        id: 'email-8',
        conversationId: 'conv-6',
        senderName: mockUser.name,
        senderEmail: mockUser.email,
        recipientEmail: 'mom@example.com',
        subject: 'Weekend plans',
        body: `<p>Hi Mom,</p><p>Are we still on for dinner this Saturday?`,
        snippet: 'Are we still on for dinner this Saturday?',
        timestamp: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        folder: Folder.DRAFTS,
    },
];
