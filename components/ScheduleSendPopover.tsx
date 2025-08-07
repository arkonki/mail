
import React, { useState } from 'react';
import { ClockIcon } from './icons/ClockIcon';

interface ScheduleSendPopoverProps {
  onSchedule: (date: Date) => void;
  onClose: () => void;
}

const ScheduleSendPopover: React.FC<ScheduleSendPopoverProps> = ({ onSchedule, onClose }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const getPresetDate = (type: 'tomorrow-morning' | 'tomorrow-afternoon' | 'monday-morning'): Date => {
    const now = new Date();
    let date = new Date();
    
    switch(type) {
      case 'tomorrow-morning':
        date.setDate(now.getDate() + 1);
        date.setHours(8, 0, 0, 0);
        break;
      case 'tomorrow-afternoon':
        date.setDate(now.getDate() + 1);
        date.setHours(13, 0, 0, 0);
        break;
      case 'monday-morning':
        const day = now.getDay();
        const add = (1 - day + 7) % 7 || 7; // Add days to get to next Monday
        date.setDate(now.getDate() + add);
        date.setHours(8, 0, 0, 0);
        break;
    }
    return date;
  }
  
  const handleSchedulePreset = (type: 'tomorrow-morning' | 'tomorrow-afternoon' | 'monday-morning') => {
    onSchedule(getPresetDate(type));
  };
  
  const handleCustomSchedule = () => {
    if(customDate && customTime) {
      const [year, month, day] = customDate.split('-').map(Number);
      const [hours, minutes] = customTime.split(':').map(Number);
      const scheduledDate = new Date(year, month - 1, day, hours, minutes);
      onSchedule(scheduledDate);
    }
  };

  return (
    <div className="absolute bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-outline dark:border-dark-outline text-on-surface dark:text-dark-on-surface">
      <div className="p-2 border-b border-outline dark:border-dark-outline">
        <h3 className="font-semibold text-center">Schedule send</h3>
      </div>
      <ul className="py-2">
        <li className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleSchedulePreset('tomorrow-morning')}>
          <p>Tomorrow morning</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">8:00 AM</p>
        </li>
        <li className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleSchedulePreset('tomorrow-afternoon')}>
          <p>Tomorrow afternoon</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">1:00 PM</p>
        </li>
        <li className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleSchedulePreset('monday-morning')}>
          <p>Monday morning</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">8:00 AM</p>
        </li>
        <li className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setShowCustom(true)}>
          <ClockIcon className="w-5 h-5 mr-3"/> Select date and time
        </li>
      </ul>
      {showCustom && (
        <div className="p-4 border-t border-outline dark:border-dark-outline space-y-3">
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
          <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
          <button onClick={handleCustomSchedule} className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-hover">Schedule</button>
        </div>
      )}
    </div>
  );
};

export default ScheduleSendPopover;