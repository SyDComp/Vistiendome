import React, { useState } from 'react';
import Accordion from '../../ui/Accordion';
import { Palette, Ruler, Layers, Shirt, Info, Target, Sparkles } from 'lucide-react';

const VariantSelector = ({ 
    attributes = [], 
    selections = {}, 
    onChange, 
    checkOptionReachability = () => true 
}) => {
    // Estado para controlar qué acordeón está abierto (Single Accordion Behavior)
    const [openId, setOpenId] = useState(attributes.length > 0 ? attributes[0].id : null);

    // Ayudante para asignar iconos basados en el nombre del atributo
    const getAttributeIcon = (label) => {
        const l = label.toLowerCase();
        if (l.includes('color')) return <Palette />;
        if (l.includes('talla') || l.includes('medida')) return <Ruler />;
        if (l.includes('tela') || l.includes('material')) return <Layers />;
        if (l.includes('tipo') || l.includes('estilo')) return <Shirt />;
        if (l.includes('colección')) return <Target />;
        return <Sparkles />;
    };

    /**
     * Estandariza el formato de las opciones: primera letra de cada palabra en mayúscula.
     * Ejemplo: "verde brasil" -> "Verde Brasil"
     */
    const formatValue = (str) => {
        if (!str || typeof str !== 'string') return str;
        return str.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    return (
        <div className="variant-selectors-container-accordion">
            {attributes.map((attr, index) => {
                const icon = getAttributeIcon(attr.etiqueta);
                const rawValue = selections[attr.id];
                const currentSelection = rawValue === "No aplica" ? "Estándar" : (formatValue(rawValue) || 'Pendiente');
                const isSingleOption = attr.opciones.length === 1;
                
                return (
                    <Accordion
                        key={attr.id}
                        title={attr.etiqueta.toUpperCase()}
                        icon={icon}
                        showArrow={!isSingleOption}
                        disabled={isSingleOption}
                        extraHeader={(
                            <div className="selection-badge">
                                {currentSelection}
                            </div>
                        )}
                        initialOpen={openId === attr.id && !isSingleOption}
                        onToggle={(isOpen) => {
                            if (isOpen) setOpenId(attr.id);
                            else if (openId === attr.id) setOpenId(null);
                        }}
                        style={{ marginBottom: '12px' }}
                    >
                        <div className={`options-layout ${attr.type === 'visual' ? 'grid-visual' : 'grid-text'}`}>
                            {attr.opciones.map((opcObj, oIdx) => {
                                const opc = opcObj.value || opcObj.valor || opcObj;
                                const hex = opcObj.hex_code;
                                const isActive = selections[attr.id] === opc;
                                const isReachable = checkOptionReachability(attr.id, opc);
                                const isNA = opc === "No aplica";
                                const isVisual = attr.type === 'visual' || !!hex;

                                return (
                                    <button
                                        key={oIdx}
                                        className={`concierge-btn ${isActive ? 'active' : ''} ${!isReachable ? 'disabled' : ''} ${isVisual ? 'type-visual' : 'type-text'}`}
                                        onClick={() => onChange(attr.id, opc)}
                                        title={opc}
                                    >
                                        {isVisual ? (
                                            <div className="swatch-container">
                                                {opcObj.thumb ? (
                                                    <img src={opcObj.thumb} alt={opc} className="swatch-img" />
                                                ) : (
                                                    <div style={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        background: hex || '#cbd5e1',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {!hex && <span style={{ fontSize: '20px', opacity: 0.2 }}>🎨</span>}
                                                    </div>
                                                )}
                                                {isActive && <div className="swatch-check">✓</div>}
                                                <span className="swatch-label">{formatValue(opc)}</span>
                                            </div>
                                        ) : (
                                            <span className="btn-text">{isNA ? 'Estándar' : formatValue(opc)}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </Accordion>
                );
            })}

            {attributes.length === 0 && (
                <div className="static-info-badge">
                    ✨ Producto de Talla y Color Único
                </div>
            )}

            <style>{`
                .variant-selectors-container {
                    display: flex;
                    flex-direction: column;
                    gap: 35px;
                    padding-top: 10px;
                }
                .attribute-group {
                    animation: slideUp 0.4s ease-out;
                }
                .attribute-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 18px;
                }
                .attribute-label-premium {
                    font-size: 11px;
                    font-weight: 900;
                    color: #64748b;
                    letter-spacing: 2px;
                }
                .selection-badge {
                    font-size: 13px;
                    font-weight: 800;
                    color: #8f0653;
                    background: #fdf2f8;
                    padding: 4px 12px;
                    border-radius: 8px;
                }

                .options-layout {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .grid-visual { gap: 20px; }

                /* Botones Estilo Conserje */
                .concierge-btn {
                    position: relative;
                    border: 2px solid #f1f5f9;
                    background: white;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                }

                .type-text {
                    padding: 15px 25px;
                    border-radius: 16px;
                    min-width: 80px;
                    font-size: 15px;
                    font-weight: 800;
                    color: #1e293b;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .type-text.active {
                    background: #1e1b4b;
                    border-color: #1e1b4b;
                    color: white;
                    transform: scale(1.05);
                    box-shadow: 0 10px 20px rgba(30,27,75,0.15);
                }

                .type-visual {
                    padding: 0;
                    border-radius: 20px;
                    width: 100px;
                    height: 120px;
                    overflow: hidden;
                    border: 3px solid #f1f5f9;
                }
                .type-visual.active {
                    border-color: #8f0653;
                    transform: scale(1.05);
                    box-shadow: 0 10px 25px rgba(143,6,83,0.15);
                }

                .swatch-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .swatch-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .swatch-label {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(255,255,255,0.9);
                    backdrop-filter: blur(4px);
                    font-size: 10px;
                    font-weight: 900;
                    padding: 6px 0;
                    text-transform: uppercase;
                    color: #1e293b;
                }
                .swatch-check {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #8f0653;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 900;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                }

                .static-info-badge {
                    background: #f8fafc;
                    border: 1px dashed #cbd5e1;
                    padding: 20px;
                    border-radius: 16px;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: #64748b;
                }

                .concierge-btn.disabled {
                    opacity: 0.6;
                    filter: grayscale(0.5);
                    cursor: pointer; /* Cambiado de not-allowed a pointer para reflejar que es clickeable */
                    transform: none !important;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 768px) {
                    .type-visual { width: 85px; height: 105px; }
                    .type-text { padding: 12px 20px; font-size: 14px; }
                }
            `}</style>
        </div>
    );
};

export default VariantSelector;
