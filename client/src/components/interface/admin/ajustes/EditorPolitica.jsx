import React, { useEffect, useState } from 'react';
import { mensajeDeError } from '../../../../utils/errorServidor';
import { UNIDADES, frasesPolitica } from '../../../../utils/politicaCambios';

const igual = (a, b) => String(a.plazo) === String(b.plazo) && a.unidad === b.unidad
    && Boolean(a.personalizadas_sin_cambio) === Boolean(b.personalizadas_sin_cambio);

/**
 * La política de cambios: el plazo, su unidad y si lo hecho a medida tiene
 * cambio. Debajo se lee tal como la verá la clienta. El servidor valida.
 */
const EditorPolitica = ({ politica: guardada, onGuardar }) => {
    const [politica, setPolitica] = useState(() => ({ ...guardada }));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { setPolitica({ ...guardada }); }, [guardada]);

    const cambiar = (cambio) => setPolitica(p => ({ ...p, ...cambio }));
    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar(politica);
        } catch (err) {
            setError(mensajeDeError(err?.message, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    const valida = politica.plazo !== '' && Number(politica.plazo) >= 0;
    return (
        <div className="aj-plazos">
            <label className="aj-plazo">
                <span>Plazo para pedir un cambio</span>
                <span className="aj-plazo-campo">
                    <input type="number" min="0" max="365" step="1" className="aj-campo" value={politica.plazo ?? ''}
                        onChange={e => cambiar({ plazo: e.target.value })} disabled={guardando} />
                    <select className="aj-campo aj-unidad" value={politica.unidad} aria-label="Unidad del plazo"
                        onChange={e => cambiar({ unidad: e.target.value })} disabled={guardando}>
                        {UNIDADES.map(u => <option key={u.valor} value={u.valor}>{u.plural}</option>)}
                    </select>
                </span>
            </label>
            <label className="aj-interruptor">
                <input type="checkbox" checked={Boolean(politica.personalizadas_sin_cambio)} disabled={guardando}
                    onChange={e => cambiar({ personalizadas_sin_cambio: e.target.checked })} />
                <span>
                    <strong>Lo hecho a medida no tiene cambio</strong>
                    <span className={`aj-estado ${politica.personalizadas_sin_cambio ? 'aj-estado--activa' : ''}`}>
                        {politica.personalizadas_sin_cambio ? 'Regla activa' : 'Regla desactivada'}
                    </span>
                </span>
            </label>
            {valida && (
                <div className="aj-vista">
                    <span className="aj-vista-titulo">Así se lee en el sitio y en el comprobante</span>
                    {frasesPolitica(politica).map(f => <p key={f}>{f}</p>)}
                </div>
            )}
            {error && <p className="aj-error" role="alert">{error}</p>}
            <div>
                <button type="button" className="aj-boton aj-boton--principal" onClick={guardar}
                    disabled={guardando || !valida || igual(politica, guardada)}>
                    {guardando ? 'Guardando…' : 'Guardar política'}
                </button>
            </div>
        </div>
    );
};

export default EditorPolitica;
