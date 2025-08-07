
import { Email, Folder, UserFolder, Contact } from '../types';

const getFutureDate = (minutes: number): string => {
  return new Date(new Date().getTime() + minutes * 60000).toISOString();
}

export const mockUserFolders: UserFolder[] = [
  { id: 'folder-1', name: 'Projects' },
  { id: 'folder-2', name: 'Receipts' },
];

export const mockContacts: Contact[] = [
  { id: 'contact-1', name: 'Alex Johnson', email: 'alex.j@example.com' },
  { id: 'contact-2', name: 'Jane Doe', email: 'jane.d@example.com' },
  { id: 'contact-3', name: 'Sarah Lee', email: 'sarah.k@example.com' },
  { id: 'contact-4', name: 'GitHub', email: 'noreply@github.com' },
  { id: 'contact-5', name: 'Vercel', email: 'notifications@vercel.com' },
  { id: 'contact-6', name: 'Figma', email: 'team@figma.com' },
  { id: 'contact-7', name: 'Mom', email: 'mom@example.com' },
];

export const mockEmails: Email[] = [
  {
    id: '1',
    conversationId: 'conv-1',
    senderName: 'GitHub',
    senderEmail: 'noreply@github.com',
    recipientEmail: 'you@example.com',
    subject: '[github] A new vulnerability has been found in your repository',
    snippet: 'A potential security vulnerability has been found in the `react-scripts` package. We recommend updating to the latest version.',
    body: `
      <p>Hi there,</p>
      <p>A potential security vulnerability has been found in the <strong>react-scripts</strong> package in your <strong>portfolio-website</strong> repository. We recommend updating to the latest version to ensure your project remains secure.</p>
      <p>Details:</p>
      <ul>
        <li><strong>Package:</strong> react-scripts</li>
        <li><strong>Severity:</strong> High</li>
        <li><strong>Affected versions:</strong> &lt; 5.0.1</li>
      </ul>
      <p>Please run <code>npm install react-scripts@latest</code> to update.</p>
      <p>Thanks,<br/>The GitHub Team</p>
    `,
    timestamp: '2024-07-29T10:30:00Z',
    isRead: false,
    isStarred: true,
    folder: Folder.INBOX,
  },
  {
    id: '2',
    conversationId: 'conv-2',
    senderName: 'Alex Johnson',
    senderEmail: 'alex.j@example.com',
    recipientEmail: 'you@example.com',
    subject: 'Project Alpha - Meeting Follow-up',
    snippet: 'Great meeting today! Here are the action items we discussed. Let me know if I missed anything.',
    body: `
      <p>Hi Team,</p>
      <p>Great meeting today! Here are the action items we discussed:</p>
      <ol>
        <li><strong>You:</strong> Finalize the UI mockups for the new dashboard. (Due EOD Friday)</li>
        <li><strong>Sarah:</strong> Deploy the latest build to the staging server.</li>
        <li><strong>Me:</strong> Prepare the presentation for the stakeholder review next week.</li>
      </ol>
      <p>Let me know if I missed anything.</p>
      <p>Best,<br/>Alex</p>
    `,
    timestamp: '2024-07-29T09:15:00Z',
    isRead: false,
    isStarred: false,
    folder: Folder.INBOX,
  },
  {
    id: 'conv-2-reply',
    conversationId: 'conv-2',
    senderName: 'You',
    senderEmail: 'you@example.com',
    recipientEmail: 'alex.j@example.com',
    subject: 'Project Alpha - Meeting Follow-up',
    snippet: 'Looks good, thanks Alex! I will have the mockups ready by Friday.',
    body: `
      <p>Looks good, thanks Alex! I will have the mockups ready by Friday.</p>
      <p>Best,<br/>You</p>
    `,
    timestamp: '2024-07-29T09:45:00Z',
    isRead: true,
    isStarred: false,
    folder: Folder.INBOX,
  },
  {
    id: 'conv-2-reply2',
    conversationId: 'conv-2',
    senderName: 'Sarah Lee',
    senderEmail: 'sarah.k@example.com',
    recipientEmail: 'you@example.com',
    subject: 'Project Alpha - Meeting Follow-up',
    snippet: 'Staging deployment is complete. Let me know if you see any issues.',
    body: `
      <p>Staging deployment is complete. Let me know if you see any issues.</p>
    `,
    timestamp: '2024-07-29T11:00:00Z',
    isRead: false,
    isStarred: false,
    folder: Folder.INBOX,
  },
  {
    id: '3',
    conversationId: 'conv-3',
    senderName: 'Vercel',
    senderEmail: 'notifications@vercel.com',
    recipientEmail: 'you@example.com',
    subject: 'Deployment "webmail-client" is ready!',
    snippet: 'Your deployment is ready to be viewed. Congratulations on your new deployment!',
    body: '<p>Your deployment "webmail-client" is ready! You can view it at: <a href="#" class="text-primary">https://webmail-client-demo.vercel.app</a></p><p>Congratulations on your new deployment!</p>',
    timestamp: '2024-07-28T18:45:00Z',
    isRead: true,
    isStarred: false,
    folder: Folder.INBOX,
  },
   {
    id: '8',
    conversationId: 'conv-4',
    senderName: 'Figma',
    senderEmail: 'team@figma.com',
    recipientEmail: 'you@example.com',
    subject: 'New design updates for Project Alpha',
    snippet: 'Hey, I’ve pushed the latest designs for the main dashboard. Please take a look and let me know your thoughts.',
    body: '<p>Hey, I’ve pushed the latest designs for the main dashboard. Please take a look and let me know your thoughts. They are available in the shared Figma file.</p>',
    timestamp: '2024-07-29T12:00:00Z',
    isRead: true,
    isStarred: false,
    folder: 'Projects',
  },
  {
    id: '4',
    conversationId: 'conv-5',
    senderName: 'Jane Doe',
    senderEmail: 'jane.d@example.com',
    recipientEmail: 'you@example.com',
    subject: 'Re: Lunch tomorrow?',
    snippet: 'Sounds great! How about 12:30 PM at The Corner Cafe? They have great sandwiches.',
    body: `<p>Sounds great! How about 12:30 PM at The Corner Cafe? They have great sandwiches.</p><p>See you then!</p><p>- Jane</p>`,
    timestamp: '2024-07-28T15:00:00Z',
    isRead: true,
    isStarred: true,
    folder: Folder.INBOX,
  },
  {
    id: '5',
    conversationId: 'conv-6',
    senderName: 'Me',
    senderEmail: 'you@example.com',
    recipientEmail: 'team@example.com',
    subject: 'Weekly Report',
    snippet: 'Please find attached the weekly performance report. Overall, we are on track with our KPIs.',
    body: '<p>Hi Team,</p><p>Please find attached the weekly performance report. Overall, we are on track with our KPIs.</p><p>Regards,<br/>Me</p>',
    timestamp: '2024-07-26T17:00:00Z',
    isRead: true,
    isStarred: false,
    folder: Folder.SENT,
  },
  {
    id: '6',
    conversationId: 'conv-7',
    senderName: 'Me',
    senderEmail: 'you@example.com',
    recipientEmail: 'mom@example.com',
    subject: '(no subject)',
    snippet: 'Thinking of visiting this weekend, will you be around?',
    body: '<p>Hi Mom,</p><p>Thinking of visiting this weekend, will you be around?</p><p>Love,<br/>Me</p>',
    timestamp: '2024-07-29T11:00:00Z',
    isRead: true,
    isStarred: false,
    folder: Folder.DRAFTS,
  },
  {
    id: '7',
    conversationId: 'conv-8',
    senderName: 'Me',
    senderEmail: 'you@example.com',
    recipientEmail: 'future.self@example.com',
    subject: 'Reminder: Check on project status',
    snippet: 'Scheduled reminder to follow up with the design team.',
    body: '<p>Just a reminder to check in with the design team about the new mockups.</p>',
    timestamp: new Date().toISOString(),
    isRead: true,
    isStarred: false,
    folder: Folder.SCHEDULED,
    scheduledSendTime: getFutureDate(15), // 15 minutes from now
  },
];
