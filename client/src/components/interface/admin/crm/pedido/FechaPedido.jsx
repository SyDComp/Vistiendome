import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { cambiarFechaPedido } from '../../../../../lib/api/endpoints';
import { estadoFecha, hoyIso } from '../../../../../utils/fechaComprometida';
import { mensajeDeError } from '../../../../../utils/errorServidor';

/**
 * Para cuándo se le prometió el pedido a la clienta, y corregirlo mientras
 * está confirmado. El cambio queda en la historia, con su motivo si se dice.
 */
const FechaPedido = ({ pedido, onCambio }) => {
    const { toast } = useNotification();
    const [editando, setEditando] = useState(false);
    const [fecha, setFecha] = useState('');
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    const estado = estadoFecha(pedido);
    if (!estado) return null;

    const abrir = () => { setFecha(pedido.fecha_comprometida || ''); setNota(''); setEditando(true); };

    const guardar = async () => {
        setEnviando(true);
        try {
            onCambio(await cambiarFechaPedido(pedido.id, fecha, nota.trim() || null));
            toast.success('Fecha comprometida actualizada');
            setEditando(false);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo cambiar la fecha'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="sp-fecha">
            <p className="sp-fecha-linea">
                Para el <span className={`sp-fecha-valor sp-fecha-valor--${estado.tono}`}>{estado.texto}</span>
                {estado.detalle && <span className={`sp-fecha-detalle sp-fecha-valor--${estado.tono}`}>{estado.detalle}</span>}
            </p>
            {pedido.estado === 'CONFIRMADA' && !editando && (
                <button type="button" className="sp-boton" onClick={abrir}>
                    {pedido.fecha_comprometida ? 'Cambiar fecha' : 'Poner fecha'}
                </button>
            )}
            {editando && (
                <div className="sp-canal-edicion">
                    <label className="sp-oculto" htmlFor={`fecha-${pedido.id}`}>Fecha comprometida</label>
                    <input id={`fecha-${pedido.id}`} type="date" className="sp-select" value={fecha} min={hoyIso()}
                        onChange={e => setFecha(e.target.value)} disabled={enviando} />
                    <label className="sp-oculto" htmlFor={`fecha-nota-${pedido.id}`}>Motivo del cambio</label>
                    <input id={`fecha-nota-${pedido.id}`} type="text" className="sp-select" maxLength={300}
                        placeholder="Motivo (opcional): la tela llegó tarde…" value={nota}
                        onChange={e => setNota(e.target.value)} disabled={enviando} />
                    <div className="sp-acciones">
                        <button type="button" className="sp-boton" onClick={() => setEditando(false)} disabled={enviando}>Cancelar</button>
                        <button type="button" className="sp-boton sp-boton--principal" onClick={guardar}
                            disabled={enviando || !fecha || fecha < hoyIso()}>
                            {enviando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FechaPedido;
