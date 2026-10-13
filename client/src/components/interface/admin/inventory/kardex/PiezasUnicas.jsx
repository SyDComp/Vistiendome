import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../../../context/NotificationContext';
import { darDeBajaPiezaUnica } from '../../../../../lib/api/endpoints';
import usePiezasUnicas from '../../../../../hooks/usePiezasUnicas';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import AsignarPieza from './AsignarPieza';
import { ESTADOS_PIEZA, detallePieza, dondePieza } from './piezas';
import '../../crm/pedido/pedido.css';

/**
 * Bodega › Piezas únicas: prendas personalizadas ya hechas cuyo pedido se
 * canceló. No son una variante del catálogo, pero existen: se asignan a otro
 * pedido o se dan de baja (con nota). Ver models/piezas.py en el servidor.
 */
const PiezasUnicas = () => {
    const navigate = useNavigate();
    const { toast, prompt } = useNotification();
    const { piezas, cargando, error, recargar } = usePiezasUnicas();
    const [asignando, setAsignando] = useState(null);

    const darDeBaja = async (pieza) => {
        const nota = await prompt(`¿Por qué se da de baja la pieza única N° ${pieza.numero}? (se regaló, se desarmó, se perdió…)`);
        if (nota === null || nota === undefined) return;
        try {
            await darDeBajaPiezaUnica(pieza.id, nota);
            toast.success(`Pieza única N° ${pieza.numero} dada de baja`);
            recargar();
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo dar de baja'));
        }
    };

    const irAlPedido = (pedidoId) => navigate(`/admin/dashboard/crm/cotizaciones?pedido=${pedidoId}`);

    return (
        <section className="logistics-piezas" aria-labelledby="piezas-titulo">
            <h2 id="piezas-titulo" className="logistics-piezas-titulo">Piezas únicas</h2>
            <p className="logistics-piezas-ayuda">
                Prendas personalizadas ya hechas cuyo pedido se canceló. Se pueden agregar a otro pedido.
            </p>

            {error && (
                <div className="sp-aviso sp-aviso--error" role="alert">
                    <span>{error}</span>
                    <button type="button" className="sp-boton" onClick={recargar}>Reintentar</button>
                </div>
            )}
            {!error && !cargando && !piezas.length && (
                <p className="logistics-piezas-ayuda">No hay piezas únicas por ahora.</p>
            )}

            {piezas.length > 0 && (
                <ul className="logistics-piezas-lista" aria-busy={cargando}>
                    {piezas.map(p => {
                        const estado = ESTADOS_PIEZA[p.estado] || { texto: p.estado, tono: 'neutro' };
                        const detalle = detallePieza(p);
                        const donde = dondePieza(p);
                        return (
                            <li key={p.id} className="logistics-pieza">
                                <div className="logistics-pieza-datos">
                                    <span className="logistics-product-name">N° {p.numero} · {p.nombre}</span>
                                    {detalle && <span className="logistics-product-sku">{detalle}</span>}
                                    {donde && <span className="logistics-pieza-donde">{donde}</span>}
                                </div>
                                <span className={`logistics-stock-badge ${estado.tono}`}>{estado.texto}</span>
                                <div className="logistics-pieza-acciones">
                                    {p.estado === 'DISPONIBLE' && (
                                        <>
                                            <button type="button" className="sp-boton sp-boton--principal" onClick={() => setAsignando(p)}>
                                                Agregar a un pedido
                                            </button>
                                            <button type="button" className="sp-boton" onClick={() => darDeBaja(p)}>
                                                Dar de baja
                                            </button>
                                        </>
                                    )}
                                    {p.pedido_id && (
                                        <button type="button" className="sp-boton" onClick={() => irAlPedido(p.pedido_id)}>
                                            Ver pedido N° {p.pedido_numero}
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {asignando && (
                <AsignarPieza
                    pieza={asignando}
                    onCerrar={() => setAsignando(null)}
                    onAsignada={() => { setAsignando(null); recargar(); }}
                />
            )}
        </section>
    );
};

export default PiezasUnicas;
