import React from 'react';
import { FILTROS_EXISTENCIA } from './existencias';

/** Sin stock, con stock, o hasta N disponibles. */
const FiltroExistencias = ({ filtro, onFiltro, umbral, onUmbral }) => (
    <div className="lote-filtro" role="radiogroup" aria-label="Filtrar por lo disponible">
        <span className="lote-filtro-rotulo">Disponible</span>
        {Object.entries(FILTROS_EXISTENCIA).map(([clave, nombre]) => (
            <button
                key={clave}
                type="button"
                role="radio"
                aria-checked={filtro === clave}
                onClick={() => onFiltro(clave)}
                className={`lote-filtro-opcion${filtro === clave ? ' lote-filtro-opcion--activa' : ''}`}
            >
                {nombre}
            </button>
        ))}
        {filtro === 'hasta' && (
            <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                autoFocus
                value={umbral}
                onChange={e => onUmbral(e.target.value)}
                placeholder="N"
                aria-label="Disponible hasta"
                className="lote-filtro-numero"
            />
        )}
    </div>
);

export default FiltroExistencias;
