
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-[100] flex items-center p-4 rounded-lg shadow-lg border transition-all transform animate-fade-in-up ${
      type === 'success' 
        ? 'bg-white border-green-500 text-green-700 dark:bg-gray-800 dark:text-green-400' 
        : 'bg-white border-red-500 text-red-700 dark:bg-gray-800 dark:text-red-400'
    }`}>
      <div className={`mr-3 p-1 rounded-full ${type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
        {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      </div>
      <div className="mr-4 text-sm font-semibold">{message}</div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <X size={16} />
      </button>
    </div>
  );
};
