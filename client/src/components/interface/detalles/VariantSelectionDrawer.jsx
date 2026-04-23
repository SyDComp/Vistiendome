import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, ShoppingBag } from 'lucide-react';
import VariantSelector from './VariantSelector';

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

    // Bloquear scroll del body cuando el drawer está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
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

            <style>{`
                .variant-drawer-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    z-index: 2000;
                    display: flex;
                    align-items: flex-end;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .variant-drawer-overlay.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .variant-drawer-content {
                    width: 100%;
                    max-height: 85vh;
                    background: #fff;
                    border-radius: 32px 32px 0 0;
                    display: flex;
                    flex-direction: column;
                    transform: translateY(100%);
                    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 -20px 40px rgba(0,0,0,0.1);
                    position: relative;
                }
                .variant-drawer-content.active {
                    transform: translateY(0);
                }

                .drawer-handle {
                    width: 40px;
                    height: 5px;
                    background: #e2e8f0;
                    border-radius: 10px;
                    margin: 12px auto 4px;
                }

                .drawer-header {
                    padding: 20px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                }
                .drawer-subtitle {
                    font-size: 11px;
                    font-weight: 800;
                    color: #8f0653;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    display: block;
                    margin-bottom: 2px;
                }
                .drawer-title {
                    font-size: 18px;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0;
                }

                .btn-close-drawer {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    cursor: pointer;
                }

                .drawer-body-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                    -webkit-overflow-scrolling: touch;
                }

                .drawer-bottom-spacer {
                    height: 20px;
                }

                .drawer-footer {
                    padding: 20px 24px 40px;
                    background: #fff;
                    border-top: 1px solid #f1f5f9;
                }

                .btn-confirm-selection {
                    width: 100%;
                    background: #0f172a;
                    color: #fff;
                    border: none;
                    padding: 18px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
                    transition: transform 0.2s;
                }
                .btn-confirm-selection:active {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
};

export default VariantSelectionDrawer;
