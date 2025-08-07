
import React from 'react';
import { LinkIcon } from './icons/LinkIcon';

const RichTextToolbar: React.FC = () => {
    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    const handleLink = () => {
        const url = prompt("Enter the URL:");
        if (url) {
            handleFormat('createLink', url);
        }
    };
    
    const Button: React.FC<{onClick: () => void, title: string, children: React.ReactNode}> = ({ onClick, title, children }) => (
        <button
            type="button"
            onClick={onClick}
            onMouseDown={e => e.preventDefault()} // Prevent editor from losing focus
            className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
            <Button onClick={() => handleFormat('bold')} title="Bold">
                <span className="font-bold w-5 h-5 flex items-center justify-center">B</span>
            </Button>
            <Button onClick={() => handleFormat('italic')} title="Italic">
                <span className="italic w-5 h-5 flex items-center justify-center">I</span>
            </Button>
             <Button onClick={() => handleFormat('underline')} title="Underline">
                <span className="underline w-5 h-5 flex items-center justify-center">U</span>
            </Button>
            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <Button onClick={() => handleFormat('insertUnorderedList')} title="Bulleted List">&bull;</Button>
            <Button onClick={() => handleFormat('insertOrderedList')} title="Numbered List">1.</Button>
            <Button onClick={handleLink} title="Insert Link">
                <LinkIcon className="w-4 h-4" />
            </Button>
        </div>
    );
};

export default RichTextToolbar;
