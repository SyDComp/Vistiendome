import React, { useState, useEffect, useRef, useMemo } from 'react';
import { describirEntrega } from '../../../../utils/entrega';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './ShippingLabelPrinter.css';
import './ShippingLabelPrinter.parte.css';
import {
    Printer, Search, CheckSquare, Square, Package, Settings2, RefreshCw,
    Maximize2, Info, FileText, LayoutGrid, Zap, Sparkles, User, Phone,
    MapPin, Truck, Mail, ArrowLeft, Scissors, Check
} from 'lucide-react';
import Barcode from 'react-barcode';
import Button from '../../../ui/Button';
import { useSettings } from '../../../../context/SettingsContext';
import { getShippingColor } from '../../../../utils/shippingColors';
import { actualizarEstadoCotizacion } from '../../../../lib/api/endpoints';
import { useNotification } from '../../../../context/NotificationContext';
import { estadoDeProduccion, TONOS } from '../../../../utils/produccion';
import { imprimirDocumento } from '../../../../utils/impresion';
import estilosImpresion from './ShippingLabelPrinter.impresion.css?raw';
import { useHasta } from '../../../../hooks/useCorte';
import { formatearTelefono } from '../../../../utils/telefono';

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

// Formatos de disposición de papel/rollo
const LABEL_FORMATS = {
    // `paddingMm`: el mismo margen que usa el formato correspondiente en la
    // hoja de impresion real (ShippingLabelPrinter.impresion.css:
    // .print-page-wrapper 8mm, .format-thermal-* 3mm, .format-a4-full 10mm).
    // Se repite aca -no se importa el CSS de impresion en esta pantalla, y
    // convertirlo a texto para leerlo seria mas fragil que declararlo una vez
    // mas- para que la vista previa reserve el mismo aire que va a tener el
    // papel real. Antes el padding de pantalla era un 1.5rem fijo para
    // cualquier formato: le achicaba a los rollos termicos el espacio real de
    // texto que si tienen en papel (24px de margen en pantalla contra 3mm
    // ~11px en el rollo real), lo que corria el riesgo de recortar contenido
    // que en papel entra perfecto.
    'a4_2x2': {
        name: 'Hoja A4 / Carta - 4 por Hoja (2×2)',
        subtitle: 'Ahorro 75% Papel • Aprox. 10.5 × 14.8 cm (A6)',
        cols: 2,
        rows: 2,
        pageClass: 'format-a4-grid cols-2 rows-2',
        width: '105mm',
        height: '148mm',
        paddingMm: 8
    },
    'a4_1x2': {
        name: 'Hoja A4 / Carta - 2 por Hoja (1×2)',
        subtitle: 'Ahorro 50% Papel • Aprox. 21 × 14.8 cm (Media Carta/A5)',
        cols: 1,
        rows: 2,
        pageClass: 'format-a4-grid cols-1 rows-2',
        width: '210mm',
        height: '148mm',
        paddingMm: 8
    },
    'a4_2x3': {
        name: 'Hoja A4 / Carta - 6 por Hoja (2×3)',
        subtitle: 'Ahorro 83% Papel • Aprox. 10.5 × 9.8 cm (Compacto)',
        cols: 2,
        rows: 3,
        pageClass: 'format-a4-grid cols-2 rows-3',
        width: '105mm',
        height: '98mm',
        paddingMm: 8
    },
    'thermal_100x150': {
        name: 'Rollo Térmico Courier (100 × 150 mm)',
        subtitle: 'Estándar Starken / BlueExpress / Chilexpress (4×6")',
        cols: 1,
        rows: 1,
        pageClass: 'format-thermal-100x150',
        width: '100mm',
        height: '150mm',
        paddingMm: 3
    },
    'thermal_80mm': {
        name: 'Rollo Térmico Ticketera POS (80 mm)',
        subtitle: 'Impresora de boletas / Tira continua',
        cols: 1,
        rows: 1,
        pageClass: 'format-thermal-80mm',
        width: '80mm',
        height: 'auto',
        paddingMm: 3
    },
    'a4_full': {
        name: 'Hoja Completa A4 / Carta (1 por Hoja)',
        subtitle: 'Formato clásico página entera',
        cols: 1,
        rows: 1,
        pageClass: 'format-a4-full',
        width: '210mm',
        height: '297mm',
        paddingMm: 10
    }
};

const getBarcodeProps = (val, size) => {
    const len = val ? val.length : 10;
    if (size === 'micro') {
        return { width: len > 20 ? 0.45 : 0.65, height: 16 };
    }
    if (size === 'standard') {
        return { width: len > 20 ? 0.95 : 1.4, height: 32 };
    }
    // compact (default)
    return { width: len > 20 ? 0.65 : 0.95, height: 22 };
};

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
    const [formatKey, setFormatKey] = useState('a4_2x2');
    const [inkMode, setInkMode] = useState('eco'); // 'eco' | 'standard'
    const [showBarcode, setShowBarcode] = useState(true);
    const [barcodeSize, setBarcodeSize] = useState('compact'); // 'micro' | 'compact' | 'standard'
    const [showCutLines, setShowCutLines] = useState(true);
    const [showTransportColor, setShowTransportColor] = useState(true);
    const isMobile = useHasta('lg');
    // Los controles y la hoja de etiquetas dejan de caber lado a lado antes de
    // llegar al telefono, y por eso este corte es aparte.
    const isStacked = useHasta('2xl');

    const printContainerRef = useRef(null);

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
            const name = cli ? `${cli.nombres || ''} ${cli.apellidos || ''}`.toLowerCase() : '';
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

    // Paginación en hojas para formatos A4/Carta
    const formatCfg = LABEL_FORMATS[formatKey] || LABEL_FORMATS['a4_2x2'];
    const slotsPerPage = formatCfg.cols * formatCfg.rows;

    // EL TAMAÑO DE LA HOJA EN PANTALLA, SACADO DEL FORMATO REAL.
    //
    // Antes el marco de la vista previa tenia un ancho fijo que solo distinguia
    // "es A4" de "no es A4": los dos rollos termicos -100x150mm y 80mm, de
    // proporciones bien distintas- caian en el mismo caso y salian del mismo
    // tamaño. Cambiar de uno a otro no cambiaba nada en pantalla.
    //
    // Por que alcanza con el ancho/alto real, sin inventar una ampliacion: el
    // texto de la etiqueta en pantalla ya usa los mismos tamaños en px que la
    // hoja de impresion real (10.brand-title: 14px alla y en .et-etiqueta-titulo
    // 0.875rem = 14px aca, por ejemplo). El texto fue pensado para el tamaño
    // fisico del papel, asi que si el contenedor mide lo que el papel mide de
    // verdad -a 96dpi, el estandar de CSS: 1 pulgada = 25.4mm = 96px- el
    // contenido encaja solo, sin recortarse.
    const PX_POR_MM = 96 / 25.4;
    const anchoFormatoMm = parseFloat(formatCfg.width) || 100;
    const altoFormatoMm = formatCfg.height === 'auto' ? null : (parseFloat(formatCfg.height) || null);
    const hojaEstiloVars = {
        '--hoja-max': `${(anchoFormatoMm * PX_POR_MM).toFixed(1)}px`,
        // Sin alto real -la ticketera de 80mm es una tira continua, su largo
        // lo decide el contenido- no se fuerza proporcion: el alto lo sigue
        // dando el contenido, como hoy.
        '--hoja-aspecto': altoFormatoMm ? `${anchoFormatoMm} / ${altoFormatoMm}` : 'auto',
        '--hoja-padding': `${((formatCfg.paddingMm ?? 8) * PX_POR_MM).toFixed(1)}px`,
    };

    const pages = useMemo(() => {
        if (slotsPerPage === 1) {
            return previewSlots.map(slot => [slot]);
        }
        const result = [];
        for (let i = 0; i < previewSlots.length; i += slotsPerPage) {
            result.push(previewSlots.slice(i, i + slotsPerPage));
        }
        return result;
    }, [previewSlots, slotsPerPage]);

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
            pendientes.map(c => actualizarEstadoCotizacion(c.id, 'DESPACHADA'))
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
        // Volver a CONFIRMADA borra los movimientos de venta: el gancho de
        // stock revierte al salir de DESPACHADA. No queda rastro contable.
        const r = await Promise.allSettled(ids.map(id => actualizarEstadoCotizacion(id, 'CONFIRMADA')));
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
        const printContent = printContainerRef.current?.innerHTML;
        if (!printContent) return;

        // Se marca despues de comprobar que la ventana abrio: si el navegador
        // bloqueo el pop-up no se imprimio nada, y no corresponde dar por
        // despachado un pedido cuya etiqueta nunca salio.
        const seImprimio = imprimirDocumento({
            titulo: 'Etiquetas de Envío - Vistiendome',
            cuerpo: printContent,
            estilos: estilosImpresion,
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
                                const fullName = cli ? `${cli.nombres || ''} ${cli.apellidos || ''}`.trim() : 'Cliente sin registro';
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

                        {/* SELECTOR DE FORMATO DE PAPEL */}
                        <div className="et-bloque--ancho">
                            <label className="et-rotulo--grande">
                                <LayoutGrid size={14} /> Formato / Disposición de Hoja
                            </label>
                            <select
                                value={formatKey}
                                onChange={(e) => setFormatKey(e.target.value)}
                                className="et-campo"
                            >
                                {Object.entries(LABEL_FORMATS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.name}</option>
                                ))}
                            </select>
                            <span className="et-ok">
                                ✨ {LABEL_FORMATS[formatKey]?.subtitle}
                            </span>
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

                    {/* ÁREA DE VISTA PREVIA */}
                    <div className="et-vista">
                        {totalCopies === 0 ? (
                            /* El hueco de la vista previa es enorme y estaba ocupado por
                               una cajita perdida en medio del gris. Ahora se dibuja la
                               HOJA que se va a imprimir, con sus casillas: se ve de una
                               cuantas etiquetas entran en el formato elegido, que es
                               justo la decision que se esta tomando en esa pantalla. */
                            <div className="et-hoja-vacia">
                                <div className="et-hoja-silueta">
                                    {Array.from({ length: 4 }).map((_, i) => (
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
                                <div key={pageIdx} className="et-hoja-marco" style={hojaEstiloVars}>
                                    <div className="et-etiqueta-pie">
                                        <span>Hoja {pageIdx + 1} de {pages.length}</span>
                                    </div>

                                    {/* HOJA SIMULADA EN PANTALLA */}
                                    <div className="et-hoja" style={{ '--columnas': formatCfg.cols }}>
                                        {pageSlots.map((slot, sIdx) => {
                                            const coti = slot.coti;
                                            const cli = slot.cliente;
                                            const entrega = describirEntrega(coti);
                                            const fullName = cli ? `${cli.nombres || ''} ${cli.apellidos || ''}`.trim() : 'Destinatario';
                                            const barcodeVal = coti.id ? `COTI-${coti.id}` : 'COTI-0000';
                                            const scaleClass = formatKey === 'a4_2x3' || formatKey === 'thermal_80mm' ? 'scale-compact' : formatKey === 'a4_full' ? 'scale-large' : '';

                                            return (
                                                <div
                                                    key={`${coti.id}-${slot.index}-${sIdx}`}
                                                    className={`et-etiqueta${showCutLines ? ' et-etiqueta--con-corte' : ''} mode-${inkMode} ${scaleClass}`}
                                                >
                                                    {/* ENCABEZADO MARCA */}
                                                    <div>
                                                        <div className="brand-box" style={{ borderBottom: inkMode === 'eco' ? '1.5px solid #000' : 'none', background: inkMode === 'standard' ? '#000' : 'transparent', color: inkMode === 'standard' ? '#fff' : '#000', padding: inkMode === 'standard' ? '8px' : '0 0 8px 0', marginBottom: '8px', textAlign: 'center', borderRadius: inkMode === 'standard' ? '4px' : '0' }}>
                                                            <div className="et-etiqueta-titulo">VISTIENDOMÉ CHILE</div>
                                                            <div style={{ fontSize: '8px', fontWeight: '700', color: inkMode === 'standard' ? '#cbd5e1' : '#4a5568', letterSpacing: '1.5px' }}>TIENDA DE MODA CRISTIANA</div>
                                                        </div>

                                                        {/* DESTINATARIO */}
                                                        <div className="et-rotulo">DESTINATARIO</div>
                                                        <div className="et-destinatario">
                                                            {fullName.toUpperCase()}
                                                        </div>

                                                        <div className="et-etiqueta-lineas">
                                                            {cli?.rut && <div><strong>RUT:</strong> {cli.rut}</div>}
                                                            {cli?.telefono && <div><strong>TEL:</strong> {formatearTelefono(cli.telefono)}</div>}
                                                            {cli?.email_personal && <div className="et-dato">{cli.email_personal}</div>}
                                                        </div>

                                                        {/* INFORMACIÓN DE DESPACHO */}
                                                        <div className="et-etiqueta-separador">
                                                            <div className="et-rotulo">
                                                                {entrega.titulo}
                                                            </div>
                                                            {entrega.transporte && (() => {
                                                                const transColor = getShippingColor(entrega.transporte, shippingColors);
                                                                return (
                                                                    <div style={{ fontSize: '11px', fontWeight: '900', border: showTransportColor ? `2px solid ${transColor}` : '1.5px solid #000', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px', background: showTransportColor ? `${transColor}15` : '#fff', color: showTransportColor ? transColor : '#000' }}>
                                                                        TRANSPORTE: {entrega.transporte.toUpperCase()}
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="et-rotulo">{entrega.etiquetaDestino}</div>
                                                            <div className="et-etiqueta-seccion">
                                                                {entrega.destino.toUpperCase()}
                                                            </div>

                                                            <div style={{ display: entrega.muestraComuna ? 'flex' : 'none', justifyContent: 'space-between', border: '1.5px solid #000', padding: '6px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '900', background: inkMode === 'standard' ? '#f8fafc' : '#fff', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
                                                                <div>
                                                                    <div className="et-dato-menudo">COMUNA</div>
                                                                    <div>{(coti.comuna || '---').toUpperCase()}</div>
                                                                </div>
                                                                <div className="et-a-la-derecha">
                                                                    <div className="et-dato-menudo">REGIÓN</div>
                                                                    <div>{(coti.region || '---').toUpperCase()}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CÓDIGO DE BARRAS INFERIOR */}
                                                    {showBarcode && (
                                                        <div className="et-etiqueta-codigo">
                                                            <div className="et-etiqueta-codigo-caja">
                                                                <Barcode
                                                                    value={barcodeVal}
                                                                    format="CODE128"
                                                                    {...getBarcodeProps(barcodeVal, barcodeSize)}
                                                                    margin={0}
                                                                    displayValue={false}
                                                                    background="transparent"
                                                                    lineColor="#000000"
                                                                />
                                                            </div>
                                                            <div className="et-codigo">
                                                                PEDIDO #{coti.id}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* CONTENEDOR OCULTO PARA IMPRESIÓN PURA */}
                    <div className="et-oculto">
                        <div ref={printContainerRef}>
                            {pages.map((pageSlots, pIdx) => (
                                <div key={pIdx} className={`print-page-wrapper ${formatCfg.pageClass}`}>
                                    {pageSlots.map((slot, sIdx) => {
                                        const coti = slot.coti;
                                        const cli = slot.cliente;
                                        const entrega = describirEntrega(coti);
                                        const fullName = cli ? `${cli.nombres || ''} ${cli.apellidos || ''}`.trim() : 'Destinatario';
                                        const barcodeVal = coti.id ? `COTI-${coti.id}` : 'COTI-0000';
                                        const scaleClass = formatKey === 'a4_2x3' || formatKey === 'thermal_80mm' ? 'scale-compact' : formatKey === 'a4_full' ? 'scale-large' : '';

                                        return (
                                            <div
                                                key={`${coti.id}-${slot.index}-${sIdx}`}
                                                className={`label-item mode-${inkMode} ${scaleClass} ${showCutLines ? 'cut-border' : ''}`}
                                            >
                                                <div>
                                                    <div className="brand-box">
                                                        <div className="brand-title">VISTIENDOMÉ CHILE</div>
                                                        <div className="brand-sub">TIENDA DE MODA CRISTIANA</div>
                                                    </div>

                                                    <div className="sec-title">DESTINATARIO</div>
                                                    <div className="recipient-name">
                                                        {fullName.toUpperCase()}
                                                    </div>

                                                    <div className="et-separacion-impresion">
                                                        {cli?.rut && <div className="info-row"><strong>RUT:</strong> {cli.rut}</div>}
                                                        {cli?.telefono && <div className="info-row"><strong>TEL:</strong> {formatearTelefono(cli.telefono)}</div>}
                                                        {cli?.email_personal && <div className="info-row">{cli.email_personal}</div>}
                                                    </div>

                                                    <div className="address-box">
                                                        <div className="sec-title">{entrega.titulo}</div>
                                                        {entrega.transporte && (() => {
                                                            const transColor = getShippingColor(entrega.transporte, shippingColors);
                                                            return (
                                                                <div className="transport-tag" style={showTransportColor ? { borderColor: transColor, backgroundColor: `${transColor}15`, color: transColor } : { borderColor: '#000', backgroundColor: '#fff', color: '#000' }}>
                                                                    TRANSPORTE: {entrega.transporte.toUpperCase()}
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="sec-title">{entrega.etiquetaDestino}</div>
                                                        <div className="main-address">
                                                            {entrega.destino.toUpperCase()}
                                                        </div>

                                                        <div className="city-box" style={{ display: entrega.muestraComuna ? undefined : 'none' }}>
                                                            <div className="city-col">
                                                                <div className="city-label">COMUNA</div>
                                                                <div className="city-val">{(coti.comuna || '---').toUpperCase()}</div>
                                                            </div>
                                                            <div className="city-col">
                                                                <div className="city-label">REGIÓN</div>
                                                                <div className="city-val">{(coti.region || '---').toUpperCase()}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {showBarcode && (
                                                    <div className="barcode-box">
                                                        <div className="et-etiqueta-codigo-caja">
                                                            <Barcode
                                                                value={barcodeVal}
                                                                format="CODE128"
                                                                {...getBarcodeProps(barcodeVal, barcodeSize)}
                                                                margin={0}
                                                                displayValue={false}
                                                                background="transparent"
                                                                lineColor="#000000"
                                                            />
                                                        </div>
                                                        <div className="coti-badge">PEDIDO #{coti.id}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default ShippingLabelPrinter;
