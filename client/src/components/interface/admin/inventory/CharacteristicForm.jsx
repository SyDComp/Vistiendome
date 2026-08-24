import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Settings2, Save, ArrowLeft, 
    Hash, Type, LayoutList, Layers, GripVertical, ChevronRight, Settings, Lock, Image
} from 'lucide-react';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import { useNotification } from '../../../../context/NotificationContext';
import Badge from '../../../ui/Badge';
import { formatChar, normalizeDomain } from '../../../../utils/formatters';
import MediaGallery from '../media/MediaGallery';

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
        afecta_apariencia: initialData?.afecta_apariencia === true,
        domain: initialData?.domain || []
    });
    
    const [pickingImageIndex, setPickingImageIndex] = useState(null);

    // Una característica del sistema que YA es visual no puede dejar de serlo:
    // es parte de lo que la define, igual que su nombre. Se evalúa contra los
    // datos guardados, no contra el estado del formulario, para que desmarcar
    // no se "auto-habilite" al vuelo.
    const visualBloqueada = initialData?.is_system === true && initialData?.afecta_apariencia === true;

    const isColorType = localData.system_id === 'COLOR' || localData.system_id === 'sys_color' || localData.name.toUpperCase() === 'COLOR';
    const isPatternType = localData.system_id === 'sys_pattern' || localData.system_id === 'ESTAMPADO' || ['ESTAMPADO', 'PATRÓN', 'PATRON', 'DISEÑO', 'DISENO', 'TELA'].includes(localData.name.toUpperCase());

    useEffect(() => {
        if (isColorType) {
            setLocalData(p => ({
                ...p,
                is_system: true,
                system_id: 'sys_color',
                value_structure: [
                    { label: 'Nombre del Color', key: 'value', type: 'text' },
                    { label: 'Código Hex', key: 'hex_code', type: 'color' }
                ]
            }));
        } else if (isPatternType) {
            setLocalData(p => ({
                ...p,
                is_system: true,
                system_id: 'sys_pattern',
                value_structure: [
                    { label: 'Nombre del Estampado / Diseño', key: 'value', type: 'text' },
                    { label: 'URL de Imagen', key: 'image_url', type: 'image' }
                ]
            }));
        } else if (!localData.is_system) {
            // Si es libre, forzamos estructura simple
            setLocalData(p => ({
                ...p,
                value_structure: [{ label: 'Valor', key: 'value', type: 'text' }]
            }));
        }
    }, [isColorType, isPatternType, localData.is_system]);

    const addOption = () => {
        const newRow = {};
        localData.value_structure.forEach(col => {
            if (isColorType && col.key === 'hex_code') {
                newRow[col.key] = '#000000';
            } else if (isPatternType && col.key === 'image_url') {
                newRow[col.key] = '';
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
                    {/* Si es del sistema y ya es visual, queda fija: el Explorador se
                        apoya en que exista al menos una para separar las tarjetas.
                        Se muestra bloqueada y no oculta, para que se entienda por qué. */}
                    <div className="char-form-filter-wrap">
                        <input
                            type="checkbox"
                            id="char_afecta_apariencia"
                            checked={localData.afecta_apariencia}
                            disabled={visualBloqueada}
                            onChange={e => setLocalData(p => ({ ...p, afecta_apariencia: e.target.checked }))}
                        />
                        <label htmlFor="char_afecta_apariencia" className="char-form-filter-label">
                            Cambia cómo se ve la prenda
                            {visualBloqueada && <span className="char-form-lock"> · fijo del sistema</span>}
                        </label>
                    </div>
                    <p className="char-form-hint">
                        {visualBloqueada
                            ? 'Es una característica del sistema y define cómo se ve la prenda, así que no se puede desmarcar: el Explorador la usa para mostrar una tarjeta por cada valor. Sí puedes marcar esta opción en cualquier característica que crees tú.'
                            : 'Márcalo en Color o Estampado: el Explorador mostrará una foto por cada valor. No lo marques en Talla — cambia la prenda, pero no cómo se ve.'}
                    </p>
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
                                    </div>
                                ) : isPatternType ? (
                                    <div className="char-form-row-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {row.image_url ? (
                                                <img src={row.image_url} alt="patrón" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Image size={18} color="#94a3b8" />
                                            )}
                                        </div>
                                        <div className="char-form-inputs-col" style={{ flex: 1, display: 'flex', gap: '10px' }}>
                                            <input 
                                                value={row.value || ''} 
                                                onChange={e => updateValue(rIdx, 'value', e.target.value)} 
                                                onBlur={e => updateValue(rIdx, 'value', formatOpt(e.target.value))}
                                                placeholder="Nombre del estampado (ej: Floral Primavera)" 
                                                onKeyDown={e => e.key === 'Enter' && addOption()} 
                                                autoFocus={!row.is_system && rIdx === localData.domain.length - 1} 
                                                disabled={row.is_system}
                                                className={`char-form-input-val ${row.is_system ? 'system' : 'normal'}`}
                                                style={{ flex: 2 }}
                                            />
                                            <button 
                                                type="button"
                                                disabled={row.is_system}
                                                onClick={() => setPickingImageIndex(rIdx)}
                                                style={{
                                                    padding: '0 14px',
                                                    height: '38px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    background: '#fff',
                                                    color: '#334155',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: row.is_system ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <Image size={16} />
                                                {row.image_url ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                                            </button>
                                        </div>
                                        {row.is_system && <Badge variant="error" size="sm" className="char-form-badge-sys">SISTEMA</Badge>}
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
                </div>

                {/* SECCIÓN 4: TIP */}
                <div className="char-form-section-4">
                    <div className="char-form-tip">
                        <Settings size={14} /> Tip: Puedes presionar **Enter** para añadir opciones consecutivas rápidamente.
                    </div>
                </div>
            </div>

            {/* Modal para Selección de Imagen desde la Biblioteca de Medios */}
            {pickingImageIndex !== null && (
                <MediaGallery 
                    isOpen={true} 
                    onClose={() => setPickingImageIndex(null)} 
                    onSelect={(assets) => {
                        const a = Array.isArray(assets) ? assets[0] : assets;
                        if (a && a.url) {
                            updateValue(pickingImageIndex, 'image_url', a.url);
                        }
                        setPickingImageIndex(null);
                    }} 
                />
            )}

        </div>
    );
};

export default CharacteristicForm;
