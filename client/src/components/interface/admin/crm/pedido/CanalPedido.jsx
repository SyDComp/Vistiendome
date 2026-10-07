import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { corregirCanalPedido } from '../../../../../lib/api/endpoints';
import SelectorCanal from './SelectorCanal';

/**
 * "¿Cómo llegó?" de un pedido, con la opción de completarlo o corregirlo.
 *
 * El valor llega ya leído de la historia (`canal`): no se guarda una copia
 * acá, que podría quedar vieja. Después de corregir, `onCambio` recarga la
 * historia y el valor nuevo vuelve por ahí.
 *
 * Solo los pedidos cargados en el panel se pueden corregir: los de la web
 * llegaron por la web, y eso no es una opinión.
 */
const CanalPedido = ({ cotizacion, canal, onCambio }) => {
    const { toast } = useNotification();
    const [editando, setEditando] = useState(false);
    const [eleccion, setEleccion] = useState('');
    const [guardando, setGuardando] = useState(false);

    if (cotizacion.origen !== 'MANUAL') {
        return <p className="sp-canal">Sitio web</p>;
    }

    const guardar = async () => {
        setGuardando(true);
        try {
            await corregirCanalPedido(cotizacion.id, eleccion);
            setEditando(false);
            toast.success('Quedó anotado cómo llegó el pedido');
            onCambio?.();
        } catch (err) {
            toast.error(err?.message || 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    if (editando) {
        return (
            <div className="sp-canal-edicion">
                <label htmlFor={`canal-${cotizacion.id}`} className="sp-oculto">¿Cómo llegó?</label>
                <SelectorCanal id={`canal-${cotizacion.id}`} value={eleccion} onChange={setEleccion} disabled={guardando} />
                <div className="sp-acciones">
                    <button type="button" className="sp-boton" onClick={() => setEditando(false)} disabled={guardando}>
                        Cancelar
                    </button>
                    <button type="button" className="sp-boton sp-boton--principal" onClick={guardar}
                        disabled={guardando || !eleccion || eleccion === canal}>
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="sp-canal-fila">
            <p className={canal ? 'sp-canal' : 'sp-canal sp-canal--sin-dato'}>
                {canal || 'Sin dato: este pedido se cargó antes de que se preguntara'}
            </p>
            <button type="button" className="sp-boton" onClick={() => { setEleccion(canal || ''); setEditando(true); }}>
                {canal ? 'Corregir' : 'Indicar'}
            </button>
        </div>
    );
};

export default CanalPedido;
