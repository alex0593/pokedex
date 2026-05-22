import { useState, useCallback } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 5000;
let nextId = 0;

/**
 * Hook para mostrar notificaciones toast sin librerías externas.
 * Reemplaza los console.error silenciosos en las páginas de catálogo.
 *
 * Uso:
 *   const { toasts, showError, showSuccess, dismiss } = useToast();
 *   <ToastContainer messages={toasts} onDismiss={dismiss} />
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const showError = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast],
  );

  const showSuccess = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast],
  );

  const showInfo = useCallback(
    (message: string) => addToast(message, 'info'),
    [addToast],
  );

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showError, showSuccess, showInfo, dismiss };
}
