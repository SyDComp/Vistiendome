import React, { useState, useEffect } from 'react';
import './DataTable.css';

/**
 * Reusable DataTable component with pagination and responsive horizontal scrolling.
 * 
 * @param {Object[]} columns - Array of column definitions: { header: 'Name', accessor: 'name', width: '100px', minWidth: '150px', cell: (row) => <JSX> }
 * @param {Object[]} data - Array of data objects
 * @param {number} pageSize - Number of rows per page
 * @param {string} emptyMessage - Message to show when data is empty
 */
export default function DataTable({
    columns = [],
    data = [],
    pageSize = 10,
    emptyMessage = "No hay datos disponibles.",
    page = null,
    onPageChange = null
}) {
    const [internalPage, setInternalPage] = useState(1);

    // Use external page if provided, otherwise internal state
    const currentPage = page !== null ? page : internalPage;
    const setCurrentPage = onPageChange !== null ? onPageChange : setInternalPage;

    // Reset to page 1 if data changes significantly
    useEffect(() => {
        if (page === null) {
            setInternalPage(1);
        }
    }, [data.length, page]);

    const totalPages = Math.ceil(data.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = data.slice(startIndex, startIndex + pageSize);

    return (
        <div className="datatable-wrapper">
            <div className="datatable-scroll-container">
                <table className="admin-table datatable">
                    <thead>
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} style={{ width: col.width, minWidth: col.minWidth }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex}>
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} style={col.style}>
                                        {col.cell ? col.cell(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls (Always visible to confirm table type visually) */}
            <div className="datatable-pagination">
                <div className="pagination-info">
                    {data.length > 0
                        ? `Mostrando ${startIndex + 1} - ${Math.min(startIndex + pageSize, data.length)} de ${data.length}`
                        : "No hay registros para mostrar"
                    }
                </div>

                {totalPages > 1 && (
                    <div className="pagination-controls">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="btn-page"
                        >
                            &laquo; Anterior
                        </button>

                        <div className="page-numbers">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                // Show first, last, current, and adjacent pages
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            className={`btn-page-number ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                ) {
                                    return <span key={page} className="page-dots">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="btn-page"
                        >
                            Siguiente &raquo;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
