import React, { createContext, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning', // 'warning' | 'danger' | 'info'
  });

  const resolver = useRef(null);

  const confirm = (message, options = {}) => {
    setModalState({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'warning',
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  };

  const handleConfirm = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(true);
  };

  const handleCancel = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(false);
  };

  const typeConfig = {
    warning: {
      icon: HelpCircle,
      color: 'text-yellow-400',
      border: 'border-yellow-500/30',
      bgGlow: 'bg-yellow-500/5',
      btnBg: 'bg-yellow-400 hover:bg-yellow-500 text-emerald-950 shadow-lg shadow-yellow-450/20'
    },
    danger: {
      icon: AlertTriangle,
      color: 'text-red-500',
      border: 'border-red-500/30',
      bgGlow: 'bg-red-500/5',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-650/20'
    },
    info: {
      icon: HelpCircle,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bgGlow: 'bg-emerald-500/5',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-650/20'
    }
  };

  const config = typeConfig[modalState.type] || typeConfig.warning;
  const Icon = config.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`bg-emerald-950 border ${config.border} rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-white font-sans ${config.bgGlow}`}
            >
              {/* Close Icon */}
              <button 
                onClick={handleCancel}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/10 text-emerald-450 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Title & Icon Header */}
              <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-3.5">
                <Icon className={`h-6 w-6 ${config.color} animate-bounce`} />
                <div>
                  <h3 className="text-lg font-black text-white">{modalState.title}</h3>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Required ECP Action Confirmation</p>
                </div>
              </div>
              
              {/* Modal message content */}
              <p className="text-xs text-slate-200 leading-relaxed font-semibold whitespace-pre-line">
                {modalState.message}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2.5">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 bg-emerald-900/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all border border-emerald-500/10"
                >
                  {modalState.cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black transition-all ${config.btnBg}`}
                >
                  {modalState.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};
