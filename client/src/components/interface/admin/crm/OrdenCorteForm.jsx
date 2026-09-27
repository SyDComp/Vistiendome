import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Package, Scissors } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { getPiezasPendientes, crearOrdenCorte } from '../../../../lib/api/endpoints';
import SelectorVariantes from './SelectorVariantes';
import TablaPrendas from './TablaPrendas';
import useCaracteristicasCorte from '../../../../hooks/useCaracteristicasCorte';
import './OrdenCorteForm.css';

/**
 * Arma una orden de corte.
 *
 * Dos fuentes, porque son las dos formas en que se corta de verdad:
 *   1. Piezas de pedidos confirmados — el sistema las propone, no hay que
 *      escribirlas de nuevo.
 *   2. Líneas libres para stock — cortar sin que nadie lo haya pedido todavía.
 */
const OrdenCorteForm = ({ onVolver, onCreada }) => {
    const { toast } = useNotification();

    const [pendientes, setPendientes] = useState([]);
    const [elegidas, setElegidas] = useState({});   // cotizacion_item_id -> pieza
    const [paraStock, setParaStock] = useState([]); // [{sku_id, sku, producto, config, cantidad}]
    const [notas, setNotas] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const columnasCorte = useCaracteristicasCorte();


    useEffect(() => {
        getPiezasPendientes()
            .then(d => setPendientes(d || []))
            .catch(() => toast.error('No se pudieron cargar las piezas pendientes'))
            .finally(() => setCargando(false));
    }, []);

    const totalUnidades = useMemo(
        () => Object.values(elegidas).reduce((a, p) => a + p.cantidad, 0)
            + paraStock.reduce((a, l) => a + (Number(l.cantidad) || 0), 0),
        [elegidas, paraStock]
    );

    const togglePieza = (p) => setElegidas(prev => {
        const n = { ...prev };
        if (n[p.cotizacion_item_id]) delete n[p.cotizacion_item_id];
        else n[p.cotizacion_item_id] = p;
        return n;
    });

    // Si ya estan todas elegidas, el mismo boton las quita; si falta alguna
    // (o no hay ninguna), las agrega todas de una vez. Antes habia que
    // marcar el checkbox pieza por pieza, y una orden puede traer decenas.
    const todasElegidas = pendientes.length > 0
        && pendientes.every(p => elegidas[p.cotizacion_item_id]);

    const alternarTodas = () => {
        if (todasElegidas) {
            setElegidas({});
        } else {
            setElegidas(Object.fromEntries(pendientes.map(p => [p.cotizacion_item_id, p])));
        }
    };

    const agregarStock = (v) => {
        setParaStock(prev => [...prev, {
            sku_id: v.id,
            sku: v.sku,
            producto: v.product_name || v.producto || '',
            config: v.config || {},
            cantidad: 1,
        }]);
    };

    // Para que el explorador marque lo que ya está en la orden
    const yaElegidas = useMemo(() => new Set(paraStock.map(l => l.sku_id)), [paraStock]);

    const guardar = async () => {
        const items = [
            ...Object.values(elegidas).map(p => ({
                sku_id: p.sku_id ?? null,
                // Una pieza personalizada no tiene variante del catalogo: el
                // nombre es lo unico que la identifica en la planilla.
                nombre_custom: p.nombre_custom ?? null,
                // Las caracteristicas de la pieza personalizada viajan con ella:
                // sin esto la orden de corte dice el nombre y nada mas.
                config_custom: (p.sku_id == null && p.config && Object.keys(p.config).length) ? p.config : null,
                cantidad: p.cantidad,
                cotizacion_item_id: p.cotizacion_item_id,
            })),
            ...paraStock
                .filter(l => Number(l.cantidad) > 0)
                .map(l => ({ sku_id: l.sku_id, cantidad: Number(l.cantidad) })),
        ];
        if (!items.length) return toast.error('Agrega al menos una pieza a la orden');

        setGuardando(true);
        try {
            const orden = await crearOrdenCorte({ notas: notas || null, items });
            toast.success(`Orden de corte N° ${orden.numero} creada`);
            onCreada?.(orden);
        } catch (err) {
            toast.error(err?.message || 'No se pudo crear la orden');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fade-in oc-form">
            <div className="oc-form-top">
                <button className="oc-btn-volver" onClick={onVolver}><ArrowLeft size={16} /> Volver</button>
                <SectionHeader title="Nueva Orden de Corte" subtitle={`${totalUnidades} unidades en total`} icon={Scissors} />
            </div>

            <section className="oc-bloque">
                <div className="oc-bloque-cabecera">
                    <div>
                        <h3>Piezas de pedidos confirmados</h3>
                        <p className="oc-hint">
                            Lo que las clientas ya compraron y todavía no se corta. Elige lo que
                            entra en esta orden; lo que no elijas queda disponible para la próxima.
                        </p>
                    </div>
                    {!cargando && pendientes.length > 0 && (
                        <button type="button" className="oc-btn-seleccionar-todo" onClick={alternarTodas}>
                            {todasElegidas ? 'Quitar selección' : 'Seleccionar todo'}
                        </button>
                    )}
                </div>

                {cargando ? (
                    <div className="oc-vacio">Cargando...</div>
                ) : pendientes.length === 0 ? (
                    <div className="oc-vacio">
                        No hay piezas de pedidos esperando corte. Puedes armar la orden
                        igual, agregando abajo lo que quieras cortar para stock.
                    </div>
                ) : (
                    <TablaPrendas
                        items={pendientes}
                        columnasPermitidas={columnasCorte}
                        claseFila={(p) => (elegidas[p.cotizacion_item_id] ? 'tp-elegida' : '')}
                        casilla={(p) => (
                            <input
                                type="checkbox"
                                aria-label={`Incluir ${p.producto} del pedido ${p.pedido_numero ?? ''}`}
                                checked={!!elegidas[p.cotizacion_item_id]}
                                onChange={() => togglePieza(p)}
                            />
                        )}
                        columnasExtra={[
                            { clave: 'pedido', etiqueta: 'N° Pedido', valor: (p) => p.pedido_numero ?? '—' },
                            { clave: 'cliente', etiqueta: 'Cliente', valor: (p) => p.cliente },
                        ]}
                    />
                )}
            </section>

            <section className="oc-bloque">
                <h3>Cortar para stock</h3>
                <p className="oc-hint">
                    Prendas que no vienen de un pedido. Al finalizar la orden, estas
                    unidades <strong>entran al inventario</strong>.
                </p>

                <SelectorVariantes onElegir={agregarStock} yaElegidas={yaElegidas} />

                {paraStock.length > 0 && (
                    <TablaPrendas
                        items={paraStock}
                        columnasPermitidas={columnasCorte}
                        cantidad={(l) => (
                            <input
                                type="number" min="1" value={l.cantidad} className="oc-cantidad"
                                aria-label={`Cantidad de ${l.producto || l.sku}`}
                                onChange={e => setParaStock(prev => prev.map(
                                    x => x.sku_id === l.sku_id ? { ...x, cantidad: e.target.value } : x
                                ))}
                            />
                        )}
                        columnasExtra={[{
                            clave: 'quitar', etiqueta: '',
                            valor: (l) => (
                                <button type="button" className="oc-quitar"
                                    aria-label={`Quitar ${l.producto || l.sku}`}
                                    onClick={() => setParaStock(prev => prev.filter(x => x.sku_id !== l.sku_id))}>
                                    <Trash2 size={14} />
                                </button>
                            ),
                        }]}
                    />
                )}
            </section>

            <section className="oc-bloque">
                <h3>Notas</h3>
                <textarea className="oc-notas" rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Opcional: tela, prioridad, quién corta..." />
            </section>

            <div className="oc-form-acciones">
                <button className="oc-btn-primario" onClick={guardar} disabled={guardando || !totalUnidades}>
                    <Save size={16} /> {guardando ? 'Creando...' : `Crear orden (${totalUnidades} unidades)`}
                </button>
            </div>

        </div>
    );
};

export default OrdenCorteForm;
