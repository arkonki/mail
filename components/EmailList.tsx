
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ConversationListItem from './EmailListItem';
import { TrashIcon } from './icons/TrashIcon';
import { MailIcon } from './icons/MailIcon';
import { InboxIcon } from './icons/InboxIcon';
import { FolderArrowDownIcon } from './icons/FolderArrowDownIcon';
import MoveToPopover from './MoveToPopover';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import SnoozePopover from './SnoozePopover';

const BulkActionBar = () => {
    const { selectedConversationIds, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, deselectAllConversations, moveConversations, markAsSpam, snoozeConversation } = useAppContext();
    const [isMovePopoverOpen, setIsMovePopoverOpen] = useState(false);
    const [isSnoozePopoverOpen, setIsSnoozePopoverOpen] = useState(false);
    const count = selectedConversationIds.size;

    const handleMove = (folder: string) => {
        moveConversations(Array.from(selectedConversationIds), folder);
        setIsMovePopoverOpen(false);
    };

    const handleSnooze = (date: Date) => {
        snoozeConversation(Array.from(selectedConversationIds), date);
        setIsSnoozePopoverOpen(false);
    }
    
    const handleMarkAsSpam = () => {
        markAsSpam(Array.from(selectedConversationIds));
        deselectAllConversations();
    }

    return (
        <div className="flex items-center justify-between p-2 bg-primary/10 dark:bg-primary/20 border-b border-outline dark:border-dark-outline">
            <div className="flex items-center">
                <button onClick={deselectAllConversations} className="px-2 py-1 text-sm font-semibold text-primary">
                    {count} selected
                </button>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={bulkMarkAsRead} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mark as read">
                    <MailIcon className="w-5 h-5" />
                </button>
                <button onClick={bulkMarkAsUnread} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mark as unread">
                    <InboxIcon className="w-5 h-5" />
                </button>
                <div className="relative">
                    <button onClick={() => setIsSnoozePopoverOpen(prev => !prev)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Snooze">
                        <ClockIcon className="w-5 h-5" />
                    </button>
                    {isSnoozePopoverOpen && <SnoozePopover onSnooze={handleSnooze} onClose={() => setIsSnoozePopoverOpen(false)} />}
                </div>
                <button onClick={handleMarkAsSpam} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mark as spam">
                    <ExclamationCircleIcon className="w-5 h-5" />
                </button>
                <div className="relative">
                    <button onClick={() => setIsMovePopoverOpen(prev => !prev)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Move to folder">
                        <FolderArrowDownIcon className="w-5 h-5" />
                    </button>
                    {isMovePopoverOpen && <MoveToPopover onMove={handleMove} onClose={() => setIsMovePopoverOpen(false)} />}
                </div>
                <button onClick={bulkDelete} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Delete">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


const EmailList: React.FC = () => {
  const { currentFolder, selectedConversationId, searchQuery, selectedConversationIds, selectAllConversations, deselectAllConversations, displayedConversations } = useAppContext();
  const isSearching = searchQuery.length > 0;
  
  const allDisplayedIds = displayedConversations.map(c => c.id);
  const areAllSelected = allDisplayedIds.length > 0 && allDisplayedIds.every(id => selectedConversationIds.has(id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      selectAllConversations(allDisplayedIds);
    } else {
      deselectAllConversations();
    }
  };
  
  const listTitle = isSearching ? `Search results for "${searchQuery}"` : currentFolder;
  const emptyMessage = isSearching ? `No results found for "${searchQuery}".` : `No messages in ${currentFolder}.`;
  
  const showBulkActions = selectedConversationIds.size > 0;

  const renderContent = () => {
    if (displayedConversations.length === 0) {
        return (
            <div className="flex-grow flex items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
              <p>{emptyMessage}</p>
            </div>
        );
    }
    return (
        <ul className="flex-grow">
          {displayedConversations.map((conv) => (
            <ConversationListItem key={conv.id} conversation={conv} />
          ))}
        </ul>
    );
  };

  return (
    <div className={`flex-shrink-0 bg-white dark:bg-dark-surface border-r border-outline dark:border-dark-outline overflow-y-auto w-full md:w-1/3 flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        { showBulkActions ? <BulkActionBar /> : (
            <div className="p-4 border-b border-outline dark:border-dark-outline flex items-center space-x-4">
                <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 focus:ring-primary"
                    checked={areAllSelected}
                    onChange={handleSelectAll}
                    disabled={displayedConversations.length === 0}
                    title="Select all"
                />
                <h2 className="text-lg font-medium text-on-surface dark:text-dark-on-surface">{listTitle}</h2>
            </div>
        )}
      {renderContent()}
    </div>
  );
};

export default EmailList;
