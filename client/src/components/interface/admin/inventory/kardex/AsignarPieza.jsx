import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useNotification } from '../../../../../context/NotificationContext';
import { asignarPiezaUnica, listarCotizaciones } from '../../../../../lib/api/endpoints';
import { esValido, paraServidor, valorDesde } from '../../../../../utils/precioPrenda';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import SelectorPrecio from '../../crm/pedido/SelectorPrecio';
import '../../crm/pedido/confirmar/confirmar.css';

const SE_CONVERSAN = ['NUEVA', 'EN_CONVERSACION'];

/**
 * Asignar una pieza única a un pedido que se está conversando: entra como una
 * prenda más, apartada. El precio se puede poner acá o cotizarlo después.
 */
const AsignarPieza = ({ pieza, onAsignada, onCerrar }) => {
    const { toast } = useNotification();
    const [pedidos, setPedidos] = useState(null);
    const [pedidoId, setPedidoId] = useState('');
    const [precio, setPrecio] = useState(() => valorDesde(null));
    const [enviando, setEnviando] = useState(false);

    // Una vez al abrir. `toast` no va en las dependencias: el contexto lo
    // recrea en cada aviso, y un error volvería a pedir la lista en bucle.
    useEffect(() => {
        listarCotizaciones(SE_CONVERSAN)
            .then(lista => setPedidos(lista || []))
            .catch(err => { toast.error(mensajeDeError(err?.message, 'No se pudieron cargar los pedidos')); setPedidos([]); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const asignar = async () => {
        setEnviando(true);
        try {
            const { precio: monto, sin_costo } = paraServidor(precio);
            const pedido = await asignarPiezaUnica(pieza.id, { cotizacion_id: pedidoId, precio: monto, sin_costo });
            toast.success(`Pieza única N° ${pieza.numero} agregada al pedido N° ${pedido.numero}`);
            onAsignada(pedido);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo asignar la pieza'));
        } finally {
            setEnviando(false);
        }
    };

    return createPortal(
        <div className="cfp-capa" role="dialog" aria-modal="true" aria-labelledby="asp-titulo">
            <div className="cfp-tarjeta">
                <div className="cfp-cabecera">
                    <div>
                        <h3 id="asp-titulo" className="cfp-titulo">Asignar la pieza única N° {pieza.numero}</h3>
                        <p className="cfp-subtitulo">
                            {pieza.nombre}. Entra al pedido como una prenda más, apartada para esa clienta.
                        </p>
                    </div>
                    <button type="button" className="cfp-cerrar" onClick={onCerrar} aria-label="Cerrar" disabled={enviando}>
                        <X size={18} />
                    </button>
                </div>
                <div className="cfp-cuerpo">
                    <div className="cfp-nota">
                        <label htmlFor="asp-pedido">Pedido (nuevo o en conversación)</label>
                        <select id="asp-pedido" className="sp-select" value={pedidoId} disabled={!pedidos || enviando}
                            onChange={e => setPedidoId(e.target.value)}>
                            <option value="" disabled>{pedidos ? '— Elige el pedido —' : 'Cargando…'}</option>
                            {(pedidos || []).map(p => (
                                <option key={p.id} value={p.id}>
                                    N° {p.numero} · {p.nombre_contacto || p.cliente?.nombres || 'Sin nombre'}
                                </option>
                            ))}
                        </select>
                        {pedidos && !pedidos.length && (
                            <p className="sp-aviso">No hay pedidos nuevos ni en conversación. Créalo primero en Cotizaciones.</p>
                        )}
                    </div>
                    <div className="cfp-nota">
                        <span>Precio</span>
                        <SelectorPrecio id="asp-precio" valor={precio} onChange={setPrecio} disabled={enviando} />
                    </div>
                </div>
                <div className="cfp-pie">
                    <button type="button" className="sp-boton" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button type="button" className="sp-boton sp-boton--principal" onClick={asignar}
                        disabled={enviando || !pedidoId || !esValido(precio)}>
                        {enviando ? 'Asignando…' : 'Agregar al pedido'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AsignarPieza;
