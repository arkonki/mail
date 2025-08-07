
import React, { useState, useEffect, useRef } from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { SearchIcon } from './icons/SearchIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MailIcon } from './icons/MailIcon';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { CogIcon } from './icons/CogIcon';

const Header: React.FC = () => {
  const { user, setSearchQuery, theme, toggleTheme, toggleSidebar, view, setView, logout } = useAppContext();
  const [localQuery, setLocalQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localQuery);
  };

  const clearSearch = () => {
    setLocalQuery('');
    setSearchQuery('');
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoutClick = (e: React.MouseEvent) => {
      e.preventDefault();
      logout();
      setIsMenuOpen(false);
  }

  const handleSettingsClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setView('settings');
      setIsMenuOpen(false);
  }
  
  const viewButtonClasses = (buttonView: 'mail' | 'contacts') => {
      const base = "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ease-in-out";
      if(view === buttonView) {
          return `${base} bg-white dark:bg-dark-surface-container shadow text-primary dark:text-dark-on-surface`;
      }
      return `${base} text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`;
  }

  return (
    <header className="relative z-30 flex items-center justify-between px-4 py-2 bg-surface-container dark:bg-dark-surface-container border-b border-outline dark:border-dark-outline shadow-sm flex-shrink-0">
      <div className="flex items-center space-x-4">
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center space-x-2">
            <MailIcon className="w-8 h-8 text-primary"/>
            <span className="text-xl text-gray-700 dark:text-gray-200 hidden sm:inline">Webmail</span>
        </div>
        <div className="ml-4 p-1 bg-gray-200/70 dark:bg-dark-surface rounded-full flex items-center">
            <button onClick={() => setView('mail')} className={viewButtonClasses('mail')}>Mail</button>
            <button onClick={() => setView('contacts')} className={viewButtonClasses('contacts')}>Contacts</button>
        </div>
      </div>
      
      <div className="flex-grow max-w-2xl mx-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <input 
            type="search"
            placeholder={`Search ${view}`}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="block w-full p-2 pl-10 text-sm text-gray-900 bg-gray-100 border border-transparent rounded-full dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 focus:ring-primary focus:border-primary focus:bg-white dark:focus:bg-gray-800"
          />
          {localQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
            </button>
          )}
        </form>
      </div>

      <div className="flex items-center space-x-2">
         <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <MoonIcon className="w-6 h-6 text-gray-600"/> : <SunIcon className="w-6 h-6 text-yellow-400"/>}
         </button>
         <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <UserCircleIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            </button>
             <div className={`absolute right-0 w-48 mt-2 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 transition-all duration-150 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                        <p className="font-semibold truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                     <a href="#" onClick={handleSettingsClick} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CogIcon className="w-5 h-5" />
                        Settings
                    </a>
                    <a href="#" onClick={handleLogoutClick} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Sign out
                    </a>
                </div>
            </div>
         </div>
      </div>
    </header>
  );
};

export default Header;
