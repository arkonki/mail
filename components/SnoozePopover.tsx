
import React, { useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';

interface SnoozePopoverProps {
  onSnooze: (date: Date) => void;
  onClose: () => void;
}

const SnoozePopover: React.FC<SnoozePopoverProps> = ({ onSnooze, onClose }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const getPresetDate = (type: 'later-today' | 'tomorrow' | 'next-week'): Date => {
    const now = new Date();
    let date = new Date();
    
    switch(type) {
      case 'later-today':
        date.setHours(now.getHours() + 3); // 3 hours from now
        break;
      case 'tomorrow':
        date.setDate(now.getDate() + 1);
        date.setHours(8, 0, 0, 0); // 8 AM
        break;
      case 'next-week':
        date.setDate(now.getDate() + 7);
        date.setHours(8, 0, 0, 0); // 8 AM
        break;
    }
    return date;
  }
  
  const handleSnoozePreset = (type: 'later-today' | 'tomorrow' | 'next-week') => {
    onSnooze(getPresetDate(type));
  };
  
  const handleCustomSnooze = () => {
    if(customDate && customTime) {
      const [year, month, day] = customDate.split('-').map(Number);
      const [hours, minutes] = customTime.split(':').map(Number);
      const scheduledDate = new Date(year, month - 1, day, hours, minutes);
      onSnooze(scheduledDate);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-outline dark:border-dark-outline text-on-surface dark:text-dark-on-surface z-20">
      <div className="p-2 border-b border-outline dark:border-dark-outline">
        <h3 className="font-semibold text-center">Snooze until...</h3>
      </div>
      <ul className="py-2">
        <li className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleSnoozePreset('later-today')}>
          <p>Later today</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{getPresetDate('later-today').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </li>
        <li className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleSnoozePreset('tomorrow')}>
          <p>Tomorrow</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">8:00 AM</p>
        </li>
        <li className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleSnoozePreset('next-week')}>
          <p>Next week</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{getPresetDate('next-week').toLocaleString([], {weekday: 'long', hour: '2-digit', minute:'2-digit'})}</p>
        </li>
        <li className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setShowCustom(true)}>
          <ClockIcon className="w-5 h-5 mr-3"/> Pick date & time
        </li>
      </ul>
      {showCustom && (
        <div className="p-4 border-t border-outline dark:border-dark-outline space-y-3">
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
          <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
          <button onClick={handleCustomSnooze} className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-hover">Set date</button>
        </div>
      )}
    </div>
  );
};

export default SnoozePopover;
