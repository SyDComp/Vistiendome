import React from 'react';

/**
 * Elegir a qué productos aplica una regla de precio (promoción o tramo por
 * cantidad). Ninguno elegido = todo el catálogo (utils/alcanceProductos.js).
 *
 * Los ids se guardan como texto, igual que las promociones de siempre.
 */
const SelectorProductos = ({ disponibles, elegidos, onChange }) => {
    const actuales = (elegidos || []).map(String);
    const alternar = (id) => onChange(
        actuales.includes(String(id))
            ? actuales.filter(x => x !== String(id))
            : [...actuales, String(id)]
    );

    return (
        <div className="input-group adm-separacion--arriba">
            <label className="adm-rotulo">
                Productos ({actuales.length === 0 ? 'todo el catálogo' : `${actuales.length} elegidos`})
            </label>
            <div className="adm-etiquetas">
                {(disponibles || []).map(prod => {
                    const elegido = actuales.includes(String(prod.id));
                    return (
                        <button key={prod.id} type="button" onClick={() => alternar(prod.id)}
                            aria-pressed={elegido}
                            className={`adm-etiqueta-filtro ${elegido ? 'adm-estado-marcado' : 'adm-estado-neutro'}`}>
                            {prod.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SelectorProductos;
