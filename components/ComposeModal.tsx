

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ActionType, Folder, Contact } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import RichTextToolbar from './RichTextToolbar';

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
  const modalRef = useRef<HTMLDivElement>(null);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Contact[]>([]);

  useEffect(() => {
    if (composeState.isOpen && user) {
        const { action, email, recipient, bodyPrefix } = composeState;
        
        let finalBody = '';

        // Reset state for new composition
        setTo(recipient || '');
        setSubject('');
        setAttachments([]);

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
    }
  }, [composeState, appSettings.signature, user]);

  const handleBodyChange = (e: React.FormEvent<HTMLDivElement>) => {
    const editor = e.currentTarget;
    setBody(editor.innerHTML);
  };
  
  const addAttachments = (files: File[]) => { setAttachments(prev => [...prev, ...files]); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { addAttachments(Array.from(e.target.files)); } };
  const removeAttachment = (fileName: string) => { setAttachments(prev => prev.filter(file => file.name !== fileName)); };

  const handleSend = async () => {
    await sendEmail({ to, subject, body, attachments });
    closeCompose();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (modalRef.current && !modalRef.current.contains(e.relatedTarget as Node)) { setIsDraggingOver(false); } };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    addAttachments(Array.from(e.dataTransfer.files));
  };
  
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTo(value);
      if(value) {
          const suggestions = contacts.filter(c => 
              c.name.toLowerCase().includes(value.toLowerCase()) || 
              c.email.toLowerCase().includes(value.toLowerCase())
          );
          setAutocompleteSuggestions(suggestions);
      } else {
          setAutocompleteSuggestions([]);
      }
  };

  const handleSuggestionClick = (contact: Contact) => {
      setTo(contact.email);
      setAutocompleteSuggestions([]);
  };

  return (
    <div 
        className="fixed bottom-0 right-4 w-full max-w-2xl z-40"
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
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
                <p className="text-blue-600 font-bold text-lg">Drop to attach</p>
            </div>
        )}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-800 text-white rounded-t-lg">
          <h3 className="text-sm font-semibold">{composeState.action ? (subject || "Message") : 'New Message'}</h3>
          <button onClick={closeCompose} className="p-1 rounded-full hover:bg-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-2 border-b border-gray-200 dark:border-dark-outline relative">
          <div className="flex items-center">
            <label htmlFor="to" className="text-sm text-gray-500 dark:text-gray-400 w-16">To</label>
            <input type="email" id="to" value={to} onChange={handleToChange} className="w-full py-1 text-sm bg-transparent text-on-surface dark:text-dark-on-surface focus:outline-none" placeholder="Recipients" />
          </div>
           {autocompleteSuggestions.length > 0 && (
              <div className="absolute top-full left-16 w-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                {autocompleteSuggestions.map(contact => (
                  <div key={contact.id} onClick={() => handleSuggestionClick(contact)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.email}</p>
                  </div>
                ))}
              </div>
            )}
          <div className="border-t border-gray-200 dark:border-dark-outline"></div>
           <div className="flex items-center">
            <label htmlFor="subject" className="text-sm text-gray-500 dark:text-gray-400 w-16">Subject</label>
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
              <div className="flex rounded-md">
                 <button onClick={handleSend} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover disabled:bg-gray-400" disabled={!to}>Send</button>
              </div>
              
              <div className="flex">
                <RichTextToolbar />
              </div>

              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Attach files"><PaperClipIcon className="w-5 h-5"/></button>
              <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          </div>
          <button onClick={closeCompose} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Discard draft"><TrashIcon className="w-5 h-5"/></button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
