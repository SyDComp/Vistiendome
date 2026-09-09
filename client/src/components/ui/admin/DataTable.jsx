import React from 'react';
import './DataTable.css';

/**
 * DataTable — Componente de tabla genérica y reutilizable.
 * Optimizado para ser responsivo con scroll horizontal controlado.
 */
const DataTable = ({ columns = [], data = [], rowActions, isLoading, context = {}, emptyMessage = 'No hay datos.' }) => {

    return (
        <div className="adm-tabla-caja">
            <div className="adm-tabla-scroll">
                {isLoading ? (
                    <div className="adm-tabla-estado">
                        <div className="adm-rueda" />
                        <span className="adm-celda-apagada">Cargando datos...</span>
                    </div>
                ) : data.length === 0 ? (
                    <div className="adm-tabla-estado adm-tabla-estado--vacio">
                        <span className="adm-tabla-estado-icono">📭</span>
                        <span className="adm-tabla-estado-texto">{emptyMessage}</span>
                    </div>
                ) : (
                    <table className="adm-tabla">
                        <thead className="adm-tabla-fila-cabecera">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} style={{
                                        width: col.width || 'auto',
                                        textAlign: col.align || 'left'
                                    }}>
                                        {col.label}
                                    </th>
                                ))}
                                {rowActions && (
                                    <th className="adm-tabla-cabecera-acciones">
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr
                                    key={row.id || i}
                                    className="table-row-hover"
                                >
                                    {columns.map(col => (
                                        <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                                            {col.render ? col.render(row[col.key], row, context) : row[col.key]}
                                        </td>
                                    ))}
                                    {rowActions && (
                                        <td className="adm-tabla-acciones actions-cell">
                                            {rowActions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* El aviso de desplazamiento; la hoja decide donde se ve. */}
            {!isLoading && data.length > 0 && (
                <div className="adm-tabla-pie">
                    ⬅️ Desliza para ver más acciones ➡️
                </div>
            )}

        </div>
    );
};

export default DataTable;
