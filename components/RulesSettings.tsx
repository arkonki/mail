
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { Rule } from '../types';

type ConditionField = Rule['condition']['field'];
type ActionType = Rule['action']['type'];

const RulesSettings: React.FC = () => {
    const { appSettings, userFolders, addRule, deleteRule } = useAppContext();
    const [conditionField, setConditionField] = useState<ConditionField>('sender');
    const [conditionValue, setConditionValue] = useState('');
    const [actionType, setActionType] = useState<ActionType>('move');
    const [moveToFolder, setMoveToFolder] = useState(userFolders[0]?.name || '');

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!conditionValue || (actionType === 'move' && !moveToFolder)) {
            alert('Please fill out all fields for the rule.');
            return;
        }

        const newRule: Omit<Rule, 'id'> = {
            condition: { field: conditionField, operator: 'contains', value: conditionValue },
            action: { type: actionType, folder: actionType === 'move' ? moveToFolder : undefined },
        };

        addRule(newRule);
        setConditionValue('');
    };
    
    const renderRuleText = (rule: Rule) => {
        let actionText = '';
        switch(rule.action.type) {
            case 'move': actionText = `move to "${rule.action.folder}"`; break;
            case 'star': actionText = 'star it'; break;
            case 'markAsRead': actionText = 'mark as read'; break;
        }
        return `If ${rule.condition.field} contains "${rule.condition.value}", then ${actionText}.`;
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">Rules & Filters</h2>
            <div className="space-y-6">
                <form onSubmit={handleAddRule} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Create a new rule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">If</label>
                                <select 
                                    value={conditionField} 
                                    onChange={e => setConditionField(e.target.value as ConditionField)}
                                    className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline"
                                >
                                    <option value="sender">Sender</option>
                                    <option value="recipient">Recipient</option>
                                    <option value="subject">Subject</option>
                                </select>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contains</label>
                                <input
                                    type="text"
                                    value={conditionValue}
                                    onChange={e => setConditionValue(e.target.value)}
                                    className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline"
                                    placeholder="e.g., newsletter@example.com"
                                />
                           </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Then do this</label>
                            <select
                                value={actionType}
                                onChange={e => setActionType(e.target.value as ActionType)}
                                className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline"
                            >
                                <option value="move">Move to...</option>
                                <option value="star">Star it</option>
                                <option value="markAsRead">Mark as read</option>
                            </select>
                        </div>
                    </div>
                    {actionType === 'move' && (
                        <div className="flex justify-end">
                            <div className="w-full md:w-1/3">
                                <label htmlFor="move-to-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folder</label>
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
                    )}
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
                                        {renderRuleText(rule)}
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
