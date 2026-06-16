import React, { useState, useEffect } from 'react';

/**
 * DataTable — Componente de tabla genérica y reutilizable.
 * Optimizado para ser responsivo con scroll horizontal controlado.
 */
const DataTable = ({ columns = [], data = [], rowActions, isLoading, context = {}, emptyMessage = 'No hay datos.' }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 24px rgba(30,27,75,0.05)'
        }}>
            {/* Zona de scroll independiente */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'auto', // Permite scroll horizontal en móviles
                position: 'relative' 
            }}>
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#8f0653', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Cargando datos...</span>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '36px' }}>📭</span>
                        <span style={{ fontSize: '14px' }}>{emptyMessage}</span>
                    </div>
                ) : (
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        textAlign: 'left',
                        minWidth: isMobile ? '700px' : 'auto' // Forzar ancho mínimo en móvil para evitar apretujamiento
                    }}>
                        <thead style={{
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} style={{
                                        padding: isMobile ? '12px 14px' : '13px 18px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#94a3b8',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        width: col.width || 'auto',
                                        textAlign: col.align || 'left'
                                    }}>
                                        {col.label}
                                    </th>
                                ))}
                                {rowActions && (
                                    <th style={{ 
                                        padding: isMobile ? '12px 14px' : '13px 18px', 
                                        textAlign: 'right', 
                                        fontSize: '11px', 
                                        fontWeight: '700', 
                                        color: '#94a3b8', 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.8px',
                                        position: 'sticky',
                                        right: 0,
                                        backgroundColor: '#f8fafc',
                                        boxShadow: '-4px 0 8px rgba(0,0,0,0.02)'
                                    }}>
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr
                                    key={row.id || i}
                                    style={{
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'background 0.15s ease',
                                        cursor: 'default'
                                    }}
                                    className="table-row-hover"
                                >
                                    {columns.map(col => (
                                        <td key={col.key} style={{
                                            padding: isMobile ? '12px 14px' : '14px 18px',
                                            fontSize: '13.5px',
                                            color: '#1e293b',
                                            textAlign: col.align || 'left',
                                            verticalAlign: 'middle'
                                        }}>
                                            {col.render ? col.render(row[col.key], row, context) : row[col.key]}
                                        </td>
                                    ))}
                                    {rowActions && (
                                        <td style={{ 
                                            padding: isMobile ? '12px 14px' : '14px 18px', 
                                            textAlign: 'right', 
                                            verticalAlign: 'middle',
                                            position: 'sticky',
                                            right: 0,
                                            backgroundColor: '#fff',
                                            boxShadow: '-4px 0 8px rgba(0,0,0,0.02)'
                                        }}
                                            className="actions-cell"
                                        >
                                            {rowActions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* Indicador de scroll para móvil */}
            {isMobile && !isLoading && data.length > 0 && (
                <div style={{ 
                    padding: '8px', 
                    textAlign: 'center', 
                    fontSize: '10px', 
                    color: '#94a3b8', 
                    borderTop: '1px solid #f1f5f9',
                    fontStyle: 'italic',
                    backgroundColor: '#fff' 
                }}>
                    ⬅️ Desliza para ver más acciones ➡️
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .table-row-hover:hover {
                    background-color: #fafafa !important;
                }
                .table-row-hover:hover .actions-cell {
                    background-color: #fafafa !important;
                }
            `}</style>
        </div>
    );
};

export default DataTable;
