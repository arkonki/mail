
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import * as Imap from 'imap-simple';
import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';

dotenv.config();

// Define Address type locally as it's not exported from mailparser
interface Address {
    name: string;
    address?: string;
}

const app: express.Express = express();
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8080',
    credentials: true,
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-secret',
    resave: false,
    saveUninitialized: false, // Set to false to prevent empty sessions
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

declare module 'express-session' {
  interface SessionData {
    user: { email: string; pass: string; name: string; };
  }
}

// Placeholder for settings
let userSettings: {[email: string]: any} = {};


const getImapConfig = (user: {email: string, pass: string}) => ({
    imap: {
        user: user.email,
        password: user.pass,
        host: 'mail.veebimajutus.ee',
        port: 993,
        tls: true,
        authTimeout: 10000,
         tlsOptions: {
            rejectUnauthorized: false
        }
    }
});

const getSmtpTransport = (user: {email: string, pass: string}) => {
    return nodemailer.createTransport({
        host: 'mail.veebimajutus.ee',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: user.email,
            pass: user.pass,
        },
    });
};

// HELPER: Find the name of a special folder
const findSpecialFolder = (boxes: { [name: string]: any }, folderKeywords: string[]): string | null => {
    const boxNames = Object.keys(boxes);
    for (const name of folderKeywords) {
        const found = boxNames.find(boxName => boxName.toLowerCase() === name.toLowerCase());
        if (found) return found;
    }
    // Fallback for nested folders (e.g., [Gmail]/Trash)
    for (const name of folderKeywords) {
        const found = boxNames.find(boxName => boxName.toLowerCase().includes(name.toLowerCase()));
        if (found) return found;
    }
    return null;
}

app.post('/api/login', async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        const config = getImapConfig({ email, pass: password });
        const connection = await Imap.connect(config);
        await connection.end();
        req.session.user = { email, pass: password, name: email.split('@')[0] };
        res.status(200).json({ email: req.session.user.email, name: req.session.user.name });
    } catch (error: any) {
        console.error('Login failed:', error.message);
        if (error.message && error.message.includes('AUTHENTICATIONFAILED')) {
            res.status(401).send('Authentication failed. Please check your credentials. If you use 2-Factor Authentication, you may need an App Password.');
        } else if (error.message && error.message.includes('TIMEDOUT')) {
            res.status(408).send('Login timed out. Please check your network connection and mail server details.');
        } else {
            res.status(401).send('Login failed. Unable to connect to mail server.');
        }
    }
});

app.get('/api/me', (req: express.Request, res: express.Response) => {
    if (req.session.user) {
        res.status(200).json({ email: req.session.user.email, name: req.session.user.name });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

app.post('/api/logout', (req: express.Request, res: express.Response) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.clearCookie('connect.sid'); // The default session cookie name
        res.status(200).send('Logged out successfully');
    });
});

// Middleware to check for authentication
const checkAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session.user) {
        return res.status(401).send('Not authenticated');
    }
    next();
};

app.get('/api/settings', checkAuth, (req: express.Request, res: express.Response) => {
    const email = req.session.user!.email;
    if (!userSettings[email]) {
        userSettings[email] = {
            signature: { isEnabled: true, body: `Cheers,<br>${req.session.user!.name}` },
            autoResponder: { isEnabled: false, subject: 'Out of Office', message: 'I am currently unavailable.'},
            rules: [],
        };
    }
    res.json(userSettings[email]);
});

app.post('/api/settings', checkAuth, (req: express.Request, res: express.Response) => {
    const email = req.session.user!.email;
    userSettings[email] = { ...userSettings[email], ...req.body.settings };
    res.status(200).json(userSettings[email]);
});


app.get('/api/mailboxes', checkAuth, async (req: express.Request, res: express.Response) => {
    try {
        const connection = await Imap.connect(getImapConfig(req.session.user!));
        const boxes = await connection.getBoxes();
        await connection.end();
        const folderList = Object.keys(boxes).map(name => ({
            id: name,
            name: name,
        }));
        res.json(folderList);
    } catch (error) {
        console.error('Failed to get mailboxes:', error);
        res.status(500).send('Failed to get mailboxes');
    }
});

app.get('/api/emails/:mailbox', checkAuth, async (req: express.Request, res: express.Response) => {
    const mailbox = req.params.mailbox;
    try {
        const connection = await Imap.connect(getImapConfig(req.session.user!));
        await connection.openBox(mailbox); // read-write by default
        
        const searchCriteria = ['ALL'];
        const fetchOptions = {
            bodies: [''],
            struct: true,
            markSeen: false,
            flags: true,
        };
        
        const messages = await connection.search(searchCriteria, fetchOptions);
        const emails: any[] = [];

        for (const item of messages) {
            const rawMail = item.parts.find((part: { which: string; body: string }) => part.which === '')?.body;
            if (!rawMail) continue;
            
            const mail: ParsedMail = await simpleParser(rawMail);
            
            const fromAddress = mail.from?.value?.[0];
            const toAddresses = Array.isArray(mail.to) ? mail.to.flatMap(t => t.value) : mail.to?.value || [];

            emails.push({
                id: item.attributes.uid.toString(),
                conversationId: mail.inReplyTo || mail.messageId || `conv-${item.attributes.uid}`,
                senderName: fromAddress?.name || fromAddress?.address || 'Unknown Sender',
                senderEmail: fromAddress?.address || '',
                recipientEmail: toAddresses.map(t => t.address).join(', '),
                subject: mail.subject || '(no subject)',
                body: mail.html || mail.textAsHtml || '',
                snippet: (mail.text || '').substring(0, 100),
                timestamp: mail.date?.toISOString() || new Date(item.attributes.date).toISOString(),
                isRead: item.attributes.flags.includes('\\Seen'),
                isStarred: item.attributes.flags.includes('\\Flagged'),
                folder: mailbox,
                attachments: mail.attachments.map(att => ({ fileName: att.filename || 'attachment', fileSize: att.size }))
            });
        }
        
        await connection.end();
        res.json(emails.reverse());

    } catch (error) {
        console.error(`Failed to get emails from ${mailbox}:`, error);
        res.status(500).send(`Failed to get emails from ${mailbox}`);
    }
});

app.post('/api/send', checkAuth, async (req: express.Request, res: express.Response) => {
    const { to, subject, body } = req.body;
    const transport = getSmtpTransport(req.session.user!);

    try {
        const info = await transport.sendMail({
            from: `"${req.session.user!.name}" <${req.session.user!.email}>`,
            to: to,
            subject: subject,
            html: body,
            // attachments: attachments // Requires backend file handling
        });
        
        // Append to sent folder
        const connection = await Imap.connect(getImapConfig(req.session.user!));
        try {
            const boxes = await connection.getBoxes();
            const sentFolder = findSpecialFolder(boxes, ['Sent', 'Sent Items']);
            if (sentFolder) {
                // We need the full raw message to append it
                // This is a simplified version; a full implementation would reconstruct the raw message.
                const rawMessage = `From: "${req.session.user!.name}" <${req.session.user!.email}>\\r\\nTo: ${to}\\r\\nSubject: ${subject}\\r\\n\\r\\n${body.replace(/<[^>]*>?/gm, '')}`;
                await connection.append(rawMessage, { mailbox: sentFolder, flags: ['\\Seen'] });
            }
        } catch (imapError) {
            console.error("Failed to append to sent folder:", imapError);
            // Don't fail the whole request if this part fails
        } finally {
            await connection.end();
        }

        res.status(200).json({ message: 'Email sent successfully', messageId: info.messageId });
    } catch(error) {
        console.error('Failed to send email:', error);
        res.status(500).send('Failed to send email');
    }
});


interface Action {
    mailbox: string;
    uids: number[];
}

interface ActionRequest {
    actions: Action[];
}

const performAction = async (user: { email: string; pass: string; name: string }, actions: Action[], actionFn: (connection: Imap.ImapSimple, uids: number[]) => Promise<any>) => {
    const connection = await Imap.connect(getImapConfig(user));
    try {
        for (const action of actions) {
            if (action.uids.length === 0) continue;
            await connection.openBox(action.mailbox);
            await actionFn(connection, action.uids);
        }
    } finally {
        await connection.end();
    }
};

app.post('/api/actions/star', checkAuth, async (req: express.Request, res: express.Response) => {
    const { actions }: ActionRequest = req.body;
    const { isStarred } = req.body;
    try {
        await performAction(req.session.user!, actions, (conn, uids) => {
            return isStarred ? conn.addFlags(uids, '\\Flagged') : conn.delFlags(uids, '\\Flagged');
        });
        res.status(200).send('Star toggled successfully.');
    } catch(e) {
        console.error("Star toggle failed:", e);
        res.status(500).send("Failed to toggle star.");
    }
});

app.post('/api/actions/mark-as-read', checkAuth, async (req: express.Request, res: express.Response) => {
    const { actions }: ActionRequest = req.body;
    try {
        await performAction(req.session.user!, actions, (conn, uids) => conn.addFlags(uids, '\\Seen'));
        res.status(200).send('Marked as read.');
    } catch (e) {
        console.error("Mark as read failed:", e);
        res.status(500).send("Failed to mark as read.");
    }
});

app.post('/api/actions/mark-as-unread', checkAuth, async (req: express.Request, res: express.Response) => {
    const { actions }: ActionRequest = req.body;
    try {
        await performAction(req.session.user!, actions, (conn, uids) => conn.delFlags(uids, '\\Seen'));
        res.status(200).send('Marked as unread.');
    } catch (e) {
        console.error("Mark as unread failed:", e);
        res.status(500).send("Failed to mark as unread.");
    }
});

app.post('/api/actions/move', checkAuth, async (req: express.Request, res: express.Response) => {
  const { actions, targetFolder }: { actions: Action[], targetFolder: string } = req.body;
  try {
    await performAction(req.session.user!, actions, (conn, uids) => conn.moveMessage(uids.map(String), targetFolder));
    res.status(200).send('Moved successfully.');
  } catch(e) {
      console.error("Move failed:", e);
      res.status(500).send("Failed to move emails.");
  }
});

app.post('/api/actions/delete', checkAuth, async (req: express.Request, res: express.Response) => {
    const { actions }: ActionRequest = req.body;
    const connection = await Imap.connect(getImapConfig(req.session.user!));
    try {
        const boxes = await connection.getBoxes();
        const trashFolder = findSpecialFolder(boxes, ['Trash', 'Bin', 'Deleted Items']);
        
        if (!trashFolder) {
            throw new Error("Could not find a trash folder.");
        }

        for (const action of actions) {
            if (action.uids.length === 0) continue;
            await connection.openBox(action.mailbox);
            if (action.mailbox.toLowerCase() === trashFolder.toLowerCase()) {
                // Permanently delete
                await connection.deleteMessage(action.uids);
            } else {
                // Move to trash
                await connection.moveMessage(action.uids.map(String), trashFolder);
            }
        }
        res.status(200).send('Deleted successfully.');
    } catch (e: any) {
        console.error("Delete failed:", e);
        res.status(500).send(e.message || "Failed to delete emails.");
    } finally {
        await connection.end();
    }
});


// The following block can be used for local development.
// For serverless deployment (e.g., Netlify), this block should be commented out or removed.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Backend server running for local development on http://localhost:${PORT}`);
    });
}


// NOTE FOR NETLIFY DEPLOYMENT:
// The express app is exported for use in a serverless function environment.
// The traditional app.listen() is removed because Netlify handles the server lifecycle.
//
// IMPORTANT: express-session with the default in-memory store WILL NOT WORK in a
// stateless serverless environment. Each function invocation is a new instance.
// For proper user sessions, you must switch to a stateless authentication
// mechanism like JWTs (JSON Web Tokens) or use a session store backed by a
// database (e.g., Redis, DynamoDB). The in-memory `userSettings` object
// will also not persist between requests.
export default app;
