import React from 'react';
import { X } from 'lucide-react';

/** Los filtros puestos, como etiquetas que se quitan con su ×. */
const FiltrosPuestos = ({ facetas, filtros, onQuitar }) => {
    const puestas = (facetas || []).flatMap(f => f.opciones.filter(o => o.elegida).map(o => ({ faceta: f, opcion: o })));
    if (!puestas.length && !filtros.palabras.length) return null;
    return (
        <div className="cj-etiquetas" aria-label="Filtros puestos">
            {filtros.palabras.map(p => (
                <span key={`palabra-${p}`} className="cj-etiqueta"><span className="cj-etiqueta-nombre">texto</span>{p}</span>
            ))}
            {puestas.map(({ faceta, opcion }) => (
                <span key={`${faceta.clave}-${opcion.valor}`} className="cj-etiqueta">
                    <span className="cj-etiqueta-nombre">{faceta.nombre.toLowerCase()}</span>
                    {opcion.etiqueta}
                    <button type="button" aria-label={`Quitar ${opcion.etiqueta}`} onClick={() => onQuitar(faceta.clave, opcion.valor)}>
                        <X size={13} />
                    </button>
                </span>
            ))}
        </div>
    );
};

export default FiltrosPuestos;
