import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Settings2, Save, ArrowLeft, 
    Palette, Hash, Type, LayoutList, Layers, GripVertical, ChevronRight, Settings
} from 'lucide-react';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import { useNotification } from '../../../../context/NotificationContext';
import { formatChar, normalizeDomain } from '../../../../utils/formatters';

const CharacteristicForm = ({ initialData, onSave, onCancel, standalone = false }) => {
    const { prompt } = useNotification();
    
    const [localData, setLocalData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        value_structure: initialData?.value_structure?.length 
            ? initialData.value_structure 
            : [{ label: 'Valor', key: 'value', type: 'text' }],
        is_filterable: initialData?.is_filterable === false ? false : true,
        domain: initialData?.domain || []
    });
    
    const [libraryColors, setLibraryColors] = useState([]);
    const [showLibraryModal, setShowLibraryModal] = useState(false);

    const isColorType = localData.name.toLowerCase() === 'color' || localData.name.toLowerCase() === 'colores';

    useEffect(() => {
        if (isColorType) {
            fetch('http://127.0.0.1:8000/api/v1/admin/catalog/colors')
                .then(r => r.json())
                .then(setLibraryColors)
                .catch(console.error);
            
            setLocalData(p => ({
                ...p,
                value_structure: [
                    { label: 'Nombre del Color', key: 'value', type: 'text' },
                    { label: 'Código Hex', key: 'hex_code', type: 'color' }
                ]
            }));
        }
    }, [isColorType]);

    const addOption = () => {
        const newRow = {};
        localData.value_structure.forEach(col => newRow[col.key] = '');
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

    const addExtraField = async () => {
        const label = await prompt("¿Qué otro dato quieres guardar de cada opción? (ej: Código, Hexadecimal, etc)");
        if (!label) return;
        const key = `extra_${Date.now()}`;
        const type = label.toLowerCase().includes('color') ? 'color' : 'text';
        
        setLocalData(prev => ({ 
            ...prev, 
            value_structure: [...prev.value_structure, { label, key, type }] 
        }));
    };

    return (
        <div style={{ 
            maxWidth: '800px', margin: '0 auto', width: '100%',
            display: 'flex', flexDirection: 'column', height: '90vh', 
            animation: 'fadeIn 0.3s ease-out' 
        }}>
            {/* CABECERA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={onCancel} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e1b4b' }}>
                        {initialData ? 'Configurar Característica' : 'Nueva Característica'}
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
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

            <div style={{ 
                background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.04)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0
            }}>
                {/* SECCIÓN 1: NOMBRE PRINCIPAL */}
                <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfc' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', marginBottom: '12px' }}>
                        Identificador (Biblioteca)
                    </label>
                    <input 
                        value={localData.name}
                        onChange={e => setLocalData(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ej: Tallas, Colores..."
                        autoFocus
                        style={{ width: '100%', fontSize: '22px', fontWeight: '700', border: 'none', outline: 'none', background: 'transparent', color: '#1e1b4b' }}
                    />
                    <input 
                        value={localData.description}
                        onChange={e => setLocalData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Descripción breve (opcional)..."
                        style={{ width: '100%', fontSize: '14px', fontWeight: '500', border: 'none', outline: 'none', background: 'transparent', color: '#64748b' }}
                    />
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
                        <input type="checkbox" id="char_is_filterable" checked={localData.is_filterable} onChange={e => setLocalData(p => ({ ...p, is_filterable: e.target.checked }))} />
                        <label htmlFor="char_is_filterable" style={{ fontSize: '12px', fontWeight: '800', color: '#1e1b4b', textTransform: 'uppercase' }}>Mostrar en filtros</label>
                    </div>
                </div>

                {/* SECCIÓN 2: LISTA DE VALORES (SCROLLABLE) */}
                <div style={{ padding: '32px 32px 10px 32px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                            Opciones Disponibles ({localData.domain.length})
                        </h4>
                        {!isColorType && (
                            <button onClick={addExtraField} style={{ background: 'none', border: 'none', color: '#8f0653', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>+ Detalles extra</button>
                        )}
                    </div>

                    <div style={{ 
                        flex: 1, overflowY: 'auto', paddingRight: '12px', marginRight: '-12px',
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        scrollbarWidth: 'thin', scrollbarColor: '#8f0653 #f1f5f9'
                    }} className="custom-scrollbar">
                        {localData.domain.map((row, rIdx) => (
                            <div key={rIdx} style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', 
                                padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ color: '#cbd5e1' }}><GripVertical size={16} /></div>
                                
                                {isColorType ? (
                                    <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ 
                                            width: '40px', height: '40px', borderRadius: '50%', background: row.hex_code || '#000', 
                                            border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden'
                                        }}>
                                            <input type="color" value={row.hex_code || '#000000'} onChange={e => {
                                                updateValue(rIdx, 'hex_code', e.target.value);
                                                setTimeout(() => {
                                                    const el = document.getElementById(`hex-input-${rIdx}`);
                                                    if (el) { el.focus(); const len = el.value.length; el.setSelectionRange(len, len); }
                                                }, 50);
                                            }} style={{ position: 'absolute', inset: -5, width: '150%', height: '150%', cursor: 'pointer', border: 'none', background: 'none' }} />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <input value={row.value || ''} onChange={e => updateValue(rIdx, 'value', e.target.value)} placeholder="Nombre del color" onKeyDown={e => e.key === 'Enter' && addOption()} autoFocus={rIdx === localData.domain.length - 1} style={{ background: 'none', border: 'none', fontWeight: '900', color: '#1e1b4b', fontSize: '16px', textTransform: 'uppercase', outline: 'none', width: '100%', padding: 0 }} />
                                            <input id={`hex-input-${rIdx}`} value={row.hex_code || ''} onChange={e => updateValue(rIdx, 'hex_code', e.target.value)} placeholder="#000000" onKeyDown={e => e.key === 'Enter' && addOption()} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#64748b', fontWeight: '700', fontFamily: 'monospace', outline: 'none', width: '100%', padding: 0 }} />
                                        </div>
                                        {libraryColors.some(lc => lc.name === row.value) && <span style={{ fontSize: '10px', background: '#fdf2f8', color: '#db2777', padding: '4px 8px', borderRadius: '8px', fontWeight: '800' }}>VINCULADO</span>}
                                    </div>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        {localData.value_structure.map(col => (
                                            <div key={col.key} style={{ flex: col.key === 'value' ? 2 : 1 }}>
                                                <input value={row[col.key] || ''} onChange={e => updateValue(rIdx, col.key, e.target.value)} placeholder={col.label} onKeyDown={e => e.key === 'Enter' && addOption()} style={{ background: 'none', border: 'none', fontWeight: '700', outline: 'none', width: '100%' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button onClick={() => removeOption(rIdx)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 3: ACCIONES PRINCIPALES (PERSISTENTES) */}
                <div style={{ 
                    padding: '24px 32px', background: '#fff', borderTop: '1px solid #f1f5f9',
                    display: 'flex', gap: '16px', boxShadow: '0 -10px 20px rgba(0,0,0,0.02)'
                }}>
                    <button onClick={addOption} style={{ flex: 1, padding: '18px', borderRadius: '18px', border: '2px dashed #8f0653', color: '#8f0653', background: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Plus size={20} /> Añadir nueva opción
                    </button>
                    {isColorType && (
                        <button onClick={() => setShowLibraryModal(true)} style={{ flex: 2, padding: '18px', borderRadius: '18px', border: 'none', color: '#fff', background: 'linear-gradient(135deg, #8f0653 0%, #db2777 100%)', fontSize: '15px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 14px rgba(143,6,83,0.3)' }}>
                            <Palette size={20} /> Importar de Biblioteca
                        </button>
                    )}
                </div>

                {/* SECCIÓN 4: TIP */}
                <div style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={14} /> Tip: Puedes presionar **Enter** para añadir opciones consecutivas rápidamente.
                    </div>
                </div>
            </div>

            {/* Modal Biblioteca */}
            {showLibraryModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '32px' }}>
                        <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '900', color: '#1e1b4b' }}>Biblioteca de Colores</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                            {libraryColors.map(color => {
                                const isSelected = localData.domain.some(d => d.value === color.name);
                                return (
                                    <button key={color.id} onClick={() => isSelected ? setLocalData(p => ({ ...p, domain: p.domain.filter(d => d.value !== color.name) })) : setLocalData(p => ({ ...p, domain: [...p.domain, { value: color.name, hex_code: color.hex_code }] }))} style={{ background: '#fff', border: `2px solid ${isSelected ? '#8f0653' : '#e2e8f0'}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color.hex_code, border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}></div>
                                        <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>{color.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="primary" onClick={() => setShowLibraryModal(false)}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #8f0653; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CharacteristicForm;
