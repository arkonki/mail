
import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { InboxIcon } from './icons/InboxIcon';
import { StarIcon } from './icons/StarIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FolderIcon } from './icons/FolderIcon';
import { Folder } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { FolderPlusIcon } from './icons/FolderPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';


const getSystemFolderIcon = (folderName: string): React.ReactNode => {
    switch (folderName) {
        case Folder.INBOX: return <InboxIcon className="w-5 h-5" />;
        case Folder.STARRED: return <StarIcon className="w-5 h-5" />;
        case Folder.SNOOZED: return <ClockIcon className="w-5 h-5" />;
        case Folder.SENT: return <PaperAirplaneIcon className="w-5 h-5" />;
        case Folder.SCHEDULED: return <ClockIcon className="w-5 h-5" />;
        case Folder.SPAM: return <ExclamationCircleIcon className="w-5 h-5" />;
        case Folder.DRAFTS: return <DocumentIcon className="w-5 h-5" />;
        case Folder.TRASH: return <TrashIcon className="w-5 h-5" />;
        default: return <FolderIcon className="w-5 h-5" />;
    }
}

interface NavItemProps {
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isSidebarCollapsed?: boolean;
  onDrop?: (e: React.DragEvent) => void;
  isDroppable?: boolean;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  isUserFolder?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ name, icon, isActive, onClick, isSidebarCollapsed, onDrop, isDroppable = true, onRename, onDelete, isUserFolder }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(name);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if(isDroppable) setIsDropTarget(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if(dragCounter.current === 0) setIsDropTarget(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    dragCounter.current = 0;
    setIsDropTarget(false);
    if(onDrop) onDrop(e);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(onRename && editingName.trim()) onRename(editingName.trim());
      setIsEditing(false);
  }

  const justifyContent = isSidebarCollapsed ? 'justify-center' : 'justify-between';
  const baseClasses = `group relative flex items-center ${justifyContent} px-4 py-2 my-1 text-sm rounded-full cursor-pointer transition-all duration-200 ease-in-out`;
  const activeClasses = 'bg-primary text-white font-bold';
  const inactiveClasses = 'text-gray-700 dark:text-dark-on-surface hover:bg-gray-200 dark:hover:bg-dark-surface';
  const dropTargetClasses = isDropTarget ? 'scale-105 bg-blue-200 dark:bg-blue-800 ring-2 ring-primary shadow-lg' : '';

  if(isEditing) {
      return (
          <li className={`${baseClasses} ${inactiveClasses}`}>
              <form onSubmit={handleRenameSubmit} className="flex items-center w-full">
                  <input 
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => setIsEditing(false)}
                      autoFocus
                      className="w-full bg-transparent focus:outline-none"
                  />
              </form>
          </li>
      )
  }

  return (
    <li
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${dropTargetClasses}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isSidebarCollapsed ? name : undefined}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? '' : 'space-x-4 flex-grow'}`}>
        {icon}
        {!isSidebarCollapsed && <span className="truncate">{name}</span>}
      </div>
       {isUserFolder && !isSidebarCollapsed && isHovered && (
        <div className="flex items-center">
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><PencilIcon className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><TrashIcon className="w-4 h-4" /></button>
        </div>
      )}
    </li>
  );
};


const Sidebar: React.FC = () => {
  const { currentFolder, setCurrentFolder, openCompose, userFolders, isSidebarCollapsed, moveConversations, createUserFolder, renameUserFolder, deleteUserFolder, view } = useAppContext();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleFolderClick = (folder: string) => {
    setCurrentFolder(folder);
  };
  
  const handleComposeClick = () => {
    openCompose();
  }

  const handleDrop = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.conversationIds) {
        moveConversations(data.conversationIds, folderName);
      }
    } catch(err) {
      console.error("Failed to handle drop:", err);
    }
  };
  
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newFolderName.trim()) {
        createUserFolder(newFolderName.trim());
        setNewFolderName("");
        setIsCreatingFolder(false);
    }
  }

  const systemFolders = Object.values(Folder).filter(f => ![Folder.SCHEDULED, Folder.SNOOZED].includes(f));

  return (
    <aside className={`fixed top-0 pt-16 h-full flex-shrink-0 p-2 bg-surface-container dark:bg-dark-surface-container flex flex-col justify-between transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
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
            {systemFolders.map((folder) => (
              <NavItem
                key={folder}
                name={folder}
                icon={getSystemFolderIcon(folder)}
                isActive={currentFolder === folder && view === 'mail'}
                onClick={() => handleFolderClick(folder)}
                isSidebarCollapsed={isSidebarCollapsed}
                onDrop={(e) => handleDrop(e, folder)}
              />
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-outline dark:border-dark-outline">
              <h3 className={`px-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 ${isSidebarCollapsed ? 'text-center' : ''}`}>{isSidebarCollapsed ? "F" : "Folders"}</h3>
              <ul>
                {userFolders.map(folder => (
                   <NavItem
                    key={folder.id}
                    name={folder.name}
                    icon={getSystemFolderIcon(folder.name)}
                    isActive={currentFolder === folder.name && view === 'mail'}
                    onClick={() => handleFolderClick(folder.name)}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onDrop={(e) => handleDrop(e, folder.name)}
                    onRename={(newName) => renameUserFolder(folder.id, newName)}
                    onDelete={() => deleteUserFolder(folder.id)}
                    isUserFolder
                  />
                ))}
                {isCreatingFolder && !isSidebarCollapsed && (
                    <li className="px-4 py-1">
                        <form onSubmit={handleCreateFolderSubmit} className="flex items-center">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder name"
                                autoFocus
                                onBlur={() => setIsCreatingFolder(false)}
                                className="w-full py-1 text-sm bg-transparent border-b border-primary focus:outline-none"
                            />
                             <button type="button" onClick={() => setIsCreatingFolder(false)} className="p-1"><XMarkIcon className="w-4 h-4" /></button>
                        </form>
                    </li>
                )}
              </ul>
              {!isSidebarCollapsed && !isCreatingFolder && (
                <button onClick={() => setIsCreatingFolder(true)} className="flex items-center w-full px-4 py-2 mt-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-surface rounded-full">
                    <FolderPlusIcon className="w-5 h-5 mr-4"/>
                    Create new folder
                </button>
              )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
