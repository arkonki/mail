
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import 'express-session'; // Fixes type augmentation for req.session
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
    origin: 'http://localhost:8080', // Adjust if your frontend runs on a different port
    credentials: true,
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

declare module 'express-session' {
  interface SessionData {
    user: { email: string; pass: string };
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
        authTimeout: 5000,
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

// HELPER: Find the name of the trash folder
const findTrashFolder = (boxes: { [name: string]: any }): string | null => {
    const trashNames = ['Trash', 'Bin', 'Deleted Items', '[Gmail]/Trash'];
    const boxNames = Object.keys(boxes);
    for (const name of trashNames) {
        const found = boxNames.find(boxName => boxName.toLowerCase() === name.toLowerCase());
        if (found) return found;
    }
    // Fallback for nested trash folders
    for (const name of trashNames) {
        const found = boxNames.find(boxName => boxName.toLowerCase().endsWith(`.${name.toLowerCase()}`));
        if (found) return found;
    }
    return null;
}

app.post('/api/login', async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }
    
    try {
        const config = getImapConfig({ email, pass: password });
        const connection = await Imap.connect(config);
        await connection.end();
        req.session.user = { email, pass: password };
        res.status(200).json({ message: 'Login successful' });
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

app.post('/api/logout', (req: express.Request, res: express.Response) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.clearCookie('connect.sid');
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
            signature: { isEnabled: true, body: `Cheers,<br>${email.split('@')[0]}` },
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
        await connection.openBox(mailbox); // true for read-write
        
        const searchCriteria = ['ALL'];
        const fetchOptions: any = {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE IN-REPLY-TO MESSAGE-ID)', 'TEXT'],
            struct: true,
            markSeen: false,
        };
        
        const messages = await connection.search(searchCriteria, fetchOptions);
        const emails: any[] = [];

        for (const item of messages) {
            const all = item.parts.find(part => part.which === 'TEXT');
            const header = item.parts.find(part => part.which.startsWith('HEADER.FIELDS'));

            if (!header || !all) continue;
            
            const rawMail = header.body + all.body;
            const mail: ParsedMail = await simpleParser(rawMail);
            
            const fromAddress = mail.from?.value?.[0];
            const fromName = mail.from?.text || fromAddress?.name || '';

            let toAddresses: Address[] = [];
            if (mail.to) {
                const toHeader = Array.isArray(mail.to) ? mail.to : [mail.to];
                toAddresses = toHeader.flatMap(addrObj => addrObj.value);
            }
            const recipientText = toAddresses.map(t => t.name || t.address).join(', ');
            
            emails.push({
                id: item.attributes.uid,
                conversationId: mail.inReplyTo || mail.messageId || `conv-${item.attributes.uid}`,
                senderName: fromName,
                senderEmail: fromAddress?.address || '',
                recipientEmail: recipientText,
                subject: mail.subject || '(no subject)',
                body: mail.html || mail.textAsHtml || '',
                snippet: (mail.text || '').substring(0, 100),
                timestamp: mail.date?.toISOString() || new Date().toISOString(),
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
    const { to, subject, body, attachments } = req.body;
    const transport = getSmtpTransport(req.session.user!);

    try {
        await transport.sendMail({
            from: req.session.user!.email,
            to: to,
            subject: subject,
            html: body,
            // attachments: attachments // Requires backend file handling
        });
        res.status(200).send('Email sent successfully');
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

const performAction = async (user: { email: string; pass: string }, actions: Action[], actionFn: (connection: Imap.ImapSimple, uids: number[]) => Promise<any>) => {
    const connection = await Imap.connect(getImapConfig(user));
    try {
        for (const action of actions) {
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
    await performAction(req.session.user!, actions, async (conn, uids) => {
        await conn.moveMessage(uids.join(','), targetFolder);
    });
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
        const trashFolder = findTrashFolder(boxes);
        
        if (!trashFolder) {
            throw new Error("Could not find a trash folder.");
        }

        for (const action of actions) {
            await connection.openBox(action.mailbox);
            if (action.mailbox.toLowerCase() === trashFolder.toLowerCase()) {
                // Permanently delete
                await connection.addFlags(action.uids, '\\Deleted');
            } else {
                // Move to trash
                await connection.moveMessage(action.uids.join(','), trashFolder);
            }
        }
        res.status(200).send('Deleted successfully.');
    } catch (e) {
        console.error("Delete failed:", e);
        res.status(500).send("Failed to delete emails.");
    } finally {
        await connection.end();
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
