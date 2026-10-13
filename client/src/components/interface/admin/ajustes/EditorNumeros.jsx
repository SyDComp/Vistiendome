import React, { useEffect, useState } from 'react';
import { mensajeDeError } from '../../../../utils/errorServidor';

/**
 * Unos pocos números que van juntos (los plazos en días hábiles, los
 * porcentajes de abono). `campos`: [{clave, etiqueta}]; `unidad`: lo que se lee
 * al lado de cada número. El servidor valida y dice qué no sirve.
 */
const EditorNumeros = ({ valores: guardados, campos, unidad, max, textoBoton, onGuardar }) => {
    const [valores, setValores] = useState(() => ({ ...guardados }));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { setValores({ ...guardados }); }, [guardados]);

    const cambiado = campos.some(({ clave }) => String(valores[clave]) !== String(guardados[clave]));

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar(Object.fromEntries(campos.map(({ clave }) => [clave, valores[clave]])));
        } catch (err) {
            setError(mensajeDeError(err?.message, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="aj-plazos">
            {campos.map(({ clave, etiqueta }) => (
                <label key={clave} className="aj-plazo">
                    <span>{etiqueta}</span>
                    <span className="aj-plazo-campo">
                        <input type="number" min="0" max={max} step="1" className="aj-campo" value={valores[clave] ?? ''}
                            onChange={e => setValores(v => ({ ...v, [clave]: e.target.value }))} disabled={guardando} />
                        {unidad}
                    </span>
                </label>
            ))}
            {error && <p className="aj-error" role="alert">{error}</p>}
            <div>
                <button type="button" className="aj-boton aj-boton--principal" onClick={guardar} disabled={guardando || !cambiado}>
                    {guardando ? 'Guardando…' : textoBoton}
                </button>
            </div>
        </div>
    );
};

export default EditorNumeros;
