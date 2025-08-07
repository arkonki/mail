import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ActionType, Folder } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ComposeModal: React.FC = () => {
  const { composeState, closeCompose, sendEmail, saveDraft, deleteConversation } = useAppContext();
  const { action, email, conversationId } = composeState;
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  useEffect(() => {
    if (composeState.isOpen) {
        const isDraft = (action === ActionType.DRAFT && email) || email?.folder === 'Drafts';
        let initialBody = email?.body || '';

        setTo(isDraft ? email.recipientEmail : '');
        setSubject(isDraft ? (email.subject === '(no subject)' ? '' : email.subject) : '');
        setAttachments([]);

        if (action && email && !isDraft) {
          if (action === ActionType.REPLY) {
            setTo(email.senderEmail);
            setSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
            const formattedDate = new Date(email.timestamp).toLocaleString();
            initialBody = `<br><br><blockquote class="dark:border-gray-600">On ${formattedDate}, ${email.senderName} &lt;${email.senderEmail}&gt; wrote:<br>${email.body}</blockquote>`;
          } else if (action === ActionType.FORWARD) {
            setTo('');
            setSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
            const formattedDate = new Date(email.timestamp).toLocaleString();
            initialBody = `<br><br><blockquote class="dark:border-gray-600">--- Forwarded message ---<br><b>From:</b> ${email.senderName} &lt;${email.senderEmail}&gt;<br><b>Date:</b> ${formattedDate}<br><b>Subject:</b> ${email.subject}<br><br>${email.body}</blockquote>`;
          }
        }
        
        setBody(initialBody);
        setShowPlaceholder(initialBody === '');

        if (contentRef.current) {
          contentRef.current.innerHTML = initialBody;
        }
    }
  }, [composeState.isOpen, action, email]);

  const handleBodyChange = (e: React.FormEvent<HTMLDivElement>) => {
    const editor = e.currentTarget;
    setBody(editor.innerHTML);
    setShowPlaceholder(editor.textContent?.trim() === '' && editor.getElementsByTagName('img').length === 0);
  };
  
  const addAttachments = (files: File[]) => { setAttachments(prev => [...prev, ...files]); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { addAttachments(Array.from(e.target.files)); } };
  const removeAttachment = (fileName: string) => { setAttachments(prev => prev.filter(file => file.name !== fileName)); };

  const handleSend = () => {
    sendEmail({ to, subject, body, attachments }, composeState.draftId, conversationId);
    closeCompose();
  };

  const handleDiscard = () => {
    if (composeState.draftId && composeState.conversationId) { 
        deleteConversation([composeState.conversationId]);
    }
    closeCompose();
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (modalRef.current && !modalRef.current.contains(e.relatedTarget as Node)) { setIsDraggingOver(false); } };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    addAttachments(Array.from(e.dataTransfer.files));
  };


  return (
    <div 
        className="fixed bottom-0 right-4 w-full max-w-2xl z-40"
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <div ref={modalRef} className="bg-white dark:bg-dark-surface-container rounded-t-lg shadow-2xl border border-gray-300 dark:border-dark-outline flex flex-col h-[60vh] relative">
        {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-80 border-2 border-dashed border-blue-500 rounded-t-lg flex items-center justify-center z-10 pointer-events-none">
                <p className="text-blue-600 font-bold text-lg">Drop to attach</p>
            </div>
        )}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-800 text-white rounded-t-lg">
          <h3 className="text-sm font-semibold">{action ? (subject || "Message") : 'New Message'}</h3>
          <button onClick={closeCompose} className="p-1 rounded-full hover:bg-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-2 border-b border-gray-200 dark:border-dark-outline">
          <div className="flex items-center">
            <label htmlFor="to" className="text-sm text-gray-500 dark:text-gray-400 w-16">To</label>
            <input type="email" id="to" value={to} onChange={(e) => setTo(e.target.value)} className="w-full py-1 text-sm bg-transparent text-on-surface dark:text-dark-on-surface focus:outline-none" placeholder="Recipients" />
          </div>
          <div className="border-t border-gray-200 dark:border-dark-outline"></div>
           <div className="flex items-center">
            <label htmlFor="subject" className="text-sm text-gray-500 dark:text-gray-400 w-16">Subject</label>
            <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full py-1 text-sm bg-transparent text-on-surface dark:text-dark-on-surface focus:outline-none" placeholder="(no subject)" />
          </div>
        </div>
        <div className="relative flex-grow p-4 overflow-y-auto">
          <div ref={contentRef} onInput={handleBodyChange} contentEditable="true" className="w-full h-full text-sm bg-transparent text-on-surface dark:text-dark-on-surface resize-none focus:outline-none" />
          {showPlaceholder && (<div className="absolute top-4 left-4 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">Your message here...</div>)}
        </div>
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
          <div className="flex items-center space-x-2">
              <button onClick={handleSend} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover disabled:bg-gray-400" disabled={!to && !subject && !body}>Send</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Attach files"><PaperClipIcon className="w-5 h-5"/></button>
              <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          </div>
          <button onClick={handleDiscard} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Discard draft"><TrashIcon className="w-5 h-5"/></button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;