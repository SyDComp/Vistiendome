import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Package, User, Phone, Printer } from 'lucide-react';
import ItemsPedidoTable from './ItemsPedidoTable';
import { formatCurrency } from '../../../../utils/cartUtils';
import './PedidoDetalle.css';

/**
 * Planilla de pedido (modo=taller, con precios y detalle de confección) y
 * comprobante de compra (modo=cliente, sin precios) — misma pieza técnica,
 * un query param decide el layout. Ruta: /admin/print/pedido/:id
 */
const PedidoDetalle = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const modo = searchParams.get('modo') === 'cliente' ? 'cliente' : 'taller';
    const [cotizacion, setCotizacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        fetch(`/api/v1/crm/cotizaciones/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(res => {
                if (!res.ok) throw new Error('No se pudo cargar el pedido');
                return res.json();
            })
            .then(setCotizacion)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="pedido-detalle-status">Cargando pedido...</div>;
    if (error || !cotizacion) return <div className="pedido-detalle-status error">{error || 'Pedido no encontrado'}</div>;

    const cliente = cotizacion.cliente;
    // El nombre de ESTE pedido primero: puede diferir del que tiene guardado
    // la Persona vinculada (mismo RUT, otro nombre de verdad — ver
    // Cotizacion.nombre_contacto en el backend), y esta hoja es del pedido,
    // no del cliente en general.
    const nombreCompleto = cotizacion.nombre_contacto
        || (cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Cliente');
    const esTaller = modo === 'taller';

    return (
        <div className="pedido-detalle-wrapper">
            {/* La hoja ya estaba pensada para imprimirse —tiene sus estilos de
                impresion y hasta una clase .no-print— pero nadie habia puesto el
                boton, asi que habia que saber que existe Ctrl+P. */}
            <div className="no-print pedido-acciones">
                <button type="button" onClick={() => window.print()} className="pedido-boton-imprimir">
                    <Printer size={16} /> Imprimir
                </button>
            </div>
            <div className="pedido-detalle-card">
                <header className="pedido-header">
                    <h1>VISTIENDOMÉ CHILE</h1>
                    <p className="pedido-subtitle">{esTaller ? 'Planilla de Pedido' : 'Comprobante de Compra'}</p>
                    <p className="pedido-numero">N° {cotizacion.numero ?? '—'}</p>
                </header>

                <div className="pedido-meta">
                    <div className="pedido-meta-item">
                        <User size={14} /> <strong>{nombreCompleto.toUpperCase()}</strong>
                    </div>
                    {cliente?.telefono && (
                        <div className="pedido-meta-item">
                            <Phone size={14} /> {cliente.telefono}
                        </div>
                    )}
                    <div className="pedido-meta-item">
                        <Package size={14} /> {new Date(cotizacion.created_at).toLocaleDateString('es-CL')}
                    </div>
                </div>

                <ItemsPedidoTable items={cotizacion.items || []} mostrarPrecios={esTaller} />

                {!esTaller && (
                    <p className="pedido-footer-note">Gracias por tu compra. Cualquier consulta, escríbenos por WhatsApp.</p>
                )}
            </div>

        </div>
    );
};

export default PedidoDetalle;
