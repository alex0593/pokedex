'use client';

import React from 'react';
import { ToastMessage } from '../hooks/useToast';
import styles from './Toast.module.css';

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}

/**
 * Contenedor de notificaciones toast. Posicionado fixed en la esquina
 * inferior derecha. Se combina con useToast() para gestionar el estado.
 *
 * Uso:
 *   const { toasts, showError, dismiss } = useToast();
 *   <ToastContainer messages={toasts} onDismiss={dismiss} />
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onDismiss }) => {
  if (messages.length === 0) return null;

  return (
    <div className={styles.container} role="region" aria-label="Notificaciones" aria-live="polite">
      {messages.map(toast => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role="alert"
        >
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.dismissBtn}
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar notificación"
            type="button"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
