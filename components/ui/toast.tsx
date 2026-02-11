'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

type ToastType = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let globalToastFn: ((message: string, type?: ToastType) => void) | null = null;

/** Call from anywhere — no hook required */
export function toast(message: string, type: ToastType = 'info') {
  globalToastFn?.(message, type);
}

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // keep max 5
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    globalToastFn = showToast;
    return () => { globalToastFn = null; };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`pointer-events-auto animate-slide-in rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg max-w-sm ${
                t.type === 'error'
                  ? 'bg-red-600 text-white'
                  : t.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
              }`}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
