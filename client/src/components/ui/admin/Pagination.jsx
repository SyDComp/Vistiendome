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
        <div className="adm-pag-barra">
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
        className={`adm-pagina ${
            active ? 'adm-estado-activo' : disabled ? 'adm-estado-apagado' : 'adm-estado-neutro'
        }`}
    >
        {icon || label}
    </button>
);

export default Pagination;
