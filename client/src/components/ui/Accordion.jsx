import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import './Accordion.css';

/**
 * Reusable Accordion Component
 * Arquitectura Pure DOM: Manipula el DOM directamente vía Refs para esquivar
 * los problemas de asincronía del Virtual DOM de React, logrando animación fluida
 * y eliminando el lag y los "bloques invisibles".
 *
 * Todas las clases CSS expuestas:
 *   - className      → root container
 *   - .accordion-header  → cabecera clickeable
 *   - .accordion-wrapper → envoltorio de animación (height controlada por JS)
 *   - .accordion-content → contenido interno (scroll, padding, etc. vía CSS)
 */
const Accordion = ({ 
    title, 
    icon, 
    children, 
    initialOpen = false, 
    extraHeader,
    onToggle,
    style = {},
    className,
    contentClassName,
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

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (nextState) {
            const targetHeight = content.scrollHeight;
            wrapper.style.height = `${targetHeight}px`;
            wrapper.style.opacity = '1';

            timeoutRef.current = setTimeout(() => {
                if (wrapperRef.current && wrapperRef.current.style.opacity === '1') {
                    wrapperRef.current.style.height = 'auto';
                }
            }, 300);
        } else {
            const currentHeight = content.scrollHeight;
            wrapper.style.height = `${currentHeight}px`;
            void wrapper.offsetHeight;
            wrapper.style.height = '0px';
            wrapper.style.opacity = '0';
        }
    };

    return (
        <div className={`accordion ${className || ''}`} style={style}>
            {/* Cabecera */}
            <div 
                className={`accordion-header ${isOpen ? 'is-open' : ''}`}
                onClick={handleToggle}
                style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
                <div className="accordion-header-left">
                    {icon && (
                        <div className="accordion-icon-box">
                            {React.cloneElement(icon, { size: 14 })}
                        </div>
                    )}
                    <span className="accordion-title">{title}</span>
                </div>
                
                <div className="accordion-header-right">
                    {extraHeader}
                    {showArrow && (
                        <div 
                            className="accordion-arrow"
                            style={{ transform: isOpen ? 'rotate(-180deg)' : 'rotate(0deg)' }}
                        >
                            <ChevronDown size={20} />
                        </div>
                    )}
                </div>
            </div>

            {/* Envoltorio de Animación (height controlada por JS para la transición) */}
            <div 
                ref={wrapperRef}
                className="accordion-wrapper"
                style={{ 
                    height: initialOpen ? 'auto' : '0px',
                    opacity: initialOpen ? 1 : 0,
                }}
            >
                <div ref={contentRef} className={`accordion-content ${contentClassName || ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Accordion;
