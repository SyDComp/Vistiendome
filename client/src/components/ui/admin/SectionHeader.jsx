import React, { useState, useEffect } from 'react';

/**
 * SectionHeader — Cabecera estándar de cada sección del Admin.
 */
const SectionHeader = ({ title, description, action }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div 
            className="admin-section-header"
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? '16px' : '0',
                marginBottom: '24px',
                flex: '0 0 auto'
            }}
        >
            <div>
                <h2 style={{
                    margin: 0,
                    color: '#1e1b4b',
                    fontSize: isMobile ? '20px' : '22px',
                    fontWeight: '800',
                    letterSpacing: '-0.3px'
                }}>
                    {title}
                </h2>
                {description && (
                    <p style={{
                        margin: '4px 0 0',
                        color: '#64748b',
                        fontSize: '13.5px'
                    }}>
                        {description}
                    </p>
                )}
            </div>

            {action && !Array.isArray(action) && (
                <button
                    onClick={action.onClick}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '10px 20px', backgroundColor: '#8f0653', color: '#fff',
                        border: 'none', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '13.5px', fontWeight: '700', transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(143,6,83,0.3)', whiteSpace: 'nowrap', width: isMobile ? '100%' : 'auto'
                    }}
                >
                    {action.label}
                </button>
            )}

            {Array.isArray(action) && (
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                    {action.map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={btn.onClick}
                            style={{
                                flex: isMobile ? '1 1 100%' : 'none',
                                width: isMobile ? '100%' : 'auto',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: isMobile ? '10px 14px' : '10px 20px', 
                                backgroundColor: btn.variant === 'outline' ? '#fff' : '#8f0653',
                                color: btn.variant === 'outline' ? '#8f0653' : '#fff',
                                border: btn.variant === 'outline' ? '1px solid #8f0653' : 'none',
                                borderRadius: '10px', cursor: 'pointer',
                                fontSize: '13.5px', fontWeight: '700', transition: 'all 0.2s ease',
                                boxShadow: btn.variant === 'outline' ? 'none' : '0 4px 12px rgba(143,6,83,0.3)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SectionHeader;
