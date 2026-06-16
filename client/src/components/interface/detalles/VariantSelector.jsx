import React, { useState } from 'react';
import Accordion from '../../ui/Accordion';
import { Palette, Ruler, Layers, Shirt, Info, Target, Sparkles } from 'lucide-react';
import './VariantSelector.css';

// Orden canónico de tallas
const SIZE_ORDER = ['12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

const sortSizes = (a, b) => {
    const normalize = (v) => v?.toString().toUpperCase().trim();
    const idxA = SIZE_ORDER.indexOf(normalize(a));
    const idxB = SIZE_ORDER.indexOf(normalize(b));
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return normalize(a).localeCompare(normalize(b));
};

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
        return str.toUpperCase();
    };

    return (
        <div className="variant-selectors-container-accordion">
            {attributes.map((attr, index) => {
                const icon = getAttributeIcon(attr.etiqueta);
                const rawValue = selections[attr.id];
                const currentSelection = rawValue === "No aplica" ? null : (formatValue(rawValue) || 'Pendiente');
                const isSingleOption = attr.opciones.length === 1;
                
                if (isSingleOption) {
                    return (
                        <div key={attr.id} className="single-option-row">
                            <div className="single-option-label">
                                {icon && <div className="single-icon-wrap">{React.cloneElement(icon, { size: 14 })}</div>}
                                <span>{attr.etiqueta.toUpperCase()}</span>
                            </div>
                            <div className="single-option-value">
                                {currentSelection}
                            </div>
                        </div>
                    );
                }

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
                            {[...attr.opciones].sort((a, b) => {
                                const aVal = a.valor || a.value || a;
                                const bVal = b.valor || b.value || b;
                                if (attr.id?.toLowerCase().includes('talla')) return sortSizes(aVal, bVal);
                                return 0;
                            }).map((opcObj, oIdx) => {
                                const opc = opcObj.value || opcObj.valor || opcObj;
                                const hex = opcObj.hex_code;
                                const isActive = selections[attr.id] === opc;
                                const isReachable = checkOptionReachability(attr.id, opc);
                                const isNA = opc === "No aplica";
                                const isVisual = attr.type === 'visual' || !!hex;

                                return (
                                    <button
                                        type="button"
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
                                            <span className="btn-text">{formatValue(opc)}</span>
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


        </div>
    );
};

export default VariantSelector;
