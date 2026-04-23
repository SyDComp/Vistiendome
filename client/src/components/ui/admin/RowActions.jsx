import React from 'react';
import { Pencil, Trash2, Eye } from 'lucide-react';

/**
 * RowActions — Botones de acción por fila en una tabla.
 *
 * Props:
 *  - onEdit: () => void
 *  - onDelete: () => void
 *  - onView: () => void
 *  - editLabel: string
 *  - deleteLabel: string
 *  - viewLabel: string
 *  - extra: ReactNode — Acciones adicionales custom
 */
const RowActions = ({ onEdit, onDelete, onView, editLabel = 'Editar', deleteLabel = 'Eliminar', viewLabel = 'Ver Detalle', extra }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            {extra}
            {onView && (
                <ActionButton
                    onClick={onView}
                    label={viewLabel}
                    icon={<Eye size={14} />}
                    color="#64748b"
                    hoverBg="#f1f5f9"
                />
            )}
            {onEdit && (
                <ActionButton
                    onClick={onEdit}
                    label={editLabel}
                    icon={<Pencil size={14} />}
                    color="#3b82f6"
                    hoverBg="#eff6ff"
                />
            )}
            {onDelete && (
                <ActionButton
                    onClick={onDelete}
                    label={deleteLabel}
                    icon={<Trash2 size={14} />}
                    color="#ef4444"
                    hoverBg="#fef2f2"
                />
            )}
        </div>
    );
};

const ActionButton = ({ onClick, label, icon, color, hoverBg }) => (
    <button
        onClick={onClick}
        title={label}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            backgroundColor: 'transparent',
            border: `1px solid transparent`,
            borderRadius: '8px',
            cursor: 'pointer',
            color: color,
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = hoverBg;
            e.currentTarget.style.borderColor = color + '33';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
        }}
    >
        {icon}
        <span style={{ display: 'none' }}>{label}</span>
    </button>
);

export { ActionButton };
export default RowActions;
