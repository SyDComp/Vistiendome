import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { sumarEnBloque } from '../../../../../../lib/api/endpoints';
import { cantidadValida } from '../movimientos';
import { problemaAlSumar } from './enBloque';

const TIPOS = {
    ingreso: { nombre: 'Ingreso', clase: 'receipt', icono: Plus, ayuda: 'Entra mercadería: suma la cantidad a cada una.' },
    merma: { nombre: 'Merma / Salida', clase: 'adjustment', icono: Minus, ayuda: 'Prendas dañadas, perdidas o que salen sin venta: resta la cantidad a cada una.' },
};

/** La misma cantidad a todas las elegidas: ingreso o merma. */
const SumarEnBloque = ({ filas, motivo, onError, onRegistrado, enviando, setEnviando, children }) => {
    const [tipo, setTipo] = useState('ingreso');
    const [cantidadTexto, setCantidadTexto] = useState('1');
    const cantidad = cantidadValida(cantidadTexto);
    const problema = problemaAlSumar({ filas, tipo, cantidad, motivo });

    const confirmar = async () => {
        if (problema || enviando) return;
        setEnviando(true);
        onError(null);
        try {
            onRegistrado(await sumarEnBloque({ sku_ids: filas.map(f => f.sku_id), tipo, cantidad, motivo: motivo.trim() }));
        } catch (e) {
            onError(e);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            <div>
                <span className="logistics-modal-label">Tipo de movimiento</span>
                <div className="logistics-type-btns" role="radiogroup">
                    {Object.entries(TIPOS).map(([clave, t]) => {
                        const Icono = t.icono;
                        return (
                            <button key={clave} type="button" role="radio" aria-checked={tipo === clave}
                                onClick={() => setTipo(clave)}
                                className={`logistics-type-btn ${t.clase}${tipo === clave ? ' active' : ''}`}>
                                <Icono size={18} />
                                <div className="logistics-type-btn-text">{t.nombre}</div>
                            </button>
                        );
                    })}
                </div>
                <p className="logistics-modal-ayuda">{TIPOS[tipo].ayuda}</p>
            </div>

            <div>
                <label className="logistics-modal-label" htmlFor="lote-cantidad">Cantidad para cada una</label>
                <input id="lote-cantidad" type="number" min="1" step="1" inputMode="numeric"
                    value={cantidadTexto} onChange={e => setCantidadTexto(e.target.value)}
                    className="logistics-modal-input" />
            </div>

            {children({ problema, confirmar, texto: `${TIPOS[tipo].nombre} a ${filas.length}` })}
        </>
    );
};

export default SumarEnBloque;
