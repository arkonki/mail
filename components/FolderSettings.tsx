
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UserFolder } from '../types';

const FolderSettings: React.FC = () => {
    const { userFolders, createFolder, updateFolder, deleteFolder } = useAppContext();
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    const handleCreateFolder = () => {
        const folderName = prompt('Enter new folder name:');
        if (folderName) {
            createFolder(folderName);
        }
    };

    const handleStartEdit = (folder: UserFolder) => {
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    const handleCancelEdit = () => {
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    const handleSaveEdit = (e: React.FormEvent, folderId: string) => {
        e.preventDefault();
        if (editingFolderName.trim()) {
            updateFolder(folderId, editingFolderName.trim());
        }
        handleCancelEdit();
    };

    const handleDelete = (folder: UserFolder) => {
        if (window.confirm(`Are you sure you want to delete the folder "${folder.name}"? All emails inside will be moved to Archive.`)) {
            deleteFolder(folder.id);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-on-surface dark:text-dark-on-surface">Folders</h2>
                <button onClick={handleCreateFolder} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                    <PlusCircleIcon className="w-5 h-5"/> Create new folder
                </button>
            </div>
            <div className="space-y-2">
                {userFolders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No custom folders have been created.</p>
                ) : (
                    userFolders.map(folder => (
                        <div key={folder.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-outline dark:border-dark-outline">
                            {editingFolderId === folder.id ? (
                                <form onSubmit={(e) => handleSaveEdit(e, folder.id)} className="flex-grow">
                                    <input 
                                        type="text"
                                        value={editingFolderName}
                                        onChange={(e) => setEditingFolderName(e.target.value)}
                                        onBlur={handleCancelEdit}
                                        autoFocus
                                        className="w-full text-sm bg-transparent focus:outline-none border-b border-primary"
                                    />
                                </form>
                            ) : (
                                <p className="text-sm text-on-surface dark:text-dark-on-surface">{folder.name}</p>
                            )}
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleStartEdit(folder)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(folder)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FolderSettings;
