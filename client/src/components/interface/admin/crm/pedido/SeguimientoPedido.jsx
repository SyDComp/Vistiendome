import React from 'react';
import { History, Megaphone } from 'lucide-react';
import useHistoriaPedido from '../../../../../hooks/useHistoriaPedido';
import { canalSegunHistoria } from '../../../../../utils/historiaPedido';
import CanalPedido from './CanalPedido';
import HistoriaPedido from './HistoriaPedido';
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
 * Cómo llegó el pedido y qué le ha pasado desde entonces.
 *
 * `abierto`: el panel lateral no se desmonta al cerrarse, así que la historia
 * se vuelve a pedir cada vez que se abre.
 *
 * Corregir "¿Cómo llegó?" recarga la historia: la corrección misma queda
 * anotada, y el valor que se muestra se lee de ahí.
 */
const SeguimientoPedido = ({ cotizacion, abierto = true }) => {
    const { eventos, cargando, error, recargar } = useHistoriaPedido(cotizacion.id, abierto);
    const canal = canalSegunHistoria(eventos, cotizacion.canal);

    return (
        <>
            <Seccion icono={<Megaphone size={18} />} titulo="¿Cómo llegó?">
                <CanalPedido key={cotizacion.id} cotizacion={cotizacion} canal={canal} onCambio={recargar} />
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
