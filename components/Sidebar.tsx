import React, { useState, useRef } from 'react';
import { Folder } from '../types';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { InboxIcon } from './icons/InboxIcon';
import { StarIcon } from './icons/StarIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ClockIcon } from './icons/ClockIcon';
import { FolderIcon } from './icons/FolderIcon';
import { FolderPlusIcon } from './icons/FolderPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';

const systemFolderIcons: Record<string, React.ReactNode> = {
  [Folder.INBOX]: <InboxIcon className="w-5 h-5" />,
  [Folder.STARRED]: <StarIcon className="w-5 h-5" />,
  [Folder.SENT]: <PaperAirplaneIcon className="w-5 h-5" />,
  [Folder.SCHEDULED]: <ClockIcon className="w-5 h-5" />,
  [Folder.DRAFTS]: <DocumentIcon className="w-5 h-5" />,
  [Folder.TRASH]: <TrashIcon className="w-5 h-5" />,
};

const droppableSystemFolders = [Folder.INBOX, Folder.TRASH];

const FolderItem: React.FC<{
  folderName: string;
  icon: React.ReactNode;
  isActive: boolean;
  count: number;
  isUnread?: boolean;
  onClick: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  isDroppable?: boolean;
  isSidebarCollapsed?: boolean;
}> = ({ folderName, icon, isActive, count, isUnread, onClick, onRename, onDelete, isDroppable, isSidebarCollapsed }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(folderName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { moveConversations } = useAppContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleRename = () => {
    if (onRename && editedName.trim() && editedName !== folderName) {
      onRename(editedName.trim());
    }
    setIsEditing(false);
  };
  
  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleDragOver = (e: React.DragEvent) => {
    if (isDroppable) {
      e.preventDefault();
    }
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    if (isDroppable) {
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDragOver(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isDroppable) {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragOver(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isDroppable) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      try {
        const data = e.dataTransfer.getData('application/json');
        const { conversationIds } = JSON.parse(data);
        if (Array.isArray(conversationIds) && conversationIds.length > 0) {
          moveConversations(conversationIds, folderName);
        }
      } catch (error) {
        console.error("Failed to parse drop data:", error);
      }
    }
  };

  const justifyContent = isSidebarCollapsed ? 'justify-center' : 'justify-between';
  const baseClasses = `group flex items-center ${justifyContent} px-4 py-2 my-1 text-sm rounded-full cursor-pointer transition-all duration-200 ease-in-out`;
  const dragOverClasses = 'scale-105 bg-blue-100 dark:bg-blue-900/50 ring-2 ring-primary shadow-lg';
  const activeClasses = 'bg-primary text-white font-bold';
  const inactiveClasses = 'text-gray-700 dark:text-dark-on-surface hover:bg-gray-200 dark:hover:bg-dark-surface';

  let dynamicClasses;
  if(isDroppable && isDragOver) {
    dynamicClasses = dragOverClasses;
  } else if (isActive) {
    dynamicClasses = activeClasses;
  } else {
    dynamicClasses = inactiveClasses;
  }

  return (
    <li
      className={`${baseClasses} ${dynamicClasses}`}
      onClick={isEditing ? undefined : onClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title={isSidebarCollapsed ? folderName : undefined}
    >
      <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? '' : 'space-x-4 flex-grow'}`}>
        {icon}
        {!isSidebarCollapsed && (
            isEditing ? (
            <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="bg-transparent focus:outline-none w-full"
            />
            ) : (
            <span className="truncate">{folderName}</span>
            )
        )}
      </div>
      {!isSidebarCollapsed && (
        <div className="flex items-center flex-shrink-0">
          {onRename && onDelete && !isActive && (
            <div className="hidden group-hover:flex items-center space-x-1 ml-2">
              <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`p-1 rounded-full ${isActive ? 'hover:bg-white/20' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}><PencilIcon className="w-4 h-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`p-1 rounded-full ${isActive ? 'hover:bg-white/20' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}><TrashIcon className="w-4 h-4" /></button>
            </div>
          )}
          {count > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full group-hover:hidden ${
                isActive ? 'text-white' : 
                isUnread ? 'text-gray-600 bg-gray-300 dark:text-gray-200 dark:bg-gray-600' : 'text-gray-500'
            }`}>
              {count}
            </span>
          )}
        </div>
      )}
    </li>
  );
};


const Sidebar: React.FC = () => {
  const { currentFolder, setCurrentFolder, emails, openCompose, userFolders, createUserFolder, renameUserFolder, deleteUserFolder, simulateNewEmail, isSidebarCollapsed } = useAppContext();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleFolderClick = (folder: string) => {
    setCurrentFolder(folder);
  };
  
  const handleComposeClick = () => {
    openCompose();
  }

  const folderCounts = React.useMemo(() => {
    return emails.reduce((acc, email) => {
      const folder = email.folder;
      acc[folder] = (acc[folder] || 0) + (folder === Folder.INBOX && !email.isRead ? 1 : (folder !== Folder.INBOX ? 1 : 0));
      if (folder === Folder.INBOX && email.isRead) {
         // for total inbox count, but we only show unread
      } else {
         acc[folder] = (acc[folder] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [emails]);
  
  const unreadCount = emails.filter(e => e.folder === Folder.INBOX && !e.isRead).length;

  const handleCreateFolder = () => {
      if (createUserFolder(newFolderName)) {
          setNewFolderName('');
          setIsCreatingFolder(false);
      }
  }

  return (
    <aside className={`flex-shrink-0 p-2 bg-surface-container dark:bg-dark-surface-container flex flex-col justify-between transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div>
        <div className="p-2">
          <button 
            onClick={handleComposeClick}
            className={`flex items-center w-full px-4 py-3 space-x-2 font-semibold text-gray-700 dark:text-gray-800 transition-all duration-150 bg-compose-accent rounded-2xl hover:shadow-lg justify-center`}
            title={isSidebarCollapsed ? 'Compose' : undefined}
            >
            <PencilIcon className="w-6 h-6" />
            {!isSidebarCollapsed && <span>Compose</span>}
          </button>
        </div>
        <nav className="mt-4">
          <ul>
            {Object.values(Folder).map((folder) => {
              if (folder === Folder.STARRED) return null;
              const count = folder === Folder.INBOX ? unreadCount : folderCounts[folder] || 0;
              return (
                <FolderItem 
                  key={folder}
                  folderName={folder}
                  icon={systemFolderIcons[folder]}
                  isActive={currentFolder === folder}
                  count={count}
                  isUnread={folder === Folder.INBOX && count > 0}
                  onClick={() => handleFolderClick(folder)}
                  isDroppable={droppableSystemFolders.includes(folder)}
                  isSidebarCollapsed={isSidebarCollapsed}
                />
              );
            })}
          </ul>
          <div className="mt-4 pt-4 border-t border-outline dark:border-dark-outline">
              {!isSidebarCollapsed && <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Folders</h3>}
              <ul>
                  {userFolders.map(folder => (
                      <FolderItem
                          key={folder.id}
                          folderName={folder.name}
                          icon={<FolderIcon className="w-5 h-5"/>}
                          isActive={currentFolder === folder.name}
                          count={folderCounts[folder.name] || 0}
                          onClick={() => handleFolderClick(folder.name)}
                          onRename={(newName) => renameUserFolder(folder.name, newName)}
                          onDelete={() => deleteUserFolder(folder.name)}
                          isDroppable={true}
                          isSidebarCollapsed={isSidebarCollapsed}
                      />
                  ))}
                  {isCreatingFolder ? (
                      <li className="flex items-center px-4 py-2 my-1 text-sm">
                          {!isSidebarCollapsed && <FolderIcon className="w-5 h-5 mr-4"/>}
                          <input
                              type="text"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                              onBlur={() => { if(!newFolderName) setIsCreatingFolder(false); else handleCreateFolder(); }}
                              placeholder="New folder name"
                              className="bg-transparent focus:outline-none w-full"
                              autoFocus
                          />
                          <button onClick={() => setIsCreatingFolder(false)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><XMarkIcon className="w-4 h-4"/></button>
                      </li>
                  ) : (
                      <li onClick={() => setIsCreatingFolder(true)} className={`flex items-center px-4 py-2 my-1 text-sm rounded-full text-gray-700 dark:text-dark-on-surface hover:bg-gray-200 dark:hover:bg-dark-surface cursor-pointer ${isSidebarCollapsed && 'justify-center'}`} title={isSidebarCollapsed ? 'Create new folder' : undefined}>
                          <FolderPlusIcon className="w-5 h-5"/>
                          {!isSidebarCollapsed && <span className="ml-4">Create new folder</span>}
                      </li>
                  )}
              </ul>
          </div>
        </nav>
      </div>
      <div className="p-4">
        <button onClick={simulateNewEmail} className={`w-full flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-surface p-2 rounded-lg ${isSidebarCollapsed ? 'justify-center' : 'justify-center'}`} title="Test your rules and auto-responder">
            <SparklesIcon className="w-4 h-4 text-blue-500" />
            {!isSidebarCollapsed && <span>Simulate New Email</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;