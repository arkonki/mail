
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Contact } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

const ContactsView: React.FC = () => {
    const { contacts, addContact, updateContact, deleteContact, setView } = useAppContext();
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleSave = (contactData: Omit<Contact, 'id'>) => {
        if (editingContact) {
            updateContact({ ...editingContact, ...contactData });
        } else {
            addContact(contactData);
        }
        setEditingContact(null);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setEditingContact(null);
        setIsCreating(false);
    };

    const Form: React.FC<{ onSave: (data: Omit<Contact, 'id'>) => void; onCancel: () => void; initialData?: Contact | null }> = ({ onSave, onCancel, initialData }) => {
        const [name, setName] = useState(initialData?.name || '');
        const [email, setEmail] = useState(initialData?.email || '');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave({ name, email });
        };
        
        return (
            <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                 <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{initialData ? 'Edit Contact' : 'Create a new contact'}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input id="contact-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline" />
                    </div>
                    <div>
                        <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md dark:bg-dark-surface dark:border-dark-outline" />
                    </div>
                 </div>
                 <div className="flex justify-end gap-3">
                     <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline">Cancel</button>
                     <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover">Save</button>
                 </div>
            </form>
        )
    }

    return (
        <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-y-auto px-4 py-8 sm:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <h1 className="text-2xl font-bold text-on-surface dark:text-dark-on-surface">Contacts</h1>
                <div className="flex gap-4">
                    <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                        <PlusCircleIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Add Contact</span>
                    </button>
                    <button onClick={() => setView('mail')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline rounded-md">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Mail</span>
                    </button>
                </div>
            </div>
            
            {(isCreating || editingContact) && <div className="mb-6"><Form onSave={handleSave} onCancel={handleCancel} initialData={editingContact} /></div>}

            <div className="bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline overflow-hidden">
                <ul className="divide-y divide-outline dark:divide-dark-outline">
                    {contacts.map(contact => (
                        <li key={contact.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="flex items-center gap-4">
                                <UserCircleIcon className="w-10 h-10 text-gray-400 dark:text-gray-500"/>
                                <div>
                                    <p className="font-semibold text-on-surface dark:text-dark-on-surface">{contact.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{contact.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditingContact(contact)} className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => deleteContact(contact.id)} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                {contacts.length === 0 && <p className="p-8 text-center text-gray-500 dark:text-gray-400">No contacts found.</p>}
            </div>
        </div>
    );
};

export default ContactsView;
