'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Root error:', error);
    }, [error]);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '20px',
            }}
        >
            <div
                style={{
                    maxWidth: '500px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '16px',
                    padding: '40px',
                    color: 'white',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <h1 style={{ fontSize: '48px', margin: '0 0 20px' }}>⚠️ Error</h1>
                <p style={{ fontSize: '16px', margin: '0 0 20px', opacity: 0.9 }}>
                    Algo salió mal. Por favor intenta de nuevo.
                </p>
                {error.message && (
                    <p
                        style={{
                            fontSize: '14px',
                            margin: '0 0 30px',
                            opacity: 0.7,
                            fontFamily: 'monospace',
                            wordBreak: 'break-word',
                        }}
                    >
                        {error.message}
                    </p>
                )}
                <button
                    onClick={reset}
                    style={{
                        padding: '12px 30px',
                        fontSize: '16px',
                        fontWeight: '600',
                        background: 'white',
                        color: '#667eea',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    Intentar de nuevo
                </button>
            </div>
        </div>
    );
}
