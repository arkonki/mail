
import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { InboxIcon } from './icons/InboxIcon';
import { StarIcon } from './icons/StarIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FolderIcon } from './icons/FolderIcon';

const getSystemFolderIcon = (folderName: string): React.ReactNode => {
    const lowerCaseName = folderName.toLowerCase();
    if (lowerCaseName.includes('inbox')) return <InboxIcon className="w-5 h-5" />;
    if (lowerCaseName.includes('sent')) return <PaperAirplaneIcon className="w-5 h-5" />;
    if (lowerCaseName.includes('drafts')) return <DocumentIcon className="w-5 h-5" />;
    if (lowerCaseName.includes('trash') || lowerCaseName.includes('bin')) return <TrashIcon className="w-5 h-5" />;
    if (lowerCaseName.includes('starred')) return <StarIcon className="w-5 h-5" />;
    return <FolderIcon className="w-5 h-5" />;
}

const FolderItem: React.FC<{
  folderName: string;
  isActive: boolean;
  onClick: () => void;
  isSidebarCollapsed?: boolean;
}> = ({ folderName, isActive, onClick, isSidebarCollapsed }) => {
  
  const justifyContent = isSidebarCollapsed ? 'justify-center' : 'justify-between';
  const baseClasses = `group flex items-center ${justifyContent} px-4 py-2 my-1 text-sm rounded-full cursor-pointer transition-all duration-200 ease-in-out`;
  const activeClasses = 'bg-primary text-white font-bold';
  const inactiveClasses = 'text-gray-700 dark:text-dark-on-surface hover:bg-gray-200 dark:hover:bg-dark-surface';

  return (
    <li
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      onClick={onClick}
      title={isSidebarCollapsed ? folderName : undefined}
    >
      <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? '' : 'space-x-4 flex-grow'}`}>
        {getSystemFolderIcon(folderName)}
        {!isSidebarCollapsed && <span className="truncate">{folderName}</span>}
      </div>
    </li>
  );
};


const Sidebar: React.FC = () => {
  const { currentFolder, setCurrentFolder, openCompose, userFolders, isSidebarCollapsed } = useAppContext();

  const handleFolderClick = (folder: string) => {
    setCurrentFolder(folder);
  };
  
  const handleComposeClick = () => {
    openCompose();
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
            {userFolders.map((folder) => (
              <FolderItem 
                key={folder.id}
                folderName={folder.name}
                isActive={currentFolder === folder.name}
                onClick={() => handleFolderClick(folder.name)}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
