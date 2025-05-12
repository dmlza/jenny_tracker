import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'destructive';

interface ToastOptions {
  title: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
}

const toastTimeouts: Record<string, NodeJS.Timeout> = {};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, ...options };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    // Auto-dismiss after duration (default 5 seconds)
    const duration = options.duration || 5000;
    toastTimeouts[id] = setTimeout(() => {
      dismissToast(id);
    }, duration);
    
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter(toast => toast.id !== id));
    
    if (toastTimeouts[id]) {
      clearTimeout(toastTimeouts[id]);
      delete toastTimeouts[id];
    }
  }, []);

  return { toast, toasts, dismissToast };
}