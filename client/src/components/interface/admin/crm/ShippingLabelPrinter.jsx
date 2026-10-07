import React, { useState, useEffect, useRef, useMemo } from 'react';
import { describirEntrega } from '../../../../utils/entrega';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './ShippingLabelPrinter.css';
import './ShippingLabelPrinter.parte.css';
import {
    Printer, Search, CheckSquare, Square, Package, Settings2, RefreshCw,
    LayoutGrid, Zap, ArrowLeft
} from 'lucide-react';
import Button from '../../../ui/Button';
import { useSettings } from '../../../../context/SettingsContext';
import { getShippingColor } from '../../../../utils/shippingColors';
import { actualizarEstadoCotizacion } from '../../../../lib/api/endpoints';
import { useNotification } from '../../../../context/NotificationContext';
import { estadoDeProduccion, TONOS } from '../../../../utils/produccion';
import { imprimirDocumento } from '../../../../utils/impresion';
import { useHasta } from '../../../../hooks/useCorte';
import { PAPELES } from '../../../../utils/papeles';
import { nombreDelPedido } from '../../../../utils/nombreDelPedido';
import EtiquetaEnvio from './etiquetas/EtiquetaEnvio';
import PaginaEtiquetas from '../../../ui/impresion/PaginaEtiquetas';
import EncuadrePagina from '../../../ui/impresion/EncuadrePagina';
import { useAjusteAlEspacio } from '../../../ui/impresion/ajusteAlEspacio';
import { estilosDePagina } from '../../../ui/impresion/pagina';
import {
    FORMATOS, usaPapel, geometria, porPagina, describirMedida,
} from './etiquetas/formatosEtiqueta';
import estilosPagina from '../../../ui/impresion/PaginaEtiquetas.css?raw';
import estilosEtiqueta from './etiquetas/EtiquetaEnvio.css?raw';
import estilosImpresion from '../../../ui/impresion/paginas.impresion.css?raw';

/**
 * Qué pedidos se ven. Existe porque la pantalla traía TODOS —nuevos, en
 * conversación y hasta los cancelados— y desde que imprimir marca DESPACHADA,
 * imprimir la etiqueta de un pedido sin confirmar le descontaría el stock a una
 * venta que nadie aceptó.
 *
 * La vista por omisión es un conjunto de trabajo que SE VACÍA: lo que está por
 * despachar deja la lista al despacharse. Por eso no crece sin techo; la que
 * crece es "Todas", y para eso está el buscador.
 */
const VISTAS = {
    por_despachar: {
        etiqueta: 'Por despachar',
        detalle: 'confirmadas, todavía en el taller',
        estados: ['CONFIRMADA'],
    },
    despachadas: {
        etiqueta: 'Ya despachadas',
        detalle: 'para reimprimir una etiqueta',
        estados: ['DESPACHADA'],
    },
    todas: {
        etiqueta: 'Todas',
        detalle: 'incluye las que no se pueden despachar',
        estados: null,
    },
};

// Sólo un pedido aceptado o ya despachado tiene sentido en una etiqueta.
const SE_PUEDE_DESPACHAR = ['CONFIRMADA', 'DESPACHADA'];

const ShippingLabelPrinter = () => {
    const { settings } = useSettings();
    const shippingColors = settings?.shipping_colors || {};
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialSelectedId = searchParams.get('id');

    const { toast } = useNotification();
    const [cotizaciones, setCotizaciones] = useState([]);
    const [clientesMap, setClientesMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Selección: mapa de id -> { coti, cliente, copies }
    const [selected, setSelected] = useState({});
    // Imprimir la etiqueta ES el despacho: es el momento en que la prenda sale
    // del taller. Marcarlo acá evita pedir un clic aparte para algo que ya se
    // está haciendo — y ese estado es el que descuenta el stock.
    // Va encendido por omisión y se puede apagar para reimprimir una etiqueta
    // sin volver a despachar.
    const [marcarDespachadas, setMarcarDespachadas] = useState(true);
    const [vista, setVista] = useState('por_despachar');
    const [conteos, setConteos] = useState({});
    // Qué se acaba de marcar, para poder deshacerlo.
    //
    // Por qué deshacer y no una regla que detecte los retiros en local: el
    // método de envío es texto libre que edita la clienta desde Ajustes, y hoy
    // ya conviven tres formas de escribir lo mismo — "RETIRO EN LOCAL" en la
    // tienda, "RETIRO EN TIENDA" en el panel y "RETIRO_LOCAL" en la base.
    // Peor: al enviar un pedido a sucursal el transporte se guarda como
    // "STARKEN (retiro en sucursal)", que contiene la palabra "retiro" y ES un
    // despacho de verdad. Cualquier regla que lea ese nombre se equivoca.
    // Deshacer no necesita clasificar nada y cubre además los casos que no
    // se nos ocurrieron.
    const [ultimoDespacho, setUltimoDespacho] = useState(null);

    // Configuración de impresión
    const [formatKey, setFormatKey] = useState('hoja_4');
    const [papelKey, setPapelKey] = useState('carta');
    const [inkMode, setInkMode] = useState('eco'); // 'eco' | 'standard'
    const [showBarcode, setShowBarcode] = useState(true);
    const [barcodeSize, setBarcodeSize] = useState('compact'); // 'micro' | 'compact' | 'standard'
    const [showCutLines, setShowCutLines] = useState(true);
    const [showTransportColor, setShowTransportColor] = useState(true);
    const isMobile = useHasta('lg');

    // La vista previa es también lo que se imprime: se copian sus páginas.
    const vistaRef = useRef(null);

    // Cargar datos CRM
    const fetchData = async () => {
        setLoading(true);
        try {
            // Se pide sólo lo de la vista activa: traer todo y filtrar acá
            // funciona con 14 pedidos y falla en el 101, porque el limit del
            // servidor corta antes de que el filtro llegue a mirar.
            const estados = VISTAS[vista].estados;
            const query = estados ? '?' + estados.map(e => `estado=${e}`).join('&') : '';
            const [cotiRes, cliRes, conteoRes] = await Promise.all([
                fetch(`/api/v1/crm/${query}`),
                fetch('/api/v1/crm/clientes'),
                fetch('/api/v1/crm/conteo-estados'),
            ]);
            if (conteoRes.ok) setConteos(await conteoRes.json());
            if (cotiRes.ok && cliRes.ok) {
                const cotiData = await cotiRes.json();
                const cliData = await cliRes.json();

                const cliMap = {};
                cliData.forEach(c => {
                    cliMap[c.id] = c;
                });
                setClientesMap(cliMap);

                // Ordenar por más recientes
                const sorted = [...cotiData].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                setCotizaciones(sorted);

                // Si venía un ID en la URL, pre-seleccionarlo
                if (initialSelectedId) {
                    const target = sorted.find(c => c.id === initialSelectedId);
                    if (target) {
                        setSelected({
                            [target.id]: {
                                coti: target,
                                cliente: cliMap[target.persona_id] || null,
                                copies: 1
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar cotizaciones para etiquetas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Al cambiar de vista se limpia la selección: dejar seleccionado algo
        // que ya no se ve es la forma más fácil de imprimir una etiqueta que
        // nadie quiso.
        setSelected({});
    }, [initialSelectedId, vista]);

    // Filtrar cotizaciones
    const filteredCotizaciones = useMemo(() => {
        if (!searchQuery.trim()) return cotizaciones;
        const q = searchQuery.toLowerCase();
        return cotizaciones.filter(c => {
            const cli = clientesMap[c.persona_id];
            const name = nombreDelPedido(c, cli).toLowerCase();
            const rut = cli?.rut ? cli.rut.toLowerCase() : '';
            const cotiId = c.id?.toLowerCase() || '';
            const comuna = c.comuna?.toLowerCase() || '';
            const trans = c.transporte?.toLowerCase() || '';
            return name.includes(q) || rut.includes(q) || cotiId.includes(q) || comuna.includes(q) || trans.includes(q);
        });
    }, [cotizaciones, clientesMap, searchQuery]);

    // Total de etiquetas seleccionadas (contando copias)
    const selectedList = Object.values(selected);
    const totalCopies = selectedList.reduce((acc, curr) => acc + (curr.copies || 1), 0);

    const toggleSelect = (coti) => {
        if (!SE_PUEDE_DESPACHAR.includes(coti.estado)) return;
        setSelected(prev => {
            const next = { ...prev };
            if (next[coti.id]) {
                delete next[coti.id];
            } else {
                next[coti.id] = {
                    coti,
                    cliente: clientesMap[coti.persona_id] || null,
                    copies: 1
                };
            }
            return next;
        });
    };

    const updateCopies = (id, delta) => {
        setSelected(prev => {
            if (!prev[id]) return prev;
            const current = prev[id].copies || 1;
            const updated = Math.max(1, current + delta);
            return {
                ...prev,
                [id]: { ...prev[id], copies: updated }
            };
        });
    };

    const selectAllFiltered = () => {
        const next = { ...selected };
        // "Todos" es todos los que SE PUEDEN despachar. En la vista "Todas"
        // hay canceladas y sin confirmar, y meterlas en la selección seria
        // despacharlas con un clic.
        filteredCotizaciones.filter(c => SE_PUEDE_DESPACHAR.includes(c.estado)).forEach(c => {
            if (!next[c.id]) {
                next[c.id] = {
                    coti: c,
                    cliente: clientesMap[c.persona_id] || null,
                    copies: 1
                };
            }
        });
        setSelected(next);
    };

    const clearSelection = () => setSelected({});

    // Generar las etiquetas a imprimir según las copias de cada uno
    const previewSlots = useMemo(() => {
        const slots = [];
        selectedList.forEach(item => {
            for (let i = 0; i < item.copies; i++) {
                slots.push({
                    coti: item.coti,
                    cliente: item.cliente,
                    index: i + 1,
                    totalForId: item.copies
                });
            }
        });
        return slots;
    }, [selectedList]);

    // El papel y el formato deciden cuánto mide cada etiqueta y cuántas van
    // por página (ver formatosEtiqueta.js).
    const medidas = geometria(formatKey, papelKey);
    const slotsPerPage = porPagina(medidas);
    const codigo = showBarcode ? barcodeSize : null;

    const pages = useMemo(() => {
        const result = [];
        for (let i = 0; i < previewSlots.length; i += slotsPerPage) {
            result.push(previewSlots.slice(i, i + slotsPerPage));
        }
        return result;
    }, [previewSlots, slotsPerPage]);

    useAjusteAlEspacio(vistaRef, [pages, formatKey, papelKey, inkMode, codigo, showCutLines, showTransportColor]);

    const marcarComoDespachadas = async () => {
        const pendientes = selectedList
            .map(sel => sel.coti)
            .filter(c => c && c.estado !== 'DESPACHADA')
            // Un retiro no se despacha al imprimir: la prenda sigue en el local
            // hasta que la clienta viene a buscarla. Ahora esto NO se adivina
            // leyendo el nombre del transporte — el pedido declara su modo.
            .filter(c => c.modo_entrega !== 'RETIRO');
        if (!pendientes.length) return;

        const resultados = await Promise.allSettled(
            pendientes.map(c => actualizarEstadoCotizacion(c.id, 'DESPACHADA', 'etiquetas'))
        );
        const fallaron = resultados.filter(r => r.status === 'rejected').length;

        const marcados = pendientes.filter((_, i) => resultados[i].status === 'fulfilled');
        setUltimoDespacho(marcados.length ? marcados.map(c => c.id) : null);

        if (fallaron) {
            // Se dice cuántos, no un "hubo un error": la clienta necesita saber
            // cuáles revisar a mano, porque de eso depende el stock.
            toast.error(`${fallaron} de ${pendientes.length} no se pudieron marcar como despachadas. Revísalos en Cotizaciones.`);
        } else {
            toast.success(pendientes.length === 1
                ? 'Pedido marcado como despachado'
                : `${pendientes.length} pedidos marcados como despachados`);
        }
        fetchData();
    };

    const deshacerDespacho = async () => {
        const ids = ultimoDespacho || [];
        // Volver a CONFIRMADA devuelve el stock con un movimiento de vuelta
        // (la salida no se borra), y la historia de cada pedido lo anota.
        const r = await Promise.allSettled(ids.map(id => actualizarEstadoCotizacion(id, 'CONFIRMADA', 'deshacer_etiquetas')));
        const fallaron = r.filter(x => x.status === 'rejected').length;
        if (fallaron) {
            toast.error(`${fallaron} de ${ids.length} no se pudieron revertir. Revísalos en Cotizaciones.`);
        } else {
            toast.success(ids.length === 1
                ? 'Se deshizo el despacho: el pedido volvió a Confirmada'
                : `Se deshizo el despacho de ${ids.length} pedidos`);
        }
        setUltimoDespacho(null);
        fetchData();
    };

    // Manejar Impresión en ventana limpia
    const handlePrint = async () => {
        if (totalCopies === 0) return;
        // Las páginas de la vista previa tal cual, con la escala de letra ya
        // ajustada: lo que se vio es lo que sale.
        const paginas = [...(vistaRef.current?.querySelectorAll('.et-pagina') || [])];
        if (!paginas.length) return;

        // Se marca despues de comprobar que la ventana abrio: si el navegador
        // bloqueo el pop-up no se imprimio nada, y no corresponde dar por
        // despachado un pedido cuya etiqueta nunca salio.
        const seImprimio = imprimirDocumento({
            titulo: 'Etiquetas de Envío - Vistiendome',
            cuerpo: paginas.map(p => p.outerHTML).join('\n'),
            estilos: [estilosPagina, estilosEtiqueta, estilosImpresion, estilosDePagina(medidas)],
        });
        if (seImprimio && marcarDespachadas) marcarComoDespachadas();
    };

    return (
        <div className="shipping-label-generator-wrap et-marco">

            {/* TOP NAVBAR */}
            <header className="et-cabecera">
                <div className="et-fila-ancha">
                    <button
                        onClick={() => navigate('/admin/dashboard/crm/cotizaciones')}
                        className="et-boton-claro"
                    >
                        <ArrowLeft size={16} /> Volver a Cotizaciones
                    </button>
                    <div className="et-bloque">
                        <h1 className="et-titulo">
                            <Printer  size={isMobile ? 18 : 22} /> Generador de Etiquetas de Envío
                        </h1>
                        <p className="et-sub">
                            Optimiza el consumo de hojas y tinta seleccionando la disposición ideal para tu impresora.
                        </p>
                    </div>
                </div>

                <div className="et-acciones">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                        className="et-boton-imprimir"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                    </Button>
                    <label
                        title="Al imprimir, los pedidos seleccionados pasan a DESPACHADA y se descuentan del stock"
                        className="et-opcion--holgada"
                    >
                        <input
                            type="checkbox"
                            checked={marcarDespachadas}
                            onChange={e => setMarcarDespachadas(e.target.checked)}
                        />
                        Marcar como despachadas
                        <span className="et-apagado">(no aplica a retiros)</span>
                    </label>
                    <Button
                        variant="primary"
                        onClick={handlePrint}
                        disabled={totalCopies === 0}
                        className="et-imprimir"
                    >
                        {/* Un boton que anuncia "Imprimir 0 Etiquetas" no dice nada:
                            en vez de contar lo que no hay, dice que falta hacer. */}
                        <Printer size={16} />
                        {totalCopies === 0
                            ? 'Marca pedidos para imprimir'
                            : `Imprimir ${totalCopies} ${totalCopies === 1 ? 'Etiqueta' : 'Etiquetas'}`}
                    </Button>
                </div>
            </header>

            {ultimoDespacho && (
                <div className="et-despacho">
                    <span>
                        {ultimoDespacho.length === 1
                            ? 'Se marcó 1 pedido como despachado y se descontó del stock.'
                            : `Se marcaron ${ultimoDespacho.length} pedidos como despachados y se descontaron del stock.`}
                    </span>
                    <button
                        type="button"
                        onClick={deshacerDespacho}
                        className="et-boton-morado"
                    >
                        Deshacer
                    </button>
                    <button
                        type="button"
                        onClick={() => setUltimoDespacho(null)}
                        className="et-boton-morado-plano"
                    >
                        Entendido
                    </button>
                </div>
            )}

            {/* SPLIT PANEL CONTENT */}
            <div className="et-cuerpo">

                {/* PANEL IZQUIERDO: SELECCIÓN DE PEDIDOS / COTIZACIONES */}
                <div className="et-panel-lista">
                    <div className="et-lista-fila">
                        <div className="et-etiqueta-cabecera">
                            <h2 className="et-titulo">
                                Seleccionar ({Object.keys(selected).length})
                            </h2>
                            <div className="et-fila-botones">
                                <button
                                    onClick={selectAllFiltered}
                                    className="et-boton-enlace"
                                >
                                    Todos
                                </button>
                                <span className="et-icono-apagado">|</span>
                                <button
                                    onClick={clearSelection}
                                    className="et-boton-enlace et-boton-enlace--gris"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        <div className="et-etiquetas">
                            {Object.entries(VISTAS).map(([clave, v]) => {
                                const activa = vista === clave;
                                const n = v.estados
                                    ? v.estados.reduce((a, e) => a + (conteos[e] || 0), 0)
                                    : Object.values(conteos).reduce((a, b) => a + b, 0);
                                return (
                                    <button
                                        key={clave}
                                        type="button"
                                        onClick={() => setVista(clave)}
                                        title={v.detalle}
                                        className={`et-pildora${activa ? ' et-pildora--activa' : ''}`}
                                    >
                                        {v.etiqueta} ({n})
                                    </button>
                                );
                            })}
                        </div>
                        <p className="et-ayuda">
                            {VISTAS[vista].detalle}
                        </p>

                        <div className="et-buscador">
                            <Search size={13} className="et-buscador-icono" />
                            <input
                                type="text"
                                placeholder="Buscar cliente, RUT, ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}

                            />
                        </div>
                    </div>

                    {/* LISTA DE COTIZACIONES */}
                    <div className="et-lista">
                        {loading ? (
                            <div className="et-vacio--oscuro">
                                <RefreshCw size={24} className="animate-spin" />
                                Cargando cotizaciones...
                            </div>
                        ) : filteredCotizaciones.length === 0 ? (
                            <div className="et-vacio">
                                No se encontraron pedidos.
                            </div>
                        ) : (
                            filteredCotizaciones.map(c => {
                                const cli = clientesMap[c.persona_id];
                                const fullName = nombreDelPedido(c, cli) || 'Cliente sin registro';
                                const isSel = !!selected[c.id];
                                const copies = isSel ? selected[c.id].copies : 0;
                                // Un pedido sin confirmar o cancelado no se
                                // despacha. No se ofrece la casilla en gris: no
                                // se ofrece — y se dice por qué, que si no
                                // parece que la pantalla está rota.
                                const despachable = SE_PUEDE_DESPACHAR.includes(c.estado);
                                const confeccion = estadoDeProduccion(c);

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => despachable && toggleSelect(c)}
                                        className={`et-pedido${isSel ? ' et-pedido--elegido' : ''}${despachable ? '' : ' et-pedido--bloqueado'}`}
                                    >
                                        <div className="et-fila">
                                            <div className="et-marca">
                                                {!despachable
                                                    ? <span className="et-espaciador" />
                                                    : isSel ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <div>
                                                <div className="et-nombre">
                                                    {fullName}
                                                </div>
                                                <div className="et-meta">
                                                    {/* El N de pedido, que es el que figura en la planilla y en
                                                        la etiqueta. Antes iba el final del ULID, que no coincide
                                                        con ningun numero que la clienta pueda ver o decir. */}
                                                    <span className="et-marca">
                                                        {c.numero != null ? `N° ${c.numero}` : `#${c.id.slice(-6)}`}
                                                    </span>
                                                    {(() => {
                                                        // La tarjeta decia "STARKEN" y "Sin comuna" en un retiro,
                                                        // porque pintaba el transporte con un valor por defecto sin
                                                        // mirar el modo. Es el mismo invento que salia impreso en la
                                                        // etiqueta, y es lo que hizo dudar a QA de si el pedido era
                                                        // un retiro o un despacho.
                                                        const e = describirEntrega(c);
                                                        if (e.esRetiro) {
                                                            return (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="et-codigo-corto">
                                                                        Retiro en local
                                                                    </span>
                                                                </>
                                                            );
                                                        }
                                                        const transColor = getShippingColor(e.transporte || 'STARKEN', shippingColors);
                                                        return (
                                                            <>
                                                                <span>•</span>
                                                                <span>{c.comuna || 'Sin comuna'}</span>
                                                                <span>•</span>
                                                                <span style={{ fontWeight: '800', color: transColor, background: `${transColor}15`, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${transColor}40`, textTransform: 'uppercase', fontSize: '10px' }}>
                                                                    {e.transporte || 'Sin transporte'}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                {/* Si no se puede despachar, se dice por qué: una fila
                                                    apagada sin explicación se lee como pantalla rota.
                                                    Si se puede, se dice si de verdad está lista — no
                                                    conviene despachar algo que todavía no se cortó. */}
                                                {!despachable ? (
                                                    <div className="et-aviso et-aviso--alerta">
                                                        {c.estado === 'CANCELADA'
                                                            ? 'Cancelada — no se despacha'
                                                            : 'Sin confirmar — la clienta todavía no acepta'}
                                                    </div>
                                                ) : c.modo_entrega === 'RETIRO' ? (
                                                    <div className="et-aviso et-aviso--info">
                                                        Retiro en el local — se marca al entregarla
                                                        {confeccion.texto ? ` · ${confeccion.texto}` : ''}
                                                    </div>
                                                ) : confeccion.texto && (
                                                    <div className="et-aviso" style={{ color: TONOS[confeccion.tono].color }}>
                                                        {confeccion.texto}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* COPIAS */}
                                        {isSel && (
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                className="et-contador"
                                            >
                                                <button
                                                    onClick={() => updateCopies(c.id, -1)}

 >-
                                                </button>
                                                <span className="et-contador-valor">{copies}</span>
                                                <button
                                                    onClick={() => updateCopies(c.id, 1)}

 >+
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* PANEL DERECHO: CONFIGURACIÓN DE HOJA / TINTA + VISTA PREVIA */}
                <div className="et-panel-vista">

                    {/* BARRA DE HERRAMIENTAS DE AHORRO */}
                    <div className="et-barra-opciones">

                        {/* FORMATO Y PAPEL */}
                        <div className="et-bloque--ancho">
                            <label className="et-rotulo--grande" htmlFor="et-formato">
                                <LayoutGrid size={14} /> Formato / Disposición de Hoja
                            </label>
                            <div className="et-fila-campos">
                                <select
                                    id="et-formato"
                                    value={formatKey}
                                    onChange={(e) => setFormatKey(e.target.value)}
                                    className="et-campo"
                                >
                                    {Object.entries(FORMATOS).map(([k, v]) => (
                                        <option key={k} value={k}>{v.nombre}</option>
                                    ))}
                                </select>
                                {/* El papel solo importa en una hoja: un rollo ya
                                    trae su medida. */}
                                {usaPapel(formatKey) && (
                                    <select
                                        aria-label="Papel"
                                        value={papelKey}
                                        onChange={(e) => setPapelKey(e.target.value)}
                                        className="et-campo et-campo--papel"
                                    >
                                        {Object.entries(PAPELES).map(([k, v]) => (
                                            <option key={k} value={k}>{v.nombre}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <span className="et-ok">{describirMedida(medidas)}</span>
                        </div>

                        {/* SELECTOR DE MODO DE TINTA */}
                        <div className="et-bloque">
                            <label className="et-rotulo--grande">
                                <Zap size={14} /> Consumo de Tinta
                            </label>
                            <div className="et-fila-botones">
                                <button
                                    onClick={() => setInkMode('eco')}
                                    className={`et-tinta et-tinta--eco${inkMode === 'eco' ? ' et-tinta--activa' : ''}`}
                                >
                                    ⚡ Eco
                                </button>
                                <button
                                    onClick={() => setInkMode('standard')}
                                    className={`et-tinta et-tinta--estandar${inkMode === 'standard' ? ' et-tinta--activa' : ''}`}
                                >
                                    🎨 Estándar
                                </button>
                            </div>
                        </div>

                        {/* OPCIONES DE CÓDIGO DE BARRAS Y CORTE */}
                        <div className="et-bloque--doble">
                            <label className="et-rotulo--suelto">
                                <Settings2 size={14} /> Elementos en Etiqueta
                            </label>
                            <div className="et-fila-opciones">
                                <label className="et-opcion">
                                    <input
                                        type="checkbox"
                                        checked={showBarcode}
                                        onChange={(e) => setShowBarcode(e.target.checked)}
                                        className="et-casilla"
                                    />
                                    Código de Barras
                                </label>
                                {showBarcode && (
                                    <select
                                        value={barcodeSize}
                                        onChange={(e) => setBarcodeSize(e.target.value)}
                                        className="et-campo-corto"
                                    >
                                        <option value="micro">📏 Súper Pequeño (Micro)</option>
                                        <option value="compact">📐 Pequeño / Compacto (Recomendado)</option>
                                        <option value="standard">📏 Normal / Estándar</option>
                                    </select>
                                )}
                                <label className="et-opcion">
                                    <input
                                        type="checkbox"
                                        checked={showCutLines}
                                        onChange={(e) => setShowCutLines(e.target.checked)}
                                        className="et-casilla"
                                    />
                                    Líneas de Corte
                                </label>
                                <label className="et-opcion" title="Muestra el recuadro del transporte siempre con su color distintivo, independientemente de si eliges Eco B&N o Estándar">
                                    <input
                                        type="checkbox"
                                        checked={showTransportColor}
                                        onChange={(e) => setShowTransportColor(e.target.checked)}
                                        className="et-casilla"
                                    />
                                    🎨 Destacar Transporte en Color
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* ÁREA DE VISTA PREVIA: las páginas tal como se imprimen */}
                    <div className="et-vista" ref={vistaRef}>
                        {totalCopies === 0 ? (
                            /* Sin pedidos marcados se dibuja la silueta de la hoja con
                               sus casillas: se ve cuántas etiquetas entran en el formato
                               elegido, que es la decisión que se toma en esta pantalla. */
                            <div className="et-hoja-vacia">
                                <div
                                    className="et-hoja-silueta"
                                    style={{
                                        '--silueta-cols': medidas.cols,
                                        '--silueta-filas': medidas.filas,
                                        '--silueta-aspecto': medidas.altoMm ? `${medidas.anchoMm} / ${medidas.altoMm}` : '1 / 1.5',
                                    }}
                                >
                                    {Array.from({ length: slotsPerPage }).map((_, i) => (
                                        <div key={i} className="et-hoja-celda">
                                            <Package size={18} />
                                        </div>
                                    ))}
                                </div>
                                <h3 className="et-vacio-titulo">Todavía no hay nada que imprimir</h3>
                                <p className="et-subtitulo">
                                    Marca los pedidos de la izquierda y aparecerán acá, tal como saldrán en la hoja.
                                </p>
                            </div>
                        ) : (
                            pages.map((pageSlots, pageIdx) => (
                                <div key={pageIdx} className="et-hoja-marco">
                                    <div className="et-etiqueta-pie">
                                        <span>Hoja {pageIdx + 1} de {pages.length}</span>
                                    </div>
                                    <EncuadrePagina>
                                        <PaginaEtiquetas geometria={medidas}>
                                            {pageSlots.map((slot, sIdx) => (
                                                <EtiquetaEnvio
                                                    key={`${slot.coti.id}-${slot.index}-${sIdx}`}
                                                    cotizacion={slot.coti}
                                                    persona={slot.cliente}
                                                    tinta={inkMode}
                                                    conCorte={showCutLines}
                                                    continua={!medidas.altoMm}
                                                    codigo={codigo}
                                                    conColorTransporte={showTransportColor}
                                                    coloresTransporte={shippingColors}
                                                />
                                            ))}
                                        </PaginaEtiquetas>
                                    </EncuadrePagina>
                                </div>
                            ))
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
};

export default ShippingLabelPrinter;
