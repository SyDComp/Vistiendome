import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Settings2, Save, ArrowLeft, 
    Palette, Hash, Type, LayoutList, Layers, GripVertical, ChevronRight, Settings, Lock
} from 'lucide-react';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import { useNotification } from '../../../../context/NotificationContext';
import Badge from '../../../ui/Badge';
import { formatChar, normalizeDomain } from '../../../../utils/formatters';

const CharacteristicForm = ({ initialData, onSave, onCancel, standalone = false }) => {
    const { prompt } = useNotification();
    
    const [localData, setLocalData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        is_system: initialData?.is_system || false,
        system_id: initialData?.system_id || null,
        value_structure: initialData?.value_structure?.length 
            ? initialData.value_structure 
            : [{ label: 'Valor', key: 'value', type: 'text' }],
        is_filterable: initialData?.is_filterable === false ? false : true,
        domain: initialData?.domain || []
    });
    
    const [libraryColors, setLibraryColors] = useState([]);
    const [showLibraryModal, setShowLibraryModal] = useState(false);

    const isColorType = localData.system_id === 'COLOR' || localData.name.toUpperCase() === 'COLOR';

    useEffect(() => {
        if (isColorType) {
            fetch((import.meta.env.PROD ? '/api/v1/admin/catalog/colors' : 'http://127.0.0.1:8000/api/v1/admin/catalog/colors'))
                .then(r => r.json())
                .then(setLibraryColors)
                .catch(console.error);
            
            setLocalData(p => ({
                ...p,
                is_system: true,
                system_id: 'COLOR',
                value_structure: [
                    { label: 'Nombre del Color', key: 'value', type: 'text' },
                    { label: 'Código Hex', key: 'hex_code', type: 'color' }
                ]
            }));
        } else if (!localData.is_system) {
            // Si es libre, forzamos estructura simple
            setLocalData(p => ({
                ...p,
                value_structure: [{ label: 'Valor', key: 'value', type: 'text' }]
            }));
        }
    }, [isColorType, localData.is_system]);

    const addOption = () => {
        const newRow = {};
        localData.value_structure.forEach(col => {
            if (isColorType && col.key === 'hex_code') {
                newRow[col.key] = '#000000';
            } else {
                newRow[col.key] = '';
            }
        });
        setLocalData(prev => ({ ...prev, domain: [...prev.domain, newRow] }));
    };

    const removeOption = (idx) => {
        const newDomain = [...localData.domain];
        newDomain.splice(idx, 1);
        setLocalData(prev => ({ ...prev, domain: newDomain }));
    };

    const updateValue = (rowIdx, key, val) => {
        const newDomain = [...localData.domain];
        newDomain[rowIdx][key] = val;
        setLocalData(prev => ({ ...prev, domain: newDomain }));
    };

    return (
        <div className="char-form-container">
            {/* CABECERA */}
            <div className="char-form-header">
                <div className="char-form-header-left">
                    <button onClick={onCancel} className="char-form-back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="char-form-title">
                        {initialData ? 'Configurar Característica' : 'Nueva Característica'}
                    </h2>
                </div>
                <div className="char-form-header-right">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button variant="primary" onClick={() => {
                        // Aplicar normalización estricta antes de guardar
                        const normalizedData = {
                            ...localData,
                            name: formatChar(localData.name),
                            domain: normalizeDomain(localData.domain)
                        };
                        onSave(normalizedData);
                    }}>
                        <Save size={18} style={{ marginRight: '8px' }} /> Guardar en Biblioteca
                    </Button>
                </div>
            </div>

            <div className="char-form-body-wrapper">
                {/* SECCIÓN 1: NOMBRE PRINCIPAL */}
                <div className="char-form-section-1">
                    <label className="char-form-label">
                        Identificador (Biblioteca)
                    </label>
                    <div className="char-form-input-wrap">
                        <input 
                            value={localData.name}
                            onChange={e => setLocalData(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                            placeholder="Ej: Tallas, Colores..."
                            autoFocus={!localData.is_system}
                            disabled={localData.is_system}
                            className={`char-form-input-main ${localData.is_system ? 'system' : 'normal'}`}
                        />
                        {localData.is_system && (
                            <div className="char-form-protected-badge">
                                <Lock size={12} /> NOMBRE PROTEGIDO
                            </div>
                        )}
                    </div>
                    <input 
                        value={localData.description}
                        onChange={e => setLocalData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Descripción breve (opcional)..."
                        className="char-form-desc-input"
                    />
                    <div className="char-form-filter-wrap">
                        <input type="checkbox" id="char_is_filterable" checked={localData.is_filterable} onChange={e => setLocalData(p => ({ ...p, is_filterable: e.target.checked }))} />
                        <label htmlFor="char_is_filterable" className="char-form-filter-label">Mostrar en filtros</label>
                    </div>
                </div>

                {/* SECCIÓN 2: LISTA DE VALORES (SCROLLABLE) */}
                <div className="char-form-section-2">
                    <div className="char-form-section-2-header">
                        <h4 className="char-form-section-2-title">
                            Opciones Disponibles ({localData.domain.length})
                        </h4>
                    </div>

                    <div className="char-form-options-list">
                        {localData.domain.map((row, rIdx) => (
                            <div key={rIdx} className={`char-form-row ${row.is_system ? 'system' : 'normal'}`}>
                                <div className="char-form-row-icon">
                                    {row.is_system ? <Lock size={16} /> : <GripVertical size={16} />}
                                </div>
                                
                                {isColorType ? (
                                    <div className="char-form-row-content">
                                        <div className={`char-form-color-circle ${row.is_system ? 'system' : 'normal'}`} style={{ background: row.hex_code || '#000' }}>
                                            {!row.is_system && (
                                                <input type="color" value={row.hex_code || '#000000'} onChange={e => {
                                                    updateValue(rIdx, 'hex_code', e.target.value);
                                                    setTimeout(() => {
                                                        const el = document.getElementById(`hex-input-${rIdx}`);
                                                        if (el) { el.focus(); const len = el.value.length; el.setSelectionRange(len, len); }
                                                    }, 50);
                                                }} className="char-form-color-input-hidden" />
                                            )}
                                        </div>
                                        <div className="char-form-inputs-col">
                                            <input 
                                                value={row.value || ''} 
                                                onChange={e => updateValue(rIdx, 'value', e.target.value)} 
                                                onBlur={e => updateValue(rIdx, 'value', formatOpt(e.target.value))}
                                                placeholder="Nombre del color" 
                                                onKeyDown={e => e.key === 'Enter' && addOption()} 
                                                autoFocus={!row.is_system && rIdx === localData.domain.length - 1} 
                                                disabled={row.is_system}
                                                className={`char-form-input-val ${row.is_system ? 'system' : 'normal'}`}
                                            />
                                            <input 
                                                id={`hex-input-${rIdx}`} 
                                                value={row.hex_code || ''} 
                                                onChange={e => updateValue(rIdx, 'hex_code', e.target.value)} 
                                                placeholder="#000000" 
                                                onKeyDown={e => e.key === 'Enter' && addOption()} 
                                                disabled={row.is_system}
                                                className={`char-form-input-hex ${row.is_system ? 'system' : 'normal'}`}
                                            />
                                        </div>
                                        {row.is_system && <Badge variant="error" size="sm" className="char-form-badge-sys">SISTEMA</Badge>}
                                        {libraryColors.some(lc => lc.name === row.value) && !row.is_system && <span className="char-form-badge-linked">VINCULADO</span>}
                                    </div>
                                ) : (
                                    <div className="char-form-row-content">
                                        {localData.value_structure.map(col => (
                                            <div key={col.key} style={{ flex: col.key === 'value' ? 2 : 1 }}>
                                                <input 
                                                    value={row[col.key] || ''} 
                                                    onChange={e => updateValue(rIdx, col.key, e.target.value)} 
                                                    onBlur={e => col.key === 'value' && updateValue(rIdx, col.key, formatOpt(e.target.value))}
                                                    placeholder={col.label} 
                                                    onKeyDown={e => e.key === 'Enter' && addOption()} 
                                                    disabled={row.is_system}
                                                    className={`char-form-input-generic ${row.is_system ? 'system' : 'normal'}`}
                                                />
                                            </div>
                                        ))}
                                        {row.is_system && <Badge variant="error" size="sm" className="char-form-badge-sys">SISTEMA</Badge>}
                                    </div>
                                )}
                                {!row.is_system && (
                                    <button onClick={() => removeOption(rIdx)} className="char-form-del-btn">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 3: ACCIONES PRINCIPALES (PERSISTENTES) */}
                <div className="char-form-section-3">
                    <button onClick={addOption} className="char-form-btn-add">
                        <Plus size={20} /> Añadir nueva opción
                    </button>
                    {isColorType && (
                        <button onClick={() => setShowLibraryModal(true)} className="char-form-btn-import">
                            <Palette size={20} /> Importar de Biblioteca
                        </button>
                    )}
                </div>

                {/* SECCIÓN 4: TIP */}
                <div className="char-form-section-4">
                    <div className="char-form-tip">
                        <Settings size={14} /> Tip: Puedes presionar **Enter** para añadir opciones consecutivas rápidamente.
                    </div>
                </div>
            </div>

            {/* Modal Biblioteca */}
            {showLibraryModal && (
                <div className="char-form-modal-overlay">
                    <div className="char-form-modal-box">
                        <h3 className="char-form-modal-title">Biblioteca de Colores</h3>
                        <div className="char-form-modal-grid">
                            {libraryColors.map(color => {
                                const isSelected = localData.domain.some(d => d.value === color.name);
                                return (
                                    <button key={color.id} onClick={() => isSelected ? setLocalData(p => ({ ...p, domain: p.domain.filter(d => d.value !== color.name) })) : setLocalData(p => ({ ...p, domain: [...p.domain, { value: color.name, hex_code: color.hex_code }] }))} className={`char-form-modal-color-btn ${isSelected ? 'selected' : 'unselected'}`}>
                                        <div className="char-form-modal-color-circle" style={{ background: color.hex_code }}></div>
                                        <span className="char-form-modal-color-name">{color.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="char-form-modal-actions">
                            <Button variant="primary" onClick={() => setShowLibraryModal(false)}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default CharacteristicForm;
