import React from 'react';

// App Router: loading.tsx se renderiza DENTRO del layout existente (que ya tiene <html><body>).
// No incluir <html> ni <body> aquí — causaría un error de hidratación.
export default function RootLoading() {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            <div style={{ textAlign: 'center', color: 'white' }}>
                <div
                    style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid rgba(255,255,255,0.3)',
                        borderTop: '4px solid white',
                        borderRadius: '50%',
                        margin: '0 auto 20px',
                        animation: 'spin 1s linear infinite',
                    }}
                />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>
                    Cargando Pokédex...
                </p>
            </div>
        </div>
    );
}
