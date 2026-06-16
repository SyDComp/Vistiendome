import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable Accordion Component
 * Arquitectura Pure DOM: Manipula el DOM directamente vía Refs para esquivar
 * los problemas de asincronía del Virtual DOM de React, logrando animación fluida
 * y eliminando el lag y los "bloques invisibles".
 */
const Accordion = ({ 
    title, 
    icon, 
    children, 
    initialOpen = false, 
    extraHeader,
    onToggle,
    style = {},
    showArrow = true,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const wrapperRef = useRef(null);
    const contentRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        setIsOpen(initialOpen);
        if (wrapperRef.current && contentRef.current) {
            if (initialOpen) {
                wrapperRef.current.style.height = 'auto';
                wrapperRef.current.style.opacity = '1';
            } else {
                wrapperRef.current.style.height = '0px';
                wrapperRef.current.style.opacity = '0';
            }
        }
    }, [initialOpen]);

    const handleToggle = () => {
        if (disabled) return;
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (onToggle) onToggle(nextState);

        const wrapper = wrapperRef.current;
        const content = contentRef.current;
        if (!wrapper || !content) return;

        // Limpiar animaciones pendientes
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (nextState) {
            // --- ABRIENDO ---
            const targetHeight = content.scrollHeight;
            
            wrapper.style.height = `${targetHeight}px`;
            wrapper.style.opacity = '1';

            // Volver a auto al final para mantener responsividad a cambios de tamaño interno
            timeoutRef.current = setTimeout(() => {
                if (wrapperRef.current && wrapperRef.current.style.opacity === '1') {
                    wrapperRef.current.style.height = 'auto';
                }
            }, 300);

        } else {
            // --- CERRANDO ---
            // 1. Fijar altura en px absolutos primero (para que la transición empiece de inmediato)
            const currentHeight = content.scrollHeight;
            wrapper.style.height = `${currentHeight}px`;

            // 2. FORZAR REFLOW MAGICO: esto obliga al motor del navegador a asimilar 
            // la altura en píxeles antes del siguiente comando, aniquilando el "salto/lag".
            void wrapper.offsetHeight; 

            // 3. Aplastar a 0 instantáneamente. Transición fluida gatillada.
            wrapper.style.height = '0px';
            wrapper.style.opacity = '0';
        }
    };

    return (
        <div style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0', 
            overflow: 'hidden', 
            boxShadow: isOpen ? '0 12px 24px rgba(0,0,0,0.06)' : '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            ...style 
        }}>
            {/* Cabecera */}
            <div 
                onClick={handleToggle}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 20px', 
                    cursor: disabled ? 'default' : 'pointer',
                    userSelect: 'none',
                    background: isOpen ? '#f8fafc' : '#fff',
                    transition: 'background 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {icon && (
                        <div style={{ 
                            width: '28px', height: '28px', 
                            background: '#fff', 
                            borderRadius: '8px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            color: '#8f0653', 
                            border: '1px solid #e2e8f0' 
                        }}>
                            {React.cloneElement(icon, { size: 14 })}
                        </div>
                    )}
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e1b4b' }}>{title}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {extraHeader}
                    {showArrow && (
                        <div style={{ 
                            color: '#94a3b8', 
                            display: 'flex', 
                            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)', 
                            transform: isOpen ? 'rotate(-180deg)' : 'rotate(0deg)' 
                        }}>
                            <ChevronDown size={20} />
                        </div>
                    )}
                </div>
            </div>

            {/* Envoltorio de Animación Directa */}
            <div 
                ref={wrapperRef}
                style={{ 
                    overflow: 'hidden',
                    height: initialOpen ? 'auto' : '0px',
                    opacity: initialOpen ? 1 : 0,
                    transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <div 
                    ref={contentRef}
                    style={{ 
                        borderTop: '1px solid #f1f5f9', 
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Accordion;
