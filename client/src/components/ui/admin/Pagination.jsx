import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination — Control de paginación del servidor.
 *
 * Props:
 *  - currentPage: number
 *  - totalPages: number
 *  - totalItems: number
 *  - pageSize: number
 *  - onPageChange: (page) => void
 */
const Pagination = ({ currentPage = 1, totalPages = 1, totalItems = 0, pageSize = 20, onPageChange }) => {
    if (totalPages <= 1) return null;

    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    // Generar páginas a mostrar
    const getPages = () => {
        const pages = [];
        const delta = 2;
        for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid #f1f5f9',
            flex: '0 0 auto',
            flexWrap: 'wrap',
            gap: '12px'
        }}>
            {/* Info */}
            <span className="adm-pag-cuenta">
                Mostrando <strong className="adm-pag-actual">{from}–{to}</strong> de <strong className="adm-pag-actual">{totalItems}</strong> registros
            </span>

            {/* Controles */}
            <div className="adm-pag-fila">
                <PageBtn
                    onClick={() => onPageChange?.(currentPage - 1)}
                    disabled={currentPage === 1}
                    icon={<ChevronLeft size={15} />}
                />

                {currentPage > 3 && (
                    <>
                        <PageBtn label="1" onClick={() => onPageChange?.(1)} />
                        <span className="adm-pag-salto">…</span>
                    </>
                )}

                {getPages().map(p => (
                    <PageBtn
                        key={p}
                        label={p}
                        active={p === currentPage}
                        onClick={() => onPageChange?.(p)}
                    />
                ))}

                {currentPage < totalPages - 2 && (
                    <>
                        <span className="adm-pag-salto">…</span>
                        <PageBtn label={totalPages} onClick={() => onPageChange?.(totalPages)} />
                    </>
                )}

                <PageBtn
                    onClick={() => onPageChange?.(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    icon={<ChevronRight size={15} />}
                />
            </div>
        </div>
    );
};

const PageBtn = ({ label, icon, active, disabled, onClick }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: `1px solid ${active ? '#8f0653' : '#e2e8f0'}`,
            backgroundColor: active ? '#8f0653' : (disabled ? '#f8fafc' : '#fff'),
            color: active ? '#fff' : (disabled ? '#cbd5e1' : '#475569'),
            fontSize: '13px',
            fontWeight: active ? '700' : '500',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => { if (!active && !disabled) { e.currentTarget.style.borderColor = '#8f0653'; e.currentTarget.style.color = '#8f0653'; } }}
        onMouseLeave={e => { if (!active && !disabled) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; } }}
    >
        {icon || label}
    </button>
);

export default Pagination;
