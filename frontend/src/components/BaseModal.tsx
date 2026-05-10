import React, { useEffect, useRef } from 'react';
import styles from './BaseModal.module.css';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, title, children }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            // Focus trap: focus close button on open
            setTimeout(() => closeButtonRef.current?.focus(), 0);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            ref={overlayRef}
            role="presentation"
            aria-modal="true"
        >
            <div
                className={styles.modal}
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <button
                    ref={closeButtonRef}
                    className={styles.closeBtn}
                    onClick={onClose}
                    aria-label="Close dialog"
                    type="button"
                >
                    &times;
                </button>
                <h2 id="modal-title" className={styles.title}>
                    {title}
                </h2>
                <div className={styles.content}>{children}</div>
            </div>
        </div>
    );
};
