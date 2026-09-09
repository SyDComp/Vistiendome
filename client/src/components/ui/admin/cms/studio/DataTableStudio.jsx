import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Palette, Type, Layout, Grid3X3, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Settings, Monitor } from 'lucide-react';
import Button from '../../../Button';
import './DataTableStudio.css';
import './estudio.css';

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
        <div className="est est-lienzo">
            
            {/* HEADER */}
            <div className="est-barra">
                <div className="est-fila--amplia">
                    <div className="est-emblema">
                        <Grid3X3 size={24} color="#fff" />
                    </div>
                    <div>
                        <h2 className="est-titulo-grande">Studio de Tablas</h2>
                        <p className="est-bajada">{data?.title || 'Editando tabla informativa'}</p>
                    </div>
                </div>
                <div className="est-fila--holgada">
                    <button 
                        onClick={onClose} 
                        className="est-boton-velo"
                        onMouseOver={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                        onMouseOut={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                        Cancelar
                    </button>
                    <Button onClick={handleSave} variant="primary" className="est-boton-barra--activo">
                        <Save size={18} /> Guardar Cambios
                    </Button>
                </div>
            </div>

            <div className="dt-studio-layout">
                
                {/* TOOLBAR LATERAL */}
                {(!isDeviceMobile || activeMobileTab === 'tools') && (
                    <div className="dt-studio-sidebar">
                    
                    <section className="est-grupo">
                        <h4 className="est-seccion">Acciones Rápidas</h4>
                        <div className="est-columna--holgada">
                            <button onClick={() => addRow()} className="est-boton-barra"><Plus size={16} /> Añadir Fila</button>
                            <button onClick={() => removeRow(config.rows.length - 1)} className="est-boton-barra est-boton-barra--peligro"><Trash2 size={16} /> Quitar Última Fila</button>
                            <div className="est-hueco" />
                            <button onClick={() => addColumn()} className="est-boton-barra"><Plus size={16} /> Añadir Columna</button>
                            <button onClick={() => removeColumn(config.headers[config.headers.length - 1])} className="est-boton-barra est-boton-barra--peligro"><Trash2 size={16} /> Quitar Última Columna</button>
                        </div>
                    </section>

                    <section className="est-grupo">
                        <h4 className="est-seccion">Propiedades de Celda</h4>
                        {activeCell ? (
                            <div className="est-columna--amplia">
                                <div className="est-control-estilo">
                                    <span>Negrita</span>
                                    <button 
                                        onClick={() => {
                                            const cell = config.rows[activeCell.rowIndex][activeCell.header];
                                            const currentBold = typeof cell === 'object' ? cell.bold : false;
                                            updateCell(activeCell.rowIndex, activeCell.header, { bold: !currentBold });
                                        }}
                                        className={`est-boton-barra est-boton-barra--cuadrado${(typeof config.rows[activeCell.rowIndex][activeCell.header] === 'object' ? config.rows[activeCell.rowIndex][activeCell.header].bold : false) ? ' est-boton-barra--activo' : ''}`}
                                    >
                                        <Type size={18} />
                                    </button>
                                </div>
                                <div className="est-control-estilo">
                                    <span>Color Texto</span>
                                    <input 
                                        type="color" 
                                        value={(typeof config.rows[activeCell.rowIndex][activeCell.header] === 'object' ? config.rows[activeCell.rowIndex][activeCell.header].color : null) || config.styles.cellColor} 
                                        onChange={e => updateCell(activeCell.rowIndex, activeCell.header, { color: e.target.value })} 
                                        className="est-selector-color" 
                                    />
                                </div>
                                <button onClick={() => updateCell(activeCell.rowIndex, activeCell.header, { bold: false, color: null })} className="est-boton-barra est-boton-barra--menor">Limpiar Formato</button>
                            </div>
                        ) : (
                            <p className="est-texto-vacio">Selecciona una celda para editar su estilo...</p>
                        )}
                    </section>

                    <section>
                        <h4 className="est-seccion">Estilos Generales</h4>
                        <div className="est-columna--amplia">
                            <div className="est-control-estilo">
                                <span>Fondo Encabezado</span>
                                <input type="color" value={config.styles.headerBg} onChange={e => setConfig({...config, styles: {...config.styles, headerBg: e.target.value}})} className="est-selector-color" />
                            </div>
                            <div className="est-control-estilo">
                                <span>Color Texto Encabezado</span>
                                <input type="color" value={config.styles.headerColor} onChange={e => setConfig({...config, styles: {...config.styles, headerColor: e.target.value}})} className="est-selector-color" />
                            </div>
                            <div className="est-control-estilo">
                                <span>Fondo Celdas</span>
                                <input type="color" value={config.styles.cellBg} onChange={e => setConfig({...config, styles: {...config.styles, cellBg: e.target.value}})} className="est-selector-color" />
                            </div>
                            <div className="est-control-estilo">
                                <span>Color Bordes</span>
                                <input type="color" value={config.styles.borderColor} onChange={e => setConfig({...config, styles: {...config.styles, borderColor: e.target.value}})} className="est-selector-color" />
                            </div>
                            <div className="est-control-estilo">
                                <span>Redondeo Tabla</span>
                                <input type="range" min="0" max="40" value={parseInt(config.styles.borderRadius)} onChange={e => setConfig({...config, styles: {...config.styles, borderRadius: `${e.target.value}px`}})} className="est-ancho-corto" />
                            </div>
                            <div className="est-control-estilo">
                                <span>Líneas Verticales</span>
                                <input type="checkbox" checked={config.styles.showVerticalLines} onChange={e => setConfig({...config, styles: {...config.styles, showVerticalLines: e.target.checked}})} />
                            </div>
                            <div className="est-control-estilo">
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
                        <table className="est-tabla">
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
                                                 className="est-cabecera-campo" style={{ color: config.styles.headerColor }}
                                             />
                                             <div className="col-actions est-acciones-columna">
                                                 <button onClick={() => addColumn(i)} className="est-boton-mini" title="Insertar columna a la derecha"><Plus size={10} /></button>
                                                 <button onClick={() => removeColumn(h)} className="est-boton-mini est-boton-mini--peligro" title="Eliminar esta columna"><Trash2 size={10} /></button>
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
                                            <div className="row-actions">
                                                <span className="est-rotulo-gris">{rowIndex + 1}</span>
                                                <div className="est-fila--menuda">
                                                    <button onClick={() => addRow(rowIndex)} className="est-boton-mini" title="Insertar fila debajo"><Plus size={10} /></button>
                                                    <button onClick={() => removeRow(rowIndex)} className="est-boton-mini est-boton-mini--peligro" title="Eliminar esta fila"><Trash2 size={10} /></button>
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
                    
                    <p className="est-ayuda-larga">
                        💡 **Tip:** Haz clic en los nombres de columna para renombrarlas. Usa los botones flotantes para insertar o eliminar elementos.
                    </p>
                </div>
                )}
            </div>

            {/* Barra de Navegación Inferior Móvil */}
            {isDeviceMobile && (
                <div className="est-barra-pie">
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

        </div>
    );
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



export default DataTableStudio;
