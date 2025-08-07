import React, { useRef } from 'react';
import { Conversation, Folder, ActionType, Email } from '../types';
import { useAppContext } from '../context/AppContext';
import { StarIconSolid } from './icons/StarIconSolid';
import { StarIcon as StarIconOutline } from './icons/StarIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';

interface ConversationListItemProps {
  conversation: Conversation;
}

const ConversationListItem: React.FC<ConversationListItemProps> = ({ conversation }) => {
  const { selectedConversationId, setSelectedConversationId, toggleStar, markAsRead, deleteConversation, selectedConversationIds, toggleConversationSelection, openCompose, moveConversations } = useAppContext();
  const isSelectedForView = selectedConversationId === conversation.id;
  const isChecked = selectedConversationIds.has(conversation.id);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  const latestEmail = conversation.emails[conversation.emails.length - 1];
  const isDraftOrScheduled = latestEmail.folder === Folder.DRAFTS || latestEmail.folder === Folder.SCHEDULED;

  const handleContainerClick = () => {
    if (isDraftOrScheduled) {
      openCompose(ActionType.DRAFT, latestEmail);
    } else {
      setSelectedConversationId(conversation.id);
      if (!conversation.isRead) {
          markAsRead(conversation.id);
      }
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleConversationSelection(conversation.id);
  }

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    toggleStar(conversation.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation([conversation.id]);
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toLocaleDateString() === now.toLocaleDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getParticipantsDisplay = () => {
    const names = conversation.participants.map(p => p.name === 'Me' ? 'You' : p.name.split(' ')[0]);
    if (names.length > 2) {
      return `${names.slice(0, 2).join(', ')}... (${names.length})`;
    }
    return names.join(', ');
  }

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>) => {
    const idsToMove = selectedConversationIds.has(conversation.id) ? Array.from(selectedConversationIds) : [conversation.id];
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ conversationIds: idsToMove }));

    const dragPreview = document.createElement('div');
    dragPreview.className = 'px-3 py-1 bg-primary text-white text-sm rounded-full shadow-lg';
    dragPreview.textContent = `Move ${idsToMove.length} item${idsToMove.length > 1 ? 's' : ''}`;
    
    dragPreview.style.position = 'absolute';
    dragPreview.style.left = '-1000px';
    document.body.appendChild(dragPreview);
    dragPreviewRef.current = dragPreview;

    e.dataTransfer.setDragImage(dragPreview, 10, 10);
  };

  const handleDragEnd = () => {
    if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
    }
  };


  return (
    <li
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group flex items-center px-2 py-3 border-b border-outline dark:border-dark-outline transition-colors duration-150 relative ${
        isSelectedForView ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-container'
      } ${!conversation.isRead && !isDraftOrScheduled ? 'bg-white dark:bg-dark-surface font-bold' : 'bg-surface dark:bg-dark-surface'}`}
    >
        <div className="flex items-center pl-2 pr-4" onClick={handleCheckboxClick}>
             <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 focus:ring-primary cursor-pointer"
            />
        </div>
        <div onClick={handleContainerClick} className="flex items-center w-full cursor-pointer">
            <button onClick={handleStarClick} className="p-2 mr-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-500/20 focus:outline-none">
            {conversation.isStarred ? <StarIconSolid className="w-5 h-5 text-yellow-500" /> : <StarIconOutline className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
            </button>
            <div className={`w-32 truncate mr-4 ${!conversation.isRead && !isDraftOrScheduled ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                {getParticipantsDisplay()}
                {conversation.emails.length > 1 && <span className="ml-1">({conversation.emails.length})</span>}
            </div>
            <div className="flex-grow truncate">
              {isDraftOrScheduled && latestEmail.folder === Folder.SCHEDULED && (
                <span className="inline-flex items-center text-xs font-medium mr-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  Scheduled
                </span>
              )}
               {isDraftOrScheduled && latestEmail.folder === Folder.DRAFTS && (
                <span className="inline-flex items-center text-xs font-medium mr-2 px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                  Draft
                </span>
              )}
              <span className={` ${!conversation.isRead && !isDraftOrScheduled ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-800 dark:text-gray-300'}`}>{conversation.subject}</span>
              <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">- {latestEmail.snippet}</span>
            </div>
            <div className="flex items-center">
                {conversation.hasAttachments && <PaperClipIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />}
                <div className={`ml-4 text-xs whitespace-nowrap transition-opacity duration-200 group-hover:opacity-0 ${!conversation.isRead && !isDraftOrScheduled ? 'text-primary font-bold' : 'text-gray-600 dark:text-gray-400'}`}>{formatDate(conversation.lastTimestamp)}</div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center bg-inherit">
                    <button onClick={handleDeleteClick} className="p-2 text-gray-500 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
      </div>
    </li>
  );
};

export default ConversationListItem;