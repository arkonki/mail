
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import SignatureSettings from './SignatureSettings';
import AutoResponderSettings from './AutoResponderSettings';
import RulesSettings from './RulesSettings';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';

type SettingsTab = 'signature' | 'autoResponder' | 'rules';

const Settings: React.FC = () => {
    const { setView } = useAppContext();
    const [activeTab, setActiveTab] = useState<SettingsTab>('signature');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'signature': return <SignatureSettings />;
            case 'autoResponder': return <AutoResponderSettings />;
            case 'rules': return <RulesSettings />;
            default: return null;
        }
    };
    
    const TabButton: React.FC<{tab: SettingsTab, label: string}> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 w-full text-left text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                ? 'bg-primary text-white' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-y-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-on-surface dark:text-dark-on-surface">Settings</h1>
                <button onClick={() => setView('mail')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Back to Mail</span>
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex flex-row lg:flex-col gap-2 p-2 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline self-start lg:w-48 flex-shrink-0 overflow-x-auto">
                    <TabButton tab="signature" label="Signature" />
                    <TabButton tab="autoResponder" label="Auto Responder" />
                    <TabButton tab="rules" label="Rules" />
                </div>
                <div className="flex-grow bg-white dark:bg-dark-surface-container p-4 md:p-6 rounded-lg border border-outline dark:border-dark-outline">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Settings;
