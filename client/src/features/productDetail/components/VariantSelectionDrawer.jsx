import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import VariantSelector from './VariantSelector';
import './VariantSelectionDrawer.css';

/**
 * VariantSelectionDrawer - Panel inferior para selección de variantes en móvil
 */
const VariantSelectionDrawer = ({ 
    isOpen, 
    onClose, 
    attributes, 
    selections, 
    onChange, 
    checkOptionReachability,
    productName,
    onConfirm
}) => {
    const drawerRef = useRef(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Bloquear scroll del body cuando el drawer está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !isMounted) return null;

    return createPortal(
        <div className={`variant-drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
            <div 
                className={`variant-drawer-content ${isOpen ? 'active' : ''}`} 
                onClick={e => e.stopPropagation()}
                ref={drawerRef}
            >
                {/* Indicador de agarre móvil */}
                <div className="drawer-handle" />

                <header className="drawer-header">
                    <div className="header-info">
                        <span className="drawer-subtitle">Personaliza tu prenda</span>
                        <h3 className="drawer-title">{productName}</h3>
                    </div>
                    <button className="btn-close-drawer" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="drawer-body-scroll">
                    <VariantSelector 
                        attributes={attributes}
                        selections={selections}
                        onChange={onChange}
                        checkOptionReachability={checkOptionReachability}
                    />
                    
                    <div className="drawer-bottom-spacer" />
                </div>

                <footer className="drawer-footer">
                    <button className="btn-confirm-selection" onClick={onConfirm}>
                        <CheckCircle2 size={18} />
                        Confirmar y Continuar
                    </button>
                </footer>
            </div>


        </div>,
        document.body
    );
};

export default VariantSelectionDrawer;
