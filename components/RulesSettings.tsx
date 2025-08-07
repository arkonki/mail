import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

const RulesSettings: React.FC = () => {
    const { appSettings, userFolders, addRule, deleteRule } = useAppContext();
    const [senderContains, setSenderContains] = useState('');
    const [moveToFolder, setMoveToFolder] = useState(userFolders[0]?.name || '');

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!senderContains || !moveToFolder) {
            alert('Please fill out all fields for the rule.');
            return;
        }
        addRule({
            condition: { field: 'sender', operator: 'contains', value: senderContains },
            action: { type: 'move', folder: moveToFolder },
        });
        setSenderContains('');
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">Rules</h2>
            <div className="space-y-6">
                <form onSubmit={handleAddRule} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Create a new rule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label htmlFor="sender-contains" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">If sender email contains:</label>
                            <input
                                type="text"
                                id="sender-contains"
                                value={senderContains}
                                onChange={e => setSenderContains(e.target.value)}
                                className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline"
                                placeholder="e.g., newsletter"
                            />
                        </div>
                        <div>
                            <label htmlFor="move-to-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Move to folder:</label>
                            <select
                                id="move-to-folder"
                                value={moveToFolder}
                                onChange={e => setMoveToFolder(e.target.value)}
                                className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline"
                                disabled={userFolders.length === 0}
                            >
                                {userFolders.length === 0 ? (
                                    <option>Create a folder first</option>
                                ) : (
                                    userFolders.map(folder => <option key={folder.id} value={folder.name}>{folder.name}</option>)
                                )}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                           <PlusCircleIcon className="w-5 h-5"/> Add Rule
                        </button>
                    </div>
                </form>

                <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Existing Rules</h3>
                    <div className="space-y-2">
                        {appSettings.rules.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No rules have been created.</p>
                        ) : (
                            appSettings.rules.map(rule => (
                                <div key={rule.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-outline dark:border-dark-outline">
                                    <p className="text-sm text-on-surface dark:text-dark-on-surface">
                                        If sender contains <span className="font-semibold text-primary">"{rule.condition.value}"</span>, move to <span className="font-semibold text-primary">"{rule.action.folder}"</span>.
                                    </p>
                                    <button onClick={() => deleteRule(rule.id)} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RulesSettings;
