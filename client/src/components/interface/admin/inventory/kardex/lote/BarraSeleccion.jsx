import React from 'react';
import { ArrowLeftRight, X } from 'lucide-react';

/** La barra fija de abajo cuando hay variantes elegidas. */
const BarraSeleccion = ({ cuantas, onMover, onQuitar }) => {
    if (!cuantas) return null;
    return (
        <div className="lote-barra" role="region" aria-label="Variantes elegidas">
            <span className="lote-barra-cuantas">{cuantas} elegida{cuantas !== 1 ? 's' : ''}</span>
            <button type="button" onClick={onMover} className="lote-barra-mover">
                <ArrowLeftRight size={16} /> Registrar movimiento
            </button>
            <button type="button" onClick={onQuitar} className="lote-barra-quitar">
                <X size={16} /> Quitar selección
            </button>
        </div>
    );
};

export default BarraSeleccion;
