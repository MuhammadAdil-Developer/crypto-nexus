import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-gray-300" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-gray-300" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-gray-300" />;
      case 'info':
        return <Info className="w-5 h-5 text-gray-300" />;
      default:
        return <Info className="w-5 h-5 text-gray-300" />;
    }
  };

  const getBgColor = () => {
    return 'bg-gray-800 border-gray-600';
  };

  const getBorderColor = () => {
    return 'border-gray-600';
  };

  const getTextColor = () => {
    return 'text-white';
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`
        ${getBgColor()} ${getBorderColor()}
        border rounded-lg p-4
        flex items-start space-x-3
      `}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${getTextColor()}`}>
            {title}
          </h4>
          <p className="text-sm text-gray-200 mt-1">
            {message}
          </p>
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast; 