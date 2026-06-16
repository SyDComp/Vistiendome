import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Palette, Type, Layout, Grid3X3, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Settings, Monitor } from 'lucide-react';
import Button from '../../../Button';

const DataTableStudio = ({ isOpen, onClose, data, onSave }) => {
    const [activeCell, setActiveCell] = useState(null); // { rowIndex, header }
    const [isDeviceMobile, setIsDeviceMobile] = useState(window.innerWidth < 950);
    const [activeMobileTab, setActiveMobileTab] = useState('canvas'); // 'tools' | 'canvas'
    const [config, setConfig] = useState({
        headers: ['Columna 1'],
        rows: [{ 'Columna 1': '' }],
        styles: {
            headerBg: '#f8fafc',
            headerColor: '#64748b',
            cellBg: '#ffffff',
            cellColor: '#1e1b4b',
            borderColor: '#e2e8f0',
            fontSize: '14px',
            borderRadius: '24px'
        }
    });

    useEffect(() => {
        if (data?.config) {
            setConfig({
                ...config,
                ...data.config,
                styles: { ...config.styles, ...(data.config.styles || {}) }
            });
        }
    }, [data]);
    useEffect(() => {
        const handleResize = () => setIsDeviceMobile(window.innerWidth < 950);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isOpen) return null;

    const addColumn = (index = -1) => {
        const name = `Columna ${config.headers.length + 1}`;
        const newHeaders = [...config.headers];
        if (index === -1) newHeaders.push(name);
        else newHeaders.splice(index + 1, 0, name);

        const newRows = config.rows.map(row => ({ ...row, [name]: '' }));
        setConfig({ ...config, headers: newHeaders, rows: newRows });
    };

    const removeColumn = (name) => {
        if (config.headers.length <= 1) return;
        const newHeaders = config.headers.filter(h => h !== name);
        const newRows = config.rows.map(row => {
            const { [name]: removed, ...rest } = row;
            return rest;
        });
        setConfig({ ...config, headers: newHeaders, rows: newRows });
    };

    const addRow = (index = -1) => {
        const newRow = {};
        config.headers.forEach(h => newRow[h] = '');
        const newRows = [...config.rows];
        if (index === -1) newRows.push(newRow);
        else newRows.splice(index + 1, 0, newRow);
        setConfig({ ...config, rows: newRows });
    };

    const removeRow = (index) => {
        if (config.rows.length <= 1) return;
        setConfig({ ...config, rows: config.rows.filter((_, i) => i !== index) });
    };

    const updateCell = (rowIndex, header, patch) => {
        const newRows = [...config.rows];
        const current = newRows[rowIndex][header];
        const currentObj = typeof current === 'object' ? current : { value: current || '', bold: false, color: null };
        newRows[rowIndex] = { ...newRows[rowIndex], [header]: { ...currentObj, ...patch } };
        setConfig({ ...config, rows: newRows });
    };


    const updateHeader = (index, newValue) => {
        const oldName = config.headers[index];
        if (oldName === newValue) return;
        
        const newHeaders = [...config.headers];
        newHeaders[index] = newValue;
        
        const newRows = config.rows.map(row => {
            const { [oldName]: val, ...rest } = row;
            return { ...rest, [newValue]: val };
        });
        
        setConfig({ ...config, headers: newHeaders, rows: newRows });
    };

    const handleSave = () => {
        onSave({ ...data, config });
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(10,8,28,0.98)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', animation: 'studioFadeIn 0.3s ease', overflow: 'hidden' }}>
            
            {/* HEADER */}
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#8f0653', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Grid3X3 size={24} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '900' }}>Studio de Tablas</h2>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{data?.title || 'Editando tabla informativa'}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            color: 'rgba(255,255,255,0.6)', 
                            padding: '0 24px', 
                            borderRadius: '14px', 
                            fontSize: '13px', 
                            fontWeight: '800', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'Outfit, sans-serif'
                        }}
                        onMouseOver={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                        onMouseOut={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                        Cancelar
                    </button>
                    <Button onClick={handleSave} variant="primary" style={{ background: '#8f0653' }}>
                        <Save size={18} /> Guardar Cambios
                    </Button>
                </div>
            </div>

            <div className="dt-studio-layout">
                
                {/* TOOLBAR LATERAL */}
                {(!isDeviceMobile || activeMobileTab === 'tools') && (
                    <div className="dt-studio-sidebar">
                    
                    <section style={{ marginBottom: '40px' }}>
                        <h4 style={{ color: '#fff', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px', opacity: 0.6 }}>Acciones Rápidas</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={() => addRow()} style={toolbarButtonStyle}><Plus size={16} /> Añadir Fila</button>
                            <button onClick={() => removeRow(config.rows.length - 1)} style={{ ...toolbarButtonStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={16} /> Quitar Última Fila</button>
                            <div style={{ height: '12px' }} />
                            <button onClick={() => addColumn()} style={toolbarButtonStyle}><Plus size={16} /> Añadir Columna</button>
                            <button onClick={() => removeColumn(config.headers[config.headers.length - 1])} style={{ ...toolbarButtonStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><Trash2 size={16} /> Quitar Última Columna</button>
                        </div>
                    </section>

                    <section style={{ marginBottom: '40px' }}>
                        <h4 style={{ color: '#fff', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px', opacity: 0.6 }}>Propiedades de Celda</h4>
                        {activeCell ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={styleControlStyle}>
                                    <span>Negrita</span>
                                    <button 
                                        onClick={() => {
                                            const cell = config.rows[activeCell.rowIndex][activeCell.header];
                                            const currentBold = typeof cell === 'object' ? cell.bold : false;
                                            updateCell(activeCell.rowIndex, activeCell.header, { bold: !currentBold });
                                        }}
                                        style={{ ...toolbarButtonStyle, width: '44px', height: '44px', padding: 0, justifyContent: 'center', background: (typeof config.rows[activeCell.rowIndex][activeCell.header] === 'object' ? config.rows[activeCell.rowIndex][activeCell.header].bold : false) ? '#8f0653' : 'rgba(255,255,255,0.05)' }}
                                    >
                                        <Type size={18} />
                                    </button>
                                </div>
                                <div style={styleControlStyle}>
                                    <span>Color Texto</span>
                                    <input 
                                        type="color" 
                                        value={(typeof config.rows[activeCell.rowIndex][activeCell.header] === 'object' ? config.rows[activeCell.rowIndex][activeCell.header].color : null) || config.styles.cellColor} 
                                        onChange={e => updateCell(activeCell.rowIndex, activeCell.header, { color: e.target.value })} 
                                        style={colorPickerStyle} 
                                    />
                                </div>
                                <button onClick={() => updateCell(activeCell.rowIndex, activeCell.header, { bold: false, color: null })} style={{ ...toolbarButtonStyle, fontSize: '11px', padding: '8px' }}>Limpiar Formato</button>
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontStyle: 'italic' }}>Selecciona una celda para editar su estilo...</p>
                        )}
                    </section>

                    <section>
                        <h4 style={{ color: '#fff', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px', opacity: 0.6 }}>Estilos Generales</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={styleControlStyle}>
                                <span>Fondo Encabezado</span>
                                <input type="color" value={config.styles.headerBg} onChange={e => setConfig({...config, styles: {...config.styles, headerBg: e.target.value}})} style={colorPickerStyle} />
                            </div>
                            <div style={styleControlStyle}>
                                <span>Color Texto Encabezado</span>
                                <input type="color" value={config.styles.headerColor} onChange={e => setConfig({...config, styles: {...config.styles, headerColor: e.target.value}})} style={colorPickerStyle} />
                            </div>
                            <div style={styleControlStyle}>
                                <span>Fondo Celdas</span>
                                <input type="color" value={config.styles.cellBg} onChange={e => setConfig({...config, styles: {...config.styles, cellBg: e.target.value}})} style={colorPickerStyle} />
                            </div>
                            <div style={styleControlStyle}>
                                <span>Color Bordes</span>
                                <input type="color" value={config.styles.borderColor} onChange={e => setConfig({...config, styles: {...config.styles, borderColor: e.target.value}})} style={colorPickerStyle} />
                            </div>
                            <div style={styleControlStyle}>
                                <span>Redondeo Tabla</span>
                                <input type="range" min="0" max="40" value={parseInt(config.styles.borderRadius)} onChange={e => setConfig({...config, styles: {...config.styles, borderRadius: `${e.target.value}px`}})} style={{ width: '80px' }} />
                            </div>
                            <div style={styleControlStyle}>
                                <span>Líneas Verticales</span>
                                <input type="checkbox" checked={config.styles.showVerticalLines} onChange={e => setConfig({...config, styles: {...config.styles, showVerticalLines: e.target.checked}})} />
                            </div>
                            <div style={styleControlStyle}>
                                <span>Líneas Horizontales</span>
                                <input type="checkbox" checked={config.styles.showHorizontalLines !== false} onChange={e => setConfig({...config, styles: {...config.styles, showHorizontalLines: e.target.checked}})} />
                            </div>
                        </div>
                    </section>
                </div>
                )}

                {/* AREA DE TRABAJO */}
                {(!isDeviceMobile || activeMobileTab === 'canvas') && (
                <div className="dt-studio-workspace">
                    <div style={{ width: '100%', maxWidth: '1000px', background: config.styles.cellBg, borderRadius: config.styles.borderRadius, boxShadow: '0 40px 100px rgba(0,0,0,0.5)', border: `1px solid ${config.styles.borderColor}`, overflowX: 'auto', boxSizing: 'border-box' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                            <thead>
                                 <tr style={{ background: config.styles.headerBg }}>
                                     <th style={{ width: '80px', background: 'rgba(0,0,0,0.05)', borderBottom: `2px solid ${config.styles.borderColor}`, borderRight: `1px solid ${config.styles.borderColor}` }}></th>
                                    {config.headers.map((h, i) => (
                                         <th key={i} style={{ 
                                             padding: '20px', 
                                             borderBottom: (config.styles.showHorizontalLines !== false) ? `2px solid ${config.styles.borderColor}` : 'none', 
                                             borderRight: (config.styles.showVerticalLines || i < config.headers.length - 1) ? `1px solid ${config.styles.borderColor}` : 'none',
                                             position: 'relative' 
                                         }}>
                                             <input 
                                                 value={h}
                                                 onChange={e => updateHeader(i, e.target.value)}
                                                 style={{ ...headerInputStyle, color: config.styles.headerColor }}
                                             />
                                             <div className="col-actions" style={colActionsStyle}>
                                                 <button onClick={() => addColumn(i)} style={miniButtonStyle} title="Insertar columna a la derecha"><Plus size={10} /></button>
                                                 <button onClick={() => removeColumn(h)} style={{ ...miniButtonStyle, color: '#ef4444' }} title="Eliminar esta columna"><Trash2 size={10} /></button>
                                             </div>
                                         </th>
                                     ))}
                                 </tr>
                            </thead>
                            <tbody>
                                {config.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        <td style={{ 
                                            width: '80px', 
                                            background: 'rgba(0,0,0,0.02)', 
                                            borderRight: `1px solid ${config.styles.borderColor}`, 
                                            borderBottom: (config.styles.showHorizontalLines !== false && rowIndex < config.rows.length - 1) ? `1px solid ${config.styles.borderColor}` : 'none',
                                            textAlign: 'center', 
                                            padding: '10px' 
                                        }}>
                                            <div className="row-actions" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', opacity: 0.4 }}>
                                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>{rowIndex + 1}</span>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => addRow(rowIndex)} style={miniButtonStyle} title="Insertar fila debajo"><Plus size={10} /></button>
                                                    <button onClick={() => removeRow(rowIndex)} style={{ ...miniButtonStyle, color: '#ef4444' }} title="Eliminar esta fila"><Trash2 size={10} /></button>
                                                </div>
                                            </div>
                                        </td>
                                        {config.headers.map((h, colIndex) => {
                                            const cell = row[h];
                                            const val = typeof cell === 'object' ? cell.value : (cell || '');
                                            const isBold = typeof cell === 'object' ? cell.bold : false;
                                            const cellColor = typeof cell === 'object' ? cell.color : null;
                                            const isActive = activeCell?.rowIndex === rowIndex && activeCell?.header === h;

                                            return (
                                                <td key={colIndex} style={{ 
                                                    padding: '0', 
                                                    position: 'relative', 
                                                    background: isActive ? 'rgba(143,6,83,0.1)' : 'transparent',
                                                    borderRight: (config.styles.showVerticalLines || colIndex < config.headers.length - 1) ? `1px solid ${config.styles.borderColor}` : 'none',
                                                    borderBottom: (config.styles.showHorizontalLines !== false && rowIndex < config.rows.length - 1) ? `1px solid ${config.styles.borderColor}` : 'none'
                                                }}>
                                                    <textarea 
                                                        value={val}
                                                        onChange={e => updateCell(rowIndex, h, { value: e.target.value })}
                                                        onFocus={() => setActiveCell({ rowIndex, header: h })}
                                                        rows={1}
                                                        style={{ 
                                                            ...cellInputStyle, 
                                                            color: cellColor || config.styles.cellColor, 
                                                            fontSize: config.styles.fontSize,
                                                            fontWeight: isBold ? '900' : '500',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <p style={{ marginTop: '32px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', width: '100%', maxWidth: '400px', lineHeight: '1.5' }}>
                        💡 **Tip:** Haz clic en los nombres de columna para renombrarlas. Usa los botones flotantes para insertar o eliminar elementos.
                    </p>
                </div>
                )}
            </div>

            {/* Barra de Navegación Inferior Móvil */}
            {isDeviceMobile && (
                <div style={{ display: 'flex', background: '#0a081c', borderTop: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    {[
                        { id: 'tools', icon: <Settings size={20} />, label: 'Herramientas' },
                        { id: 'canvas', icon: <Monitor size={20} />, label: 'Tabla' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveMobileTab(tab.id)}
                            style={{
                                flex: 1, padding: '16px 0', background: 'none', border: 'none',
                                color: activeMobileTab === tab.id ? '#8f0653' : 'rgba(255,255,255,0.4)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes studioFadeIn { from { opacity:0; transform: scale(1.05); } to { opacity:1; transform: scale(1); } }
                .col-actions { opacity: 0.3; transition: opacity 0.2s; }
                th:hover .col-actions { opacity: 1; }
                .row-actions { opacity: 0.3; transition: opacity 0.2s; }
                tr:hover .row-actions { opacity: 1; }
                textarea { resize: none; overflow: hidden; }
            `}</style>
        </div>
    );
};

const toolbarButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const styleControlStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600'
};

const colorPickerStyle = {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '8px',
    background: 'none',
    cursor: 'pointer'
};

const headerInputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    outline: 'none'
};

const cellInputStyle = {
    width: '100%',
    padding: '16px',
    background: 'transparent',
    border: 'none',
    textAlign: 'center',
    outline: 'none',
    display: 'block'
};

const colActionsStyle = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    display: 'flex',
    gap: '2px',
    background: '#fff',
    padding: '2px',
    borderRadius: '6px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 10
};

const miniButtonStyle = {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: 'none',
    background: '#f1f5f9',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
};

export default DataTableStudio;
