import React from 'react';
import { History, Megaphone } from 'lucide-react';
import useHistoriaPedido from '../../../../../hooks/useHistoriaPedido';
import CanalPedido from './CanalPedido';
import HistoriaPedido from './HistoriaPedido';
import './pedido.css';

const Seccion = ({ icono, titulo, children }) => (
    <div className="detail-drawer-section-wrapper">
        <div className="detail-drawer-section-header">
            <div className="detail-drawer-flex-row-12">
                <div className="detail-drawer-section-icon">{icono}</div>
                <h3 className="detail-drawer-section-title">{titulo}</h3>
            </div>
        </div>
        <div className="sp-cuerpo">{children}</div>
    </div>
);

/**
 * Cómo llegó el pedido y qué le ha pasado desde entonces.
 *
 * Corregir "¿Cómo llegó?" recarga la historia: la corrección misma queda
 * anotada, y se tiene que ver ahí.
 */
const SeguimientoPedido = ({ cotizacion }) => {
    const { eventos, cargando, error, recargar } = useHistoriaPedido(cotizacion.id);

    return (
        <>
            <Seccion icono={<Megaphone size={18} />} titulo="¿Cómo llegó?">
                <CanalPedido key={cotizacion.id} cotizacion={cotizacion} onCambio={recargar} />
            </Seccion>
            <Seccion icono={<History size={18} />} titulo="Historia">
                <HistoriaPedido
                    eventos={eventos}
                    cargando={cargando}
                    error={error}
                    modoEntrega={cotizacion.modo_entrega}
                    onReintentar={recargar}
                />
            </Seccion>
        </>
    );
};

export default SeguimientoPedido;
