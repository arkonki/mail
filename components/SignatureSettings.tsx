import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

const SignatureSettings: React.FC = () => {
    const { appSettings, updateSignature } = useAppContext();
    const [isEnabled, setIsEnabled] = useState(appSettings.signature.isEnabled);
    const [body, setBody] = useState(appSettings.signature.body);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.innerHTML = body;
        }
    }, []);

    const handleSave = () => {
        updateSignature({ isEnabled, body });
    };

    const handleBodyChange = (e: React.FormEvent<HTMLDivElement>) => {
        setBody(e.currentTarget.innerHTML);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">Email Signature</h2>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <label htmlFor="enable-signature" className="font-medium text-gray-700 dark:text-gray-300">Enable Signature</label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input
                            type="checkbox"
                            name="enable-signature"
                            id="enable-signature"
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-400 border-4 appearance-none cursor-pointer"
                        />
                        <label htmlFor="enable-signature" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
                    </div>
                </div>

                <div className={`transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature Content</label>
                    <div className="w-full p-2 border border-outline dark:border-dark-outline rounded-md bg-white dark:bg-dark-surface min-h-[150px]">
                         <div
                            ref={contentRef}
                            contentEditable={isEnabled}
                            onInput={handleBodyChange}
                            className="w-full h-full text-sm resize-none focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                        Save Changes
                    </button>
                </div>
            </div>
            <style>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #0B57D0; /* primary */
                    background-color: #0B57D0;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #0B57D0;
                }
            `}</style>
        </div>
    );
};

export default SignatureSettings;