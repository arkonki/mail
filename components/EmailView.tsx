
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from './icons/ArrowUturnRightIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { StarIconSolid } from './icons/StarIconSolid';
import { StarIcon as StarIconOutline } from './icons/StarIcon';
import { MailIcon } from './icons/MailIcon';
import { ActionType, Email, Folder } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SingleEmailInThread: React.FC<{ email: Email; isExpanded: boolean; onToggle: () => void; onReply: (email: Email) => void; onForward: (email: Email) => void; onStar: (conversationId: string, isStarred: boolean) => void;}> = ({ email, isExpanded, onToggle, onReply, onForward, onStar }) => {
    const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

    return (
        <div className="border border-outline dark:border-dark-outline rounded-lg mb-4 bg-white dark:bg-dark-surface-container overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={onToggle}>
                <div className="flex items-center">
                    <UserCircleIcon className="w-8 h-8 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="font-semibold text-on-surface dark:text-dark-on-surface">{email.senderName}</span>
                        {!isExpanded && <span className="text-sm text-gray-500 dark:text-gray-400 sm:hidden">, {formatDate(email.timestamp)}</span>}
                        {isExpanded && <span className="hidden sm:inline mx-2 text-gray-400">&middot;</span>}
                        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">{formatDate(email.timestamp)}</span>
                    </div>
                </div>
                {!isExpanded && <p className="text-sm text-gray-600 dark:text-gray-400 truncate ml-4 flex-grow">{email.snippet}</p>}
            </div>
            {isExpanded && (
                <div className="px-6 pb-6">
                    <div className="border-t border-outline dark:border-dark-outline pt-4 flex justify-between items-start">
                         <p className="text-sm text-gray-500 dark:text-gray-400">to {email.recipientEmail}</p>
                         <div className="flex items-center">
                            <button onClick={() => onStar(email.conversationId, email.isStarred)} className="p-2 ml-4 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-500/20">
                                {email.isStarred ? <StarIconSolid className="w-5 h-5 text-yellow-500" /> : <StarIconOutline className="w-5 h-5 text-gray-400" />}
                            </button>
                             <button onClick={() => onReply(email)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Reply"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
                            <button onClick={() => onForward(email)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Forward"><ArrowUturnRightIcon className="w-5 h-5"/></button>
                         </div>
                    </div>
                    <div className="pt-4 prose dark:prose-invert max-w-none prose-a:text-primary dark:prose-a:text-blue-400" dangerouslySetInnerHTML={{ __html: email.body }} />
                    {email.attachments && email.attachments.length > 0 && (
                        <div className="pt-6 mt-6 border-t border-outline dark:border-dark-outline">
                            <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">{email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}</h3>
                            <ul className="flex flex-wrap gap-3">
                            {email.attachments.map((att, index) => (
                                <li key={index} className="flex items-center p-2 border border-outline dark:border-dark-outline rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer w-full sm:w-auto max-w-xs">
                                    <PaperClipIcon className="w-5 h-5 mr-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate text-on-surface dark:text-dark-on-surface" title={att.fileName}>{att.fileName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(att.fileSize)}</p>
                                    </div>
                                </li>
                            ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const EmailView: React.FC = () => {
  const { selectedConversationId, setSelectedConversationId, currentFolder, deleteConversation, openCompose, toggleStar, markAsSpam, markAsNotSpam, displayedConversations } = useAppContext();
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  
  const selectedConversation = displayedConversations.find(c => c.id === selectedConversationId);
  const latestEmail = selectedConversation?.emails[selectedConversation.emails.length - 1];

  useEffect(() => {
    if (selectedConversation) {
      const latestEmailId = selectedConversation.emails[selectedConversation.emails.length - 1].id;
      setExpandedEmails(new Set([latestEmailId]));
    }
  }, [selectedConversation]);

  if (!selectedConversation) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400">
        <MailIcon className="w-24 h-24 text-gray-200 dark:text-gray-700" />
        <p className="mt-4 text-lg">Select a conversation to read</p>
        <p className="text-sm">You are in the {currentFolder} folder</p>
      </div>
    );
  }

  const handleToggleExpand = (emailId: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      newSet.has(emailId) ? newSet.delete(emailId) : newSet.add(emailId);
      return newSet;
    });
  };
  
  const handleReply = () => openCompose({ action: ActionType.REPLY, email: latestEmail });
  const handleForward = () => openCompose({ action: ActionType.FORWARD, email: latestEmail });
  const handleStarConversation = () => toggleStar(selectedConversation.id, selectedConversation.isStarred);
  const handleDeleteConversation = () => deleteConversation([selectedConversation.id]);
  const handleSpamAction = () => {
      if(currentFolder === Folder.SPAM) {
          markAsNotSpam([selectedConversation.id]);
      } else {
          markAsSpam([selectedConversation.id]);
      }
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-y-auto">
      <div className="p-4 border-b border-outline dark:border-dark-outline bg-white dark:bg-dark-surface-container sticky top-0 z-10">
        <div className="flex justify-between items-center">
            <div className="flex items-center min-w-0">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className="p-2 mr-2 -ml-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Back to list"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-normal text-on-surface dark:text-dark-on-surface truncate pr-4">{selectedConversation.subject}</h2>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                 <button onClick={handleSpamAction} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title={currentFolder === Folder.SPAM ? "Not spam" : "Mark as spam"}>
                    <ExclamationCircleIcon className="w-5 h-5"/>
                </button>
                <button onClick={handleStarConversation} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-500/20" title={selectedConversation.isStarred ? 'Unstar conversation' : 'Star conversation'}>
                    {selectedConversation.isStarred ? <StarIconSolid className="w-5 h-5 text-yellow-500" /> : <StarIconOutline className="w-5 h-5 text-gray-400" />}
                </button>
                <button onClick={handleReply} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Reply to latest"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
                <button onClick={handleForward} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Forward latest"><ArrowUturnRightIcon className="w-5 h-5"/></button>
                <button onClick={handleDeleteConversation} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete conversation"><TrashIcon className="w-5 h-5"/></button>
            </div>
        </div>
        {currentFolder === Folder.SPAM && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-sm rounded-md mx-4">
                This conversation is in Spam. Messages in Spam will be deleted after 30 days.
            </div>
        )}
      </div>
      <div className="p-6">
        {selectedConversation.emails.map(email => (
            <SingleEmailInThread 
                key={email.id} 
                email={email}
                isExpanded={expandedEmails.has(email.id)}
                onToggle={() => handleToggleExpand(email.id)}
                onReply={(email) => openCompose({ action: ActionType.REPLY, email })}
                onForward={(email) => openCompose({ action: ActionType.FORWARD, email })}
                onStar={toggleStar}
            />
        ))}
      </div>
    </div>
  );
};

export default EmailView;
