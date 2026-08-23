import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Package, User, Phone } from 'lucide-react';
import ItemsPedidoTable from './ItemsPedidoTable';
import { formatCurrency } from '../../../../utils/cartUtils';

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
    const nombreCompleto = cliente ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Cliente';
    const esTaller = modo === 'taller';

    return (
        <div className="pedido-detalle-wrapper">
            <div className="pedido-detalle-card">
                <header className="pedido-header">
                    <h1>VISTIÉNDOME CHILE</h1>
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

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                * { box-sizing: border-box; }
                body { margin: 0; font-family: 'Inter', system-ui, sans-serif; }

                .pedido-detalle-status { padding: 60px; text-align: center; font-family: system-ui, sans-serif; color: #64748b; }
                .pedido-detalle-status.error { color: #dc2626; font-weight: 700; }

                .pedido-detalle-wrapper {
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    padding: 40px 20px;
                    background: #f1f5f9;
                }
                .pedido-detalle-card {
                    background: #fff;
                    width: 100%;
                    max-width: 700px;
                    border: 2px solid #000;
                    border-radius: 8px;
                    padding: 30px;
                    color: #000;
                }
                .pedido-header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 16px; margin-bottom: 20px; }
                .pedido-header h1 { font-size: 28px; font-weight: 900; margin: 0 0 4px; letter-spacing: 1px; }
                .pedido-subtitle { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #4b5563; margin: 0; }
                .pedido-numero { font-size: 13px; font-weight: 700; color: #8f0653; margin: 4px 0 0; }

                .pedido-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 24px; font-size: 14px; }
                .pedido-meta-item { display: flex; align-items: center; gap: 6px; }

                .items-pedido-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .items-pedido-table th {
                    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
                    color: #4b5563; border-bottom: 2px solid #000; padding: 8px 6px;
                }
                .items-pedido-table td { padding: 10px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                .items-pedido-table .col-num { text-align: right; }
                .config-badges { display: flex; flex-wrap: wrap; gap: 4px; }
                .config-badge {
                    font-size: 11px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px;
                    padding: 2px 6px; color: #334155; white-space: nowrap;
                }
                .total-label { text-align: right; font-weight: 800; border-bottom: none; padding-top: 14px; }
                .total-value { font-weight: 900; font-size: 15px; border-bottom: none; padding-top: 14px; }

                .pedido-footer-note { margin-top: 20px; font-size: 12px; color: #64748b; text-align: center; }

                @media print {
                    @page { margin: 10mm; }
                    body { background: #fff; }
                    .no-print { display: none !important; }
                    .pedido-detalle-wrapper { padding: 0; background: #fff; }
                    .pedido-detalle-card { border: none; max-width: 100%; padding: 0; }
                }
            `}</style>
        </div>
    );
};

export default PedidoDetalle;
