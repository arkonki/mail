

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ActionType, Folder, Contact } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import RichTextToolbar from './RichTextToolbar';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import ScheduleSendPopover from './ScheduleSendPopover';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ComposeModal: React.FC = () => {
  const { composeState, closeCompose, sendEmail, appSettings, contacts, user } = useAppContext();
  
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Contact[]>([]);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<'to' | 'cc' | 'bcc' | null>(null);
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);

  useEffect(() => {
    if (composeState.isOpen && user) {
        const { action, email, recipient, bodyPrefix, initialData } = composeState;
        
        // Reset state for new composition unless restoring
        if (!initialData) {
            let finalBody = '';
            setTo(recipient || '');
            setCc('');
            setBcc('');
            setSubject('');
            setAttachments([]);
            setShowCc(false);
            setShowBcc(false);

            if (action === ActionType.REPLY && email) {
                setTo(email.senderEmail);
                setSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
                const formattedDate = new Date(email.timestamp).toLocaleString();
                const replyContent = bodyPrefix ? `<p>${bodyPrefix}</p>` : '<p><br></p>';
                const signature = appSettings.signature.isEnabled ? `<br><br>${appSettings.signature.body}` : '';
                finalBody = `${replyContent}${signature}<br><blockquote class="dark:border-gray-600">On ${formattedDate}, ${email.senderName} &lt;${email.senderEmail}&gt; wrote:<br>${email.body}</blockquote>`;
            } else if (action === ActionType.FORWARD && email) {
                setSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
                const formattedDate = new Date(email.timestamp).toLocaleString();
                const signature = appSettings.signature.isEnabled ? `<br><br>${appSettings.signature.body}` : '';
                finalBody = `<p><br></p>${signature}<br><blockquote class="dark:border-gray-600">--- Forwarded message ---<br><b>From:</b> ${email.senderName} &lt;${email.senderEmail}&gt;<br><b>Date:</b> ${formattedDate}<br><b>Subject:</b> ${email.subject}<br><br>${email.body}</blockquote>`;
            } else {
                // New message
                finalBody = appSettings.signature.isEnabled ? `<p><br></p><br>${appSettings.signature.body}` : '';
            }

            setBody(finalBody);
            if (contentRef.current) {
                contentRef.current.innerHTML = finalBody;
            }
        } else if (initialData) {
            // Restore from initialData (e.g., from an "Undo Send")
            setTo(initialData.to);
            setCc(initialData.cc || '');
            setBcc(initialData.bcc || '');
            setSubject(initialData.subject);
            setBody(initialData.body);
            setAttachments(initialData.attachments);
            if (contentRef.current) {
                contentRef.current.innerHTML = initialData.body;
            }
            if (initialData.cc) setShowCc(true);
            if (initialData.bcc) setShowBcc(true);
        }
    }
  }, [composeState, appSettings.signature, user]);

  const insertImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl && contentRef.current) {
            contentRef.current.focus();
            document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 4px;" alt="${file.name}"/>`);
            // The onInput event for contentEditable isn't triggered by execCommand, so update state manually
            setBody(contentRef.current.innerHTML);
        }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const editor = contentRef.current;
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));

        if (imageItem) {
            const blob = imageItem.getAsFile();
            if (!blob) return;
            
            event.preventDefault();
            insertImageFile(blob);
        }
    };
    
    editor.addEventListener('paste', handlePaste);
    return () => editor.removeEventListener('paste', handlePaste);
  }, [contentRef]);


  const handleBodyChange = (e: React.FormEvent<HTMLDivElement>) => {
    const editor = e.currentTarget;
    setBody(editor.innerHTML);
  };
  
  const addAttachments = (files: File[]) => { setAttachments(prev => [...prev, ...files]); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { addAttachments(Array.from(e.target.files)); } };
  const removeAttachment = (fileName: string) => { setAttachments(prev => prev.filter(file => file.name !== fileName)); };
  
  const handleEmbedImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      insertImageFile(e.target.files[0]);
    }
    e.target.value = ''; // Reset to allow selecting same file again
  };

  const handleSend = async () => {
    await sendEmail({ to, cc, bcc, subject, body, attachments });
  };
  
  const handleSchedule = async (date: Date) => {
    await sendEmail({ to, cc, bcc, subject, body, attachments, scheduleDate: date });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (!isDraggingOver) setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDraggingOver(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); dragCounter.current = 0;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const otherFiles = files.filter(file => !file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
        imageFiles.forEach(insertImageFile);
    }
    if (otherFiles.length > 0) {
        addAttachments(otherFiles);
    }
  };
  
 const handleRecipientChange = (value: string, field: 'to' | 'cc' | 'bcc') => {
    switch(field) {
        case 'to': setTo(value); break;
        case 'cc': setCc(value); break;
        case 'bcc': setBcc(value); break;
    }

    if (value) {
        const suggestions = contacts.filter(c =>
            c.name.toLowerCase().includes(value.toLowerCase()) ||
            c.email.toLowerCase().includes(value.toLowerCase())
        );
        setAutocompleteSuggestions(suggestions);
        setActiveAutocompleteField(field);
    } else {
        setAutocompleteSuggestions([]);
        setActiveAutocompleteField(null);
    }
};


  const handleSuggestionClick = (contact: Contact) => {
    if (!activeAutocompleteField) return;

    switch (activeAutocompleteField) {
        case 'to': setTo(contact.email); break;
        case 'cc': setCc(contact.email); break;
        case 'bcc': setBcc(contact.email); break;
    }
    setAutocompleteSuggestions([]);
    setActiveAutocompleteField(null);
  };

  const RecipientInput: React.FC<{field: 'to' | 'cc' | 'bcc', label: string, value: string}> = ({field, label, value}) => (
    <div className="flex items-center border-t border-gray-200 dark:border-dark-outline">
        <label htmlFor={field} className="py-2 text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">{label}</label>
        <div className="relative flex-grow">
            <input 
              type="email"
              id={field}
              value={value}
              onChange={(e) => handleRecipientChange(e.target.value, field)}
              onFocus={() => handleRecipientChange(value, field)}
              onBlur={() => setTimeout(() => setActiveAutocompleteField(null), 150)}
              className="w-full py-1 text-sm bg-transparent text-on-surface dark:text-dark-on-surface focus:outline-none"
              placeholder={label === 'To' ? 'Recipients' : `${label} recipients`}
            />
            {activeAutocompleteField === field && autocompleteSuggestions.length > 0 && (
              <div className="absolute top-full left-0 w-auto min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                {autocompleteSuggestions.map(contact => (
                  <div key={contact.id} onMouseDown={() => handleSuggestionClick(contact)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.email}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
    </div>
  );

  return (
    <div 
        className="fixed bottom-0 right-4 w-full max-w-2xl z-40"
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragOver={handleDragOver}
    >
      <style>{`
        .compose-editor[contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF; /* Equivalent to text-gray-400 */
          pointer-events: none;
        }
      `}</style>
      <div ref={modalRef} className="bg-white dark:bg-dark-surface-container rounded-t-lg shadow-2xl border-gray-300 dark:border-dark-outline border flex flex-col h-[60vh] relative">
        {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-80 border-2 border-dashed border-blue-500 rounded-t-lg flex items-center justify-center z-10 pointer-events-none">
                <p className="text-blue-600 font-bold text-lg">Drop to embed image or attach file</p>
            </div>
        )}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-800 text-white rounded-t-lg">
          <h3 className="text-sm font-semibold">{composeState.action ? (subject || "Message") : 'New Message'}</h3>
          <button onClick={closeCompose} className="p-1 rounded-full hover:bg-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="px-4 border-b border-gray-200 dark:border-dark-outline">
            <div className="flex items-center">
                <label htmlFor="to" className="py-2 text-sm text-gray-500 dark:text-gray-400 w-16">To</label>
                <div className="relative flex-grow">
                     <input type="email" id="to" value={to} onChange={(e) => handleRecipientChange(e.target.value, 'to')} onFocus={() => handleRecipientChange(to, 'to')} onBlur={() => setTimeout(() => setActiveAutocompleteField(null), 150)} className="w-full py-1 text-sm bg-transparent text-on-surface dark:text-dark-on-surface focus:outline-none" placeholder="Recipients" />
                    {activeAutocompleteField === 'to' && autocompleteSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-auto min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                        {autocompleteSuggestions.map(contact => (
                            <div key={contact.id} onMouseDown={() => handleSuggestionClick(contact)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            <p className="font-semibold">{contact.name}</p>
                            <p className="text-xs text-gray-500">{contact.email}</p>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 pl-2">
                    <button type="button" onClick={() => setShowCc(s => !s)} className={`text-sm p-1 rounded ${showCc ? 'text-primary font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}>Cc</button>
                    <button type="button" onClick={() => setShowBcc(s => !s)} className={`text-sm p-1 rounded ${showBcc ? 'text-primary font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}>Bcc</button>
                </div>
            </div>
            
            {showCc && <RecipientInput field="cc" label="Cc" value={cc} />}
            {showBcc && <RecipientInput field="bcc" label="Bcc" value={bcc} />}

            <div className="flex items-center border-t border-gray-200 dark:border-dark-outline">
                <label htmlFor="subject" className="py-2 text-sm text-gray-500 dark:text-gray-400 w-16">Subject</label>
                <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full py-1 text-sm bg-transparent text-on-surface dark:text-dark-on-surface focus:outline-none" placeholder="(no subject)" />
            </div>
        </div>
        <div 
            ref={contentRef} 
            onInput={handleBodyChange} 
            contentEditable="true" 
            data-placeholder="Your message here..."
            className="compose-editor flex-grow p-4 overflow-y-auto text-sm bg-transparent text-on-surface dark:text-dark-on-surface resize-none focus:outline-none" 
        />
         {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-dark-outline">
                <ul className="flex flex-wrap gap-2">
                    {attachments.map(file => (
                        <li key={file.name} className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full py-1 pl-3 pr-2 text-sm text-gray-700 dark:text-gray-200">
                            <span className="truncate max-w-xs">{file.name} ({formatFileSize(file.size)})</span>
                            <button onClick={() => removeAttachment(file.name)} className="ml-2 p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><XMarkIcon className="w-3 h-3"/></button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface-container border-t border-gray-200 dark:border-dark-outline">
          <div className="flex items-center space-x-2 relative">
             <div className="flex rounded-md shadow-sm">
                 <button 
                     onClick={handleSend} 
                     className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-l-md hover:bg-primary-hover disabled:bg-gray-400" 
                     disabled={!to}>
                     Send
                 </button>
                 <button 
                     onClick={() => setIsSchedulePopoverOpen(p => !p)} 
                     className="px-2 py-2 text-sm font-bold text-white bg-primary rounded-r-md hover:bg-primary-hover border-l border-blue-400 dark:border-blue-700"
                     title="Schedule send"
                     disabled={!to}
                    >
                     <ChevronDownIcon className="w-5 h-5"/>
                 </button>
             </div>
              {isSchedulePopoverOpen && <ScheduleSendPopover onSchedule={handleSchedule} onClose={() => setIsSchedulePopoverOpen(false)} />}
              
              <div className="flex">
                <RichTextToolbar onInsertImage={() => imageInputRef.current?.click()} />
              </div>

              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Attach files"><PaperClipIcon className="w-5 h-5"/></button>
              <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <input type="file" ref={imageInputRef} onChange={handleEmbedImage} className="hidden" accept="image/*" />
          </div>
          <button onClick={closeCompose} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Discard draft"><TrashIcon className="w-5 h-5"/></button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;