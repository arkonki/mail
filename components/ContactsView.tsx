

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Contact } from '../types';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import ContactListItem from './ContactListItem';
import ContactDetail from './ContactDetail';
import ContactForm from './ContactForm';
import { UserCircleIcon } from './icons/UserCircleIcon';

const ContactsView: React.FC = () => {
    const { contacts, setView, selectedContactId, setSelectedContactId, addContact, updateContact } = useAppContext();
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredContacts = useMemo(() => 
        contacts.filter(contact => 
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase())
        ), [contacts, searchTerm]);

    const handleSelectContact = (id: string) => {
        setIsCreating(false);
        setSelectedContactId(id);
    };
    
    const handleAddContact = () => {
        setSelectedContactId(null);
        setIsCreating(true);
    };

    const handleCancelForm = () => {
        setIsCreating(false);
        // If a contact was selected before creating, re-select it. For now, just close.
        setSelectedContactId(null); 
    };
    
    const handleSaveContact = (contactData: Omit<Contact, 'id'>, existingId?: string) => {
        if(existingId) {
            const contactToUpdate = contacts.find(c => c.id === existingId);
            if(contactToUpdate) {
                updateContact({ ...contactToUpdate, ...contactData });
            }
        } else {
            addContact(contactData);
        }
        setIsCreating(false);
    }
    
    const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

    return (
        <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-hidden">
            <header className="p-4 border-b border-outline dark:border-dark-outline bg-white dark:bg-dark-surface-container flex-shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-xl font-medium text-on-surface dark:text-dark-on-surface">Contacts</h1>
                    <div className="flex gap-4">
                        <button onClick={handleAddContact} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                            <PlusCircleIcon className="w-5 h-5"/>
                            <span>Create Contact</span>
                        </button>
                        <button onClick={() => setView('mail')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline rounded-md">
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            <span>Back to Mail</span>
                        </button>
                    </div>
                </div>
            </header>
            <div className="flex flex-grow overflow-hidden">
                {/* Left Pane: Contact List */}
                <div className="w-1/3 border-r border-outline dark:border-dark-outline flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-outline dark:border-dark-outline sticky top-0 bg-white dark:bg-dark-surface-container z-10">
                         <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <input 
                                type="search"
                                placeholder="Search contacts"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full p-2 pl-10 text-sm text-gray-900 bg-gray-100 border border-transparent rounded-full dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 focus:ring-primary focus:border-primary focus:bg-white dark:focus:bg-gray-800"
                            />
                        </div>
                    </div>
                    <ul className="flex-grow">
                        {filteredContacts.map(contact => (
                            <ContactListItem 
                                key={contact.id}
                                contact={contact}
                                isSelected={contact.id === selectedContactId}
                                onSelect={() => handleSelectContact(contact.id)}
                            />
                        ))}
                    </ul>
                     {filteredContacts.length === 0 && <p className="p-8 text-center text-gray-500 dark:text-gray-400">No contacts found.</p>}
                </div>

                {/* Right Pane: Detail View or Form */}
                <div className="w-2/3 overflow-y-auto p-8">
                    {isCreating ? (
                         <ContactForm onSave={handleSaveContact} onCancel={handleCancelForm} />
                    ) : selectedContact ? (
                         <ContactDetail contact={selectedContact} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                           <UserCircleIcon className="w-24 h-24 text-gray-300 dark:text-gray-600"/>
                           <p className="mt-4 text-lg">Select a contact to see details</p>
                           <p>Or <button onClick={handleAddContact} className="text-primary hover:underline">create a new contact</button>.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactsView;
