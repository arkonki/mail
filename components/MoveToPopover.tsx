
import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Folder } from '../types';
import { InboxIcon } from './icons/InboxIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FolderIcon } from './icons/FolderIcon';

interface MoveToPopoverProps {
  onMove: (folder: string) => void;
  onClose: () => void;
}

const MoveToPopover: React.FC<MoveToPopoverProps> = ({ onMove, onClose }) => {
  const { userFolders } = useAppContext();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const systemFoldersToMove = [Folder.INBOX, Folder.TRASH];

  const systemIcons: Record<string, React.ReactNode> = {
    [Folder.INBOX]: <InboxIcon className="w-5 h-5 mr-3" />,
    [Folder.TRASH]: <TrashIcon className="w-5 h-5 mr-3" />,
  };

  return (
    <div ref={popoverRef} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-10">
      <div className="py-1">
        <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Move to</p>
        {systemFoldersToMove.map(folder => (
            <button key={folder} onClick={() => onMove(folder)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                {systemIcons[folder]}
                {folder}
            </button>
        ))}
        {userFolders.length > 0 && <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>}
        {userFolders.map(folder => (
            <button key={folder.id} onClick={() => onMove(folder.name)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <FolderIcon className="w-5 h-5 mr-3"/>
                <span className="truncate">{folder.name}</span>
            </button>
        ))}
      </div>
    </div>
  );
};

export default MoveToPopover;
