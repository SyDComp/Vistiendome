import React, { useEffect, useState } from 'react';
import { mensajeDeError } from '../../../../utils/errorServidor';

const CAMPOS = [
    { clave: 'bodega', etiqueta: 'Si todo sale de bodega' },
    { clave: 'taller', etiqueta: 'Si algo lo hace el taller' },
];

/**
 * Los dos plazos habituales, en días hábiles (lunes a viernes). Con ellos se
 * propone la fecha comprometida al confirmar un pedido.
 */
const EditorPlazos = ({ plazos, onGuardar }) => {
    const [valores, setValores] = useState(() => ({ ...plazos }));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { setValores({ ...plazos }); }, [plazos]);

    const cambiado = CAMPOS.some(({ clave }) => String(valores[clave]) !== String(plazos[clave]));

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar({ bodega: valores.bodega, taller: valores.taller });
        } catch (err) {
            setError(mensajeDeError(err?.message, 'No se pudieron guardar los plazos'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="aj-plazos">
            {CAMPOS.map(({ clave, etiqueta }) => (
                <label key={clave} className="aj-plazo">
                    <span>{etiqueta}</span>
                    <span className="aj-plazo-campo">
                        <input type="number" min="0" max="365" step="1" className="aj-campo" value={valores[clave] ?? ''}
                            onChange={e => setValores(v => ({ ...v, [clave]: e.target.value }))} disabled={guardando} />
                        días hábiles
                    </span>
                </label>
            ))}
            {error && <p className="aj-error" role="alert">{error}</p>}
            <div>
                <button type="button" className="aj-boton aj-boton--principal" onClick={guardar} disabled={guardando || !cambiado}>
                    {guardando ? 'Guardando…' : 'Guardar plazos'}
                </button>
            </div>
        </div>
    );
};

export default EditorPlazos;
