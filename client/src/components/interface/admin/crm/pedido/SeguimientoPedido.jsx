import React, { useState } from 'react';
import { History, Megaphone, Package, Truck, Wallet } from 'lucide-react';
import useHistoriaPedido from '../../../../../hooks/useHistoriaPedido';
import usePedido from '../../../../../hooks/usePedido';
import { canalSegunHistoria } from '../../../../../utils/historiaPedido';
import { obtenerPedido } from '../../../../../lib/api/endpoints';
import CanalPedido from './CanalPedido';
import FechaPedido from './FechaPedido';
import ConfirmarPedido from './confirmar/ConfirmarPedido';
import HistoriaPedido from './HistoriaPedido';
import PagosPedido from './pagos/PagosPedido';
import PrendasPedido from './PrendasPedido';
import SalidaPedido from './SalidaPedido';
import './pedido.css';

// El contenedor de sección del panel parte invisible (opacity: 0) y aparece
// con esta animación, igual que las demás secciones del detalle. Sin ella, la
// sección ocupa su lugar pero no se ve.
const Seccion = ({ icono, titulo, children }) => (
    <div className="detail-drawer-section-wrapper" style={{ animation: 'slideUp 0.4s ease forwards' }}>
        <div className="detail-drawer-section-header">
            <div className="detail-drawer-flex-row-12">
                <div className="detail-drawer-section-icon">{icono}</div>
                <h3 className="detail-drawer-section-title">{titulo}</h3>
            </div>
        </div>
        <div className="detail-drawer-summary-card">{children}</div>
    </div>
);

/**
 * Las prendas con su precio, cómo llegó el pedido y qué le ha pasado.
 *
 * `abierto`: el panel lateral no se desmonta al cerrarse, así que el pedido y
 * su historia se vuelven a pedir cada vez que se abre.
 *
 * Cotizar o corregir "¿Cómo llegó?" recarga lo que corresponde: el cambio
 * mismo queda anotado, y se tiene que ver en la historia.
 *
 * `onCambio(pedido)`: al confirmar o despachar, para que la lista que abrió
 * el panel no siga mostrando el estado anterior.
 */
const SeguimientoPedido = ({ cotizacion, abierto = true, onCambio }) => {
    const historia = useHistoriaPedido(cotizacion.id, abierto);
    const fresco = usePedido(cotizacion.id, abierto);
    const canal = canalSegunHistoria(historia.eventos, cotizacion.canal);

    const [confirmando, setConfirmando] = useState(false);

    const alCotizar = () => { fresco.recargar(); historia.recargar(); };
    // Cerrar sin confirmar también recarga: se pudo haber quitado una prenda.
    const alCerrarConfirmacion = () => { setConfirmando(false); alCotizar(); };
    const alConfirmar = (actualizado) => { alCerrarConfirmacion(); onCambio?.(actualizado); };
    const alSalir = (actualizado) => { alCotizar(); onCambio?.(actualizado); };
    // Un pago no devuelve el pedido: se lo pide, para que la lista se entere.
    const alPagar = async () => {
        alCotizar();
        try { onCambio?.(await obtenerPedido(cotizacion.id)); } catch { /* la lista queda como estaba */ }
    };
    const sale = ['CONFIRMADA', 'DESPACHADA'].includes(fresco.pedido?.estado);

    return (
        <>
            <Seccion icono={<Package size={18} />} titulo="Prendas y precio">
                <PrendasPedido
                    pedido={fresco.pedido}
                    cargando={fresco.cargando}
                    error={fresco.error}
                    onReintentar={fresco.recargar}
                    onCotizada={alCotizar}
                    onConfirmar={() => setConfirmando(true)}
                    onCambio={alSalir}
                />
            </Seccion>
            {fresco.pedido && (
                <Seccion icono={<Wallet size={18} />} titulo="Pagos">
                    <PagosPedido pedido={fresco.pedido} abierto={abierto} onCambio={alPagar} />
                </Seccion>
            )}
            {sale && (
                <Seccion icono={<Truck size={18} />} titulo={fresco.pedido.modo_entrega === 'RETIRO' ? 'Entrega' : 'Despacho'}>
                    <FechaPedido pedido={fresco.pedido} onCambio={alSalir} />
                    <SalidaPedido pedido={fresco.pedido} onCambio={alSalir} />
                </Seccion>
            )}
            {confirmando && fresco.pedido && (
                <ConfirmarPedido pedido={fresco.pedido} onConfirmado={alConfirmar} onCerrar={alCerrarConfirmacion} />
            )}
            <Seccion icono={<Megaphone size={18} />} titulo="¿Cómo llegó?">
                <CanalPedido key={cotizacion.id} cotizacion={cotizacion} canal={canal} onCambio={historia.recargar} />
            </Seccion>
            <Seccion icono={<History size={18} />} titulo="Historia">
                <HistoriaPedido
                    eventos={historia.eventos}
                    cargando={historia.cargando}
                    error={historia.error}
                    modoEntrega={cotizacion.modo_entrega}
                    onReintentar={historia.recargar}
                />
            </Seccion>
        </>
    );
};

export default SeguimientoPedido;
