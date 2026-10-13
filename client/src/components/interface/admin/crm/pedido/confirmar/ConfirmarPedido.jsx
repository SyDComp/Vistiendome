import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, X } from 'lucide-react';
import { useNotification } from '../../../../../../context/NotificationContext';
import { confirmarPedido, quitarPrenda } from '../../../../../../lib/api/endpoints';
import usePropuestaConfirmacion from '../../../../../../hooks/usePropuestaConfirmacion';
import { mensajeDeError } from '../../../../../../utils/errorServidor';
import { esperandoVistas, pideNota, sePuedeConfirmar } from '../../../../../../utils/caminoPrenda';
import { hoyIso } from '../../../../../../utils/fechaComprometida';
import FechaPropuesta from './FechaPropuesta';
import PrendaPropuesta from './PrendaPropuesta';
import '../pedido.css';
import './confirmar.css';

/**
 * Confirmar un pedido: la clienta aceptó, y se decide de dónde sale cada prenda.
 *
 * El sistema propone; la persona puede cambiar cualquier camino o quitar una
 * prenda. Si algo se confirma distinto de lo habitual, pide una nota.
 *
 * Si la bodega cambió mientras se decidía (otro pedido se llevó la última
 * unidad), el servidor no confirma: manda la propuesta nueva, que se muestra
 * para volver a decidir.
 */
const ConfirmarPedido = ({ pedido, onConfirmado, onCerrar }) => {
    const { toast, confirm } = useNotification();
    const [caminos, setCaminos] = useState({});
    const [nota, setNota] = useState('');
    // null: vale la propuesta (que cambia si una prenda pasa de bodega al
    // taller). Si la persona elige otra, queda la suya.
    const [fechaElegida, setFechaElegida] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const { propuesta, cargando, error, recargar, reemplazar } = usePropuestaConfirmacion(pedido.id, caminos);

    const prendas = propuesta?.prendas || [];
    const fecha = fechaElegida ?? propuesta?.fecha_propuesta ?? null;
    const fechaValida = Boolean(fecha) && fecha >= hoyIso();
    const problemas = propuesta?.problemas || [];
    const ocupado = cargando || enviando;

    const elegir = (prendaId, camino) => setCaminos(prev => ({ ...prev, [prendaId]: camino }));

    const quitar = async (prenda) => {
        if (!await confirm(`¿Quitar del pedido ${prenda.cantidad}× ${prenda.nombre}? Queda anotado en la historia.`)) return;
        setEnviando(true);
        try {
            await quitarPrenda(pedido.id, prenda.item_id);
            toast.success('Prenda quitada del pedido');
            setCaminos(prev => {
                const resto = { ...prev };
                delete resto[prenda.item_id];
                return resto;
            });
            recargar();
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo quitar la prenda'));
        } finally {
            setEnviando(false);
        }
    };

    const confirmar = async () => {
        setEnviando(true);
        try {
            const actualizado = await confirmarPedido(pedido.id, {
                caminos: Object.fromEntries(prendas.filter(p => p.camino).map(p => [p.item_id, p.camino])),
                nota: nota.trim() || null,
                esperando_vistas: esperandoVistas(prendas),
                fecha_comprometida: fecha,
            });
            toast.success(`Pedido N° ${pedido.numero} confirmado`);
            onConfirmado(actualizado);
        } catch (err) {
            if (err?.status === 409 && err.data?.propuesta) {
                reemplazar(err.data.propuesta);
                toast.error('La bodega cambió mientras confirmabas: revisa la propuesta de nuevo.');
            } else {
                toast.error(mensajeDeError(err?.message, 'No se pudo confirmar'));
            }
        } finally {
            setEnviando(false);
        }
    };

    // En un portal: dentro del panel lateral, que se anima con transform, una
    // capa "fixed" quedaría atrapada en el panel en vez de cubrir la pantalla.
    return createPortal(
        <div className="cfp-capa" role="dialog" aria-modal="true" aria-labelledby="cfp-titulo">
            <div className="cfp-tarjeta">
                <div className="cfp-cabecera">
                    <div>
                        <h3 id="cfp-titulo" className="cfp-titulo">Confirmar pedido N° {pedido.numero}</h3>
                        <p className="cfp-subtitulo">
                            La clienta aceptó. Decide de dónde sale cada prenda: de la bodega se aparta
                            lo que hay; el taller la confecciona.
                        </p>
                    </div>
                    <button type="button" className="cfp-cerrar" onClick={onCerrar} aria-label="Cerrar" disabled={enviando}>
                        <X size={18} />
                    </button>
                </div>

                <div className="cfp-cuerpo">
                    {error && !propuesta && (
                        <div className="sp-aviso sp-aviso--error" role="alert">
                            <span>{error}</span>
                            <button type="button" className="sp-boton" onClick={recargar}>Reintentar</button>
                        </div>
                    )}
                    {!propuesta && cargando && <p className="sp-aviso" aria-busy="true">Calculando la propuesta…</p>}

                    {propuesta && (
                        <>
                            <ul className="cfp-prendas" aria-busy={cargando}>
                                {prendas.map(p => (
                                    <PrendaPropuesta key={p.item_id} prenda={p} onCamino={elegir}
                                        onQuitar={quitar} ocupado={ocupado} />
                                ))}
                            </ul>

                            {problemas.length > 0 && (
                                <ul className="cfp-problemas" role="alert">
                                    {problemas.map(p => <li key={p}>{p}</li>)}
                                </ul>
                            )}

                            <FechaPropuesta fecha={fecha} propuesta={propuesta} fechaEvento={pedido.fecha_evento}
                                onCambiar={setFechaElegida} disabled={enviando} />

                            {pideNota(prendas) && (
                                <div className="cfp-nota">
                                    <label htmlFor="cfp-nota">
                                        Nota (obligatoria: hay prendas que se confirman distinto de lo habitual)
                                    </label>
                                    <textarea id="cfp-nota" className="sp-select" rows={2} maxLength={500}
                                        value={nota} onChange={e => setNota(e.target.value)}
                                        placeholder="Ej: llega reposición el jueves" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="cfp-pie">
                    <button type="button" className="sp-boton" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button type="button" className="sp-boton sp-boton--principal" onClick={confirmar}
                        disabled={ocupado || !propuesta || !fechaValida || !sePuedeConfirmar(propuesta, nota)}>
                        <CheckCircle size={16} /> {enviando ? 'Confirmando…' : 'Confirmar pedido'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmarPedido;
