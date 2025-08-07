
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { Rule, SystemFolder } from '../types';

type ConditionField = Rule['condition']['field'];
type ActionType = Rule['action']['type'];

const RulesSettings: React.FC = () => {
    const { appSettings, labels, userFolders, addRule, deleteRule } = useAppContext();
    const [conditionField, setConditionField] = useState<ConditionField>('sender');
    const [conditionValue, setConditionValue] = useState('');
    const [actionType, setActionType] = useState<ActionType>('applyLabel');
    const [actionLabelId, setActionLabelId] = useState(labels[0]?.id || '');
    const [actionFolderId, setActionFolderId] = useState<string>(SystemFolder.INBOX);
    
    const allFolders = [ ...Object.values(SystemFolder), ...userFolders.map(f => f.id)];

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!conditionValue) {
            alert('Please fill out all fields for the rule.');
            return;
        }

        let action: Rule['action'];
        switch(actionType) {
            case 'moveToFolder':
                action = { type: 'moveToFolder', folderId: actionFolderId };
                break;
            case 'applyLabel':
                if (!actionLabelId) { alert('Please select a label.'); return; }
                action = { type: 'applyLabel', labelId: actionLabelId };
                break;
            case 'star':
                action = { type: 'star' };
                break;
            case 'markAsRead':
                 action = { type: 'markAsRead' };
                 break;
            default:
                return;
        }

        addRule({
            condition: { field: conditionField, operator: 'contains', value: conditionValue },
            action,
        });
        setConditionValue('');
    };
    
    const renderRuleText = (rule: Rule) => {
        let actionText = '';
        switch(rule.action.type) {
            case 'applyLabel': 
                const labelName = labels.find(l => l.id === rule.action.labelId)?.name || 'unknown label';
                actionText = `apply label "${labelName}"`; 
                break;
            case 'moveToFolder':
                const folderName = userFolders.find(f => f.id === rule.action.folderId)?.name || rule.action.folderId || 'unknown folder';
                actionText = `move to folder "${folderName}"`;
                break;
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
                                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
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
                                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                                    placeholder="e.g., newsletter@example.com"
                                />
                           </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Then do this</label>
                            <select
                                value={actionType}
                                onChange={e => setActionType(e.target.value as ActionType)}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            >
                                <option value="moveToFolder">Move to folder...</option>
                                <option value="applyLabel">Apply label...</option>
                                <option value="star">Star it</option>
                                <option value="markAsRead">Mark as read</option>
                            </select>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        {actionType === 'applyLabel' && (
                            <div className="w-full md:w-1/3">
                                <label htmlFor="apply-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                                <select
                                    id="apply-label"
                                    value={actionLabelId}
                                    onChange={e => setActionLabelId(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                                    disabled={labels.length === 0}
                                >
                                    {labels.length === 0 ? <option>Create a label first</option> : labels.map(label => <option key={label.id} value={label.id}>{label.name}</option>)}
                                </select>
                            </div>
                        )}
                         {actionType === 'moveToFolder' && (
                            <div className="w-full md:w-1/3">
                                <label htmlFor="move-to-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folder</label>
                                <select
                                    id="move-to-folder"
                                    value={actionFolderId}
                                    onChange={e => setActionFolderId(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                                >
                                    {Object.values(SystemFolder).map(f => <option key={f} value={f}>{f}</option>)}
                                    <option disabled>-- User Folders --</option>
                                    {userFolders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                                </select>
                            </div>
                        )}
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
