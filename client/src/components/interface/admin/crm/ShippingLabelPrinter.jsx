import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
    'a4_2x2': {
        name: 'Hoja A4 / Carta - 4 por Hoja (2×2)',
        subtitle: 'Ahorro 75% Papel • Aprox. 10.5 × 14.8 cm (A6)',
        cols: 2,
        rows: 2,
        pageClass: 'format-a4-grid cols-2',
        width: '105mm',
        height: '148mm'
    },
    'a4_1x2': {
        name: 'Hoja A4 / Carta - 2 por Hoja (1×2)',
        subtitle: 'Ahorro 50% Papel • Aprox. 21 × 14.8 cm (Media Carta/A5)',
        cols: 1,
        rows: 2,
        pageClass: 'format-a4-grid cols-1',
        width: '210mm',
        height: '148mm'
    },
    'a4_2x3': {
        name: 'Hoja A4 / Carta - 6 por Hoja (2×3)',
        subtitle: 'Ahorro 83% Papel • Aprox. 10.5 × 9.8 cm (Compacto)',
        cols: 2,
        rows: 3,
        pageClass: 'format-a4-grid cols-2 rows-3',
        width: '105mm',
        height: '98mm'
    },
    'thermal_100x150': {
        name: 'Rollo Térmico Courier (100 × 150 mm)',
        subtitle: 'Estándar Starken / BlueExpress / Chilexpress (4×6")',
        cols: 1,
        rows: 1,
        pageClass: 'format-thermal-100x150',
        width: '100mm',
        height: '150mm'
    },
    'thermal_80mm': {
        name: 'Rollo Térmico Ticketera POS (80 mm)',
        subtitle: 'Impresora de boletas / Tira continua',
        cols: 1,
        rows: 1,
        pageClass: 'format-thermal-80mm',
        width: '80mm',
        height: 'auto'
    },
    'a4_full': {
        name: 'Hoja Completa A4 / Carta (1 por Hoja)',
        subtitle: 'Formato clásico página entera',
        cols: 1,
        rows: 1,
        pageClass: 'format-a4-full',
        width: '210mm',
        height: '297mm'
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
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const isMobile = windowWidth <= 768;
    const isStacked = windowWidth <= 1160;

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            .filter(c => c && c.estado !== 'DESPACHADA');
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

        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            alert('Por favor permite las ventanas emergentes (pop-ups) en tu navegador para imprimir.');
            return;
        }

        // Se marca después de abrir la ventana: si el navegador bloquea el
        // pop-up no se imprimió nada, y no corresponde dar por despachado.
        if (marcarDespachadas) marcarComoDespachadas();

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiquetas de Envío - Vistiendome</title>
                <meta charset="utf-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
                    
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        background: #fff;
                        color: #000;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    @page {
                        margin: 0;
                        size: auto;
                    }

                    .print-page-wrapper {
                        page-break-after: always;
                        width: 100%;
                        min-height: 100vh;
                        padding: 8mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                    }

                    .print-page-wrapper:last-child {
                        page-break-after: avoid;
                    }

                    .format-a4-grid {
                        display: grid;
                        width: 100%;
                        flex: 1;
                        gap: 4mm;
                    }

                    .format-a4-grid.cols-2 { grid-template-columns: 1fr 1fr; }
                    .format-a4-grid.cols-1 { grid-template-columns: 1fr; }
                    .format-a4-grid.rows-3 { grid-template-rows: 1fr 1fr 1fr; }

                    .format-thermal-100x150 {
                        width: 100mm;
                        height: 150mm;
                        padding: 3mm;
                        page-break-after: always;
                    }
                    .format-thermal-100x150:last-child { page-break-after: avoid; }

                    .format-thermal-80mm {
                        width: 80mm;
                        padding: 3mm;
                        page-break-after: always;
                    }
                    .format-thermal-80mm:last-child { page-break-after: avoid; }

                    .format-a4-full {
                        width: 100%;
                        min-height: 100vh;
                        padding: 10mm;
                        page-break-after: always;
                    }
                    .format-a4-full:last-child { page-break-after: avoid; }

                    .label-item {
                        border: 1px solid #000;
                        border-radius: 4px;
                        padding: 4mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        overflow: hidden;
                        background: #fff;
                    }

                    .cut-border {
                        border: 1px dashed #718096 !important;
                    }

                    /* MODO ECO BLANCO Y NEGRO */
                    .mode-eco .brand-box {
                        border-bottom: 1.5px solid #000;
                        padding-bottom: 2mm;
                        margin-bottom: 2mm;
                        text-align: center;
                    }
                    .mode-eco .brand-title { font-size: 14px; font-weight: 900; letter-spacing: 0.5px; }
                    .mode-eco .brand-sub { font-size: 8px; font-weight: 700; color: #4a5568; letter-spacing: 1.5px; }

                    .mode-eco .sec-title {
                        font-size: 8px;
                        font-weight: 800;
                        color: #4a5568;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        margin-bottom: 1mm;
                        border-bottom: 1px solid #e2e8f0;
                    }

                    .mode-eco .recipient-name {
                        font-size: 16px;
                        font-weight: 900;
                        line-height: 1.1;
                        margin-bottom: 2mm;
                    }

                    .mode-eco .info-row {
                        font-size: 11px;
                        font-weight: 600;
                        margin-bottom: 1mm;
                    }

                    .mode-eco .address-box {
                        margin-top: 2mm;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 2mm;
                    }

                    .mode-eco .main-address {
                        font-size: 13px;
                        font-weight: 800;
                        margin-bottom: 1.5mm;
                    }

                    .mode-eco .city-box {
                        display: flex;
                        justify-content: space-between;
                        border: 1px solid #000;
                        padding: 1.5mm 2.5mm;
                        border-radius: 3px;
                        font-size: 12px;
                        font-weight: 900;
                    }

                    .mode-eco .transport-tag {
                        font-size: 11px;
                        font-weight: 900;
                        border: 1px solid #000;
                        padding: 1mm 2mm;
                        border-radius: 3px;
                        display: inline-block;
                        margin-bottom: 2mm;
                    }

                    /* MODO ESTÁNDAR CON RECUADROS */
                    .mode-standard .brand-box {
                        background: #000;
                        color: #fff;
                        padding: 2mm;
                        text-align: center;
                        margin: -4mm -4mm 3mm -4mm;
                    }
                    .mode-standard .brand-title { font-size: 14px; font-weight: 900; letter-spacing: 1px; }
                    .mode-standard .brand-sub { font-size: 8px; font-weight: 700; color: #cbd5e1; letter-spacing: 2px; }

                    .mode-standard .sec-title {
                        font-size: 8px;
                        font-weight: 800;
                        color: #4a5568;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        margin-bottom: 1mm;
                    }

                    .mode-standard .recipient-name {
                        font-size: 17px;
                        font-weight: 900;
                        line-height: 1.1;
                        margin-bottom: 2mm;
                    }

                    .mode-standard .info-row {
                        font-size: 11px;
                        font-weight: 600;
                        margin-bottom: 1mm;
                    }

                    .mode-standard .transport-tag {
                        background: #f1f5f9;
                        border: 1.5px solid #000;
                        padding: 1.5mm 2.5mm;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 900;
                        margin: 2mm 0;
                    }

                    .mode-standard .main-address {
                        font-size: 13px;
                        font-weight: 800;
                        margin-bottom: 2mm;
                    }

                    .mode-standard .city-box {
                        display: flex;
                        background: #f8fafc;
                        border: 1.5px solid #000;
                        border-radius: 4px;
                        overflow: hidden;
                    }

                    .mode-standard .city-col {
                        flex: 1;
                        padding: 1.5mm 2mm;
                    }
                    .mode-standard .city-col:first-child { border-right: 1.5px solid #000; }
                    .mode-standard .city-label { font-size: 7px; font-weight: 800; color: #64748b; }
                    .mode-standard .city-val { font-size: 12px; font-weight: 900; }

                    /* CÓDIGO DE BARRAS INFERIOR */
                    .barcode-box {
                        margin-top: 2mm;
                        padding-top: 1.5mm;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        overflow: hidden;
                        text-align: center;
                    }

                    .barcode-box svg, .barcode-box canvas {
                        max-width: 80% !important;
                        height: auto !important;
                        margin: 0 auto;
                        display: block;
                    }

                    .coti-badge {
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 9px;
                        font-weight: 700;
                        color: #4a5568;
                        margin-top: 1mm;
                    }

                    .scale-compact .recipient-name { font-size: 13px !important; }
                    .scale-compact .main-address { font-size: 11px !important; }
                    .scale-compact .info-row { font-size: 9.5px !important; }
                    .scale-compact .city-box { font-size: 10px !important; }

                    .scale-large .recipient-name { font-size: 24px !important; }
                    .scale-large .main-address { font-size: 18px !important; }
                    .scale-large .info-row { font-size: 14px !important; }
                    .scale-large .city-val { font-size: 16px !important; }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 400);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="shipping-label-generator-wrap" style={{ minHeight: 'calc(100dvh - 80px)', height: isMobile ? 'auto' : 'calc(100dvh - 80px)', display: 'flex', flexDirection: 'column', background: '#f8fafc', width: '100%', maxWidth: '100dvw', boxSizing: 'border-box', overflowX: 'hidden' }}>
            <style>{`
                .shipping-label-generator-wrap, .shipping-label-generator-wrap * {
                    box-sizing: border-box !important;
                }
            `}</style>
            
            {/* TOP NAVBAR */}
            <header style={{ padding: isMobile ? '12px 14px' : '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 360px', minWidth: 0 }}>
                    <button
                        onClick={() => navigate('/admin/dashboard/crm/cotizaciones')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
                    >
                        <ArrowLeft size={16} /> Volver a Cotizaciones
                    </button>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '17px' : '20px', fontWeight: '900', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Printer className="text-pink-600" size={isMobile ? 18 : 22} /> Generador de Etiquetas de Envío
                        </h1>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            Optimiza el consumo de hojas y tinta seleccionando la disposición ideal para tu impresora.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', flex: isMobile ? '1 1 100%' : '0 1 auto' }}>
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: isMobile ? 1 : 'none', height: isMobile ? '40px' : 'auto', whiteSpace: 'nowrap' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                    </Button>
                    <label
                        title="Al imprimir, los pedidos seleccionados pasan a DESPACHADA y se descuentan del stock"
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        <input
                            type="checkbox"
                            checked={marcarDespachadas}
                            onChange={e => setMarcarDespachadas(e.target.checked)}
                        />
                        Marcar como despachadas
                    </label>
                    <Button
                        variant="primary"
                        onClick={handlePrint}
                        disabled={totalCopies === 0}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#8f0653', color: '#fff', padding: isMobile ? '10px 14px' : '10px 20px', borderRadius: '12px', fontWeight: '800', flex: isMobile ? 2 : 'none', height: isMobile ? '40px' : 'auto', whiteSpace: 'nowrap' }}
                    >
                        <Printer size={16} /> Imprimir {totalCopies} {totalCopies === 1 ? 'Etiqueta' : 'Etiquetas'}
                    </Button>
                </div>
            </header>

            {ultimoDespacho && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                    padding: '9px 16px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe',
                    fontSize: '12px', color: '#5b21b6', fontWeight: '700',
                }}>
                    <span>
                        {ultimoDespacho.length === 1
                            ? 'Se marcó 1 pedido como despachado y se descontó del stock.'
                            : `Se marcaron ${ultimoDespacho.length} pedidos como despachados y se descontaron del stock.`}
                    </span>
                    <button
                        type="button"
                        onClick={deshacerDespacho}
                        style={{ background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                        Deshacer
                    </button>
                    <button
                        type="button"
                        onClick={() => setUltimoDespacho(null)}
                        style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                        Entendido
                    </button>
                </div>
            )}

            {/* SPLIT PANEL CONTENT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: isStacked ? 'column' : 'row', overflow: isStacked ? 'auto' : 'hidden', width: '100%', boxSizing: 'border-box' }}>
                
                {/* PANEL IZQUIERDO: SELECCIÓN DE PEDIDOS / COTIZACIONES */}
                <div style={{ width: isStacked ? '100%' : '310px', minWidth: isStacked ? '100%' : '310px', maxWidth: isStacked ? '100%' : '310px', maxHeight: isStacked ? '42dvh' : 'none', flexShrink: 0, background: '#fff', borderRight: isStacked ? 'none' : '1px solid #e2e8f0', borderBottom: isStacked ? '2px solid #cbd5e1' : 'none', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h2 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                Seleccionar ({Object.keys(selected).length})
                            </h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={selectAllFiltered}
                                    style={{ fontSize: '11px', fontWeight: '700', color: '#8f0653', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Todos
                                </button>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <button
                                    onClick={clearSelection}
                                    style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
                                        style={{
                                            border: `1.5px solid ${activa ? '#8f0653' : '#e2e8f0'}`,
                                            background: activa ? '#8f0653' : '#fff',
                                            color: activa ? '#fff' : '#475569',
                                            borderRadius: '20px', padding: '4px 11px', cursor: 'pointer',
                                            fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {v.etiqueta} ({n})
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
                            {VISTAS[vista].detalle}
                        </p>

                        <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Buscar cliente, RUT, ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%', height: '30px', paddingLeft: '26px', paddingRight: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', outline: 'none', boxSizing: 'border-box', color: '#1e293b' }}
                            />
                        </div>
                    </div>

                    {/* LISTA DE COTIZACIONES */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
                                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                                Cargando cotizaciones...
                            </div>
                        ) : filteredCotizaciones.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>
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
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: `1.5px solid ${isSel ? '#8f0653' : '#e2e8f0'}`,
                                            background: isSel ? '#fdf2f8' : '#fff',
                                            cursor: despachable ? 'pointer' : 'default',
                                            opacity: despachable ? 1 : 0.6,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s',
                                            boxShadow: isSel ? '0 4px 12px -2px rgba(143,6,83,0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ color: isSel ? '#8f0653' : '#cbd5e1' }}>
                                                {!despachable
                                                    ? <span style={{ width: 18, display: 'inline-block' }} />
                                                    : isSel ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e1b4b', marginBottom: '2px' }}>
                                                    {fullName}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '700', color: '#8f0653' }}>#{c.id.slice(-6)}</span>
                                                    <span>•</span>
                                                    <span>{c.comuna || 'Sin comuna'}</span>
                                                    <span>•</span>
                                                    {(() => {
                                                        const transColor = getShippingColor(c.transporte || 'STARKEN', shippingColors);
                                                        return (
                                                            <span style={{ fontWeight: '800', color: transColor, background: `${transColor}15`, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${transColor}40`, textTransform: 'uppercase', fontSize: '10px' }}>
                                                                {c.transporte || 'Starken'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                {/* Si no se puede despachar, se dice por qué: una fila
                                                    apagada sin explicación se lee como pantalla rota.
                                                    Si se puede, se dice si de verdad está lista — no
                                                    conviene despachar algo que todavía no se cortó. */}
                                                {!despachable ? (
                                                    <div style={{ fontSize: '10.5px', color: '#b91c1c', marginTop: '3px', fontWeight: '700' }}>
                                                        {c.estado === 'CANCELADA'
                                                            ? 'Cancelada — no se despacha'
                                                            : 'Sin confirmar — la clienta todavía no acepta'}
                                                    </div>
                                                ) : confeccion.texto && (
                                                    <div style={{ fontSize: '10.5px', color: TONOS[confeccion.tono].color, marginTop: '3px', fontWeight: '700' }}>
                                                        {confeccion.texto}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* COPIAS */}
                                        {isSel && (
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}
                                            >
                                                <button
                                                    onClick={() => updateCopies(c.id, -1)}
                                                    style={{ width: '26px', height: '26px', border: 'none', background: '#f8fafc', fontWeight: '800', cursor: 'pointer', color: '#475569' }}
                                                >-
                                                </button>
                                                <span style={{ width: '28px', textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#1e1b4b' }}>{copies}</span>
                                                <button
                                                    onClick={() => updateCopies(c.id, 1)}
                                                    style={{ width: '26px', height: '26px', border: 'none', background: '#f8fafc', fontWeight: '800', cursor: 'pointer', color: '#475569' }}
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isStacked ? 'visible' : 'hidden', background: '#f1f5f9', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                    
                    {/* BARRA DE HERRAMIENTAS DE AHORRO */}
                    <div style={{ padding: isMobile ? '14px 12px' : '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', boxSizing: 'border-box', width: '100%' }}>
                        
                        {/* SELECTOR DE FORMATO DE PAPEL */}
                        <div style={{ flex: '1 1 250px', minWidth: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                                <LayoutGrid size={14} /> Formato / Disposición de Hoja
                            </label>
                            <select
                                value={formatKey}
                                onChange={(e) => setFormatKey(e.target.value)}
                                style={{ width: '100%', height: '38px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', fontWeight: '700', color: '#1e1b4b', background: '#fff', boxSizing: 'border-box' }}
                            >
                                {Object.entries(LABEL_FORMATS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.name}</option>
                                ))}
                            </select>
                            <span style={{ display: 'block', fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '4px' }}>
                                ✨ {LABEL_FORMATS[formatKey]?.subtitle}
                            </span>
                        </div>

                        {/* SELECTOR DE MODO DE TINTA */}
                        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                                <Zap size={14} /> Consumo de Tinta
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setInkMode('eco')}
                                    style={{ flex: 1, height: '38px', borderRadius: '10px', border: `1.5px solid ${inkMode === 'eco' ? '#059669' : '#cbd5e1'}`, background: inkMode === 'eco' ? '#ecfdf5' : '#fff', color: inkMode === 'eco' ? '#065f46' : '#475569', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    ⚡ Eco
                                </button>
                                <button
                                    onClick={() => setInkMode('standard')}
                                    style={{ flex: 1, height: '38px', borderRadius: '10px', border: `1.5px solid ${inkMode === 'standard' ? '#8f0653' : '#cbd5e1'}`, background: inkMode === 'standard' ? '#fdf2f8' : '#fff', color: inkMode === 'standard' ? '#8f0653' : '#475569', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    🎨 Estándar
                                </button>
                            </div>
                        </div>

                        {/* OPCIONES DE CÓDIGO DE BARRAS Y CORTE */}
                        <div style={{ flex: '2 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                                <Settings2 size={14} /> Elementos en Etiqueta
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={showBarcode}
                                        onChange={(e) => setShowBarcode(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#8f0653' }}
                                    />
                                    Código de Barras
                                </label>
                                {showBarcode && (
                                    <select
                                        value={barcodeSize}
                                        onChange={(e) => setBarcodeSize(e.target.value)}
                                        style={{ height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '11px', fontWeight: '700', color: '#8f0653', background: '#fdf2f8', cursor: 'pointer', outline: 'none' }}
                                    >
                                        <option value="micro">📏 Súper Pequeño (Micro)</option>
                                        <option value="compact">📐 Pequeño / Compacto (Recomendado)</option>
                                        <option value="standard">📏 Normal / Estándar</option>
                                    </select>
                                )}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={showCutLines}
                                        onChange={(e) => setShowCutLines(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#8f0653' }}
                                    />
                                    Líneas de Corte
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer' }} title="Muestra el recuadro del transporte siempre con su color distintivo, independientemente de si eliges Eco B&N o Estándar">
                                    <input
                                        type="checkbox"
                                        checked={showTransportColor}
                                        onChange={(e) => setShowTransportColor(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#8f0653' }}
                                    />
                                    🎨 Destacar Transporte en Color
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* ÁREA DE VISTA PREVIA */}
                    <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', overflowX: 'auto', padding: isMobile ? '16px 10px' : '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '20px' : '32px', width: '100%', boxSizing: 'border-box' }}>
                        {totalCopies === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1', maxWidth: '400px', margin: 'auto' }}>
                                <Package size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px auto' }} />
                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#334155', margin: '0 0 6px 0' }}>No has seleccionado ningún pedido</h3>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    Marca las casillas de la columna izquierda para ver la vista previa.
                                </p>
                            </div>
                        ) : (
                            pages.map((pageSlots, pageIdx) => (
                                <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', maxWidth: formatKey.startsWith('a4_') ? '820px' : '440px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                                        <span>Hoja {pageIdx + 1} de {pages.length}</span>
                                    </div>

                                    {/* HOJA SIMULADA EN PANTALLA */}
                                    <div
                                        style={{
                                            width: '100%',
                                            maxWidth: '100%',
                                            background: '#fff',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                            padding: isMobile ? '14px' : '24px',
                                            border: '1px solid #cbd5e1',
                                            display: 'grid',
                                            gridTemplateColumns: (isMobile && formatCfg.cols > 1) ? '1fr' : (formatCfg.cols === 2 ? '1fr 1fr' : '1fr'),
                                            gap: isMobile ? '12px' : '16px',
                                            boxSizing: 'border-box',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {pageSlots.map((slot, sIdx) => {
                                            const coti = slot.coti;
                                            const cli = slot.cliente;
                                            const fullName = cli ? `${cli.nombres || ''} ${cli.apellidos || ''}`.trim() : 'Destinatario';
                                            const barcodeVal = coti.id ? `COTI-${coti.id}` : 'COTI-0000';
                                            const scaleClass = formatKey === 'a4_2x3' || formatKey === 'thermal_80mm' ? 'scale-compact' : formatKey === 'a4_full' ? 'scale-large' : '';

                                            return (
                                                <div
                                                    key={`${coti.id}-${slot.index}-${sIdx}`}
                                                    className={`mode-${inkMode} ${scaleClass}`}
                                                    style={{
                                                        border: showCutLines ? '1.5px dashed #94a3b8' : '1.5px solid #000',
                                                        borderRadius: '8px',
                                                        padding: isMobile ? '12px' : '16px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        background: '#fff',
                                                        position: 'relative',
                                                        width: '100%',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {/* ENCABEZADO MARCA */}
                                                    <div>
                                                        <div className="brand-box" style={{ borderBottom: inkMode === 'eco' ? '1.5px solid #000' : 'none', background: inkMode === 'standard' ? '#000' : 'transparent', color: inkMode === 'standard' ? '#fff' : '#000', padding: inkMode === 'standard' ? '8px' : '0 0 8px 0', marginBottom: '8px', textAlign: 'center', borderRadius: inkMode === 'standard' ? '4px' : '0' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.5px' }}>VISTIÉNDOME CHILE</div>
                                                            <div style={{ fontSize: '8px', fontWeight: '700', color: inkMode === 'standard' ? '#cbd5e1' : '#4a5568', letterSpacing: '1.5px' }}>TIENDA DE MODA CRISTIANA</div>
                                                        </div>

                                                        {/* DESTINATARIO */}
                                                        <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>DESTINATARIO</div>
                                                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#000', lineHeight: '1.1', marginBottom: '8px' }}>
                                                            {fullName.toUpperCase()}
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', fontSize: '11px', fontWeight: '600' }}>
                                                            {cli?.rut && <div><strong>RUT:</strong> {cli.rut}</div>}
                                                            {cli?.telefono && <div><strong>TEL:</strong> {cli.telefono}</div>}
                                                            {cli?.email_personal && <div style={{ fontSize: '11px', color: '#475569' }}>{cli.email_personal}</div>}
                                                        </div>

                                                        {/* INFORMACIÓN DE DESPACHO */}
                                                        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                                                            <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                DESPACHO • {coti.tipo_despacho === 'SUCURSAL' ? 'RETIRO SUCURSAL' : 'A DOMICILIO'}
                                                            </div>
                                                            {(() => {
                                                                const transColor = getShippingColor(coti.transporte || 'STARKEN', shippingColors);
                                                                return (
                                                                    <div style={{ fontSize: '11px', fontWeight: '900', border: showTransportColor ? `2px solid ${transColor}` : '1.5px solid #000', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px', background: showTransportColor ? `${transColor}15` : '#fff', color: showTransportColor ? transColor : '#000' }}>
                                                                        TRANSPORTE: {(coti.transporte || 'STARKEN').toUpperCase()}
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>DIRECCIÓN</div>
                                                            <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: '#000' }}>
                                                                {(coti.direccion || 'POR CONFIRMAR / SUCURSAL').toUpperCase()}
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', border: '1.5px solid #000', padding: '6px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '900', background: inkMode === 'standard' ? '#f8fafc' : '#fff', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '7px', color: '#64748b' }}>COMUNA</div>
                                                                    <div>{(coti.comuna || '---').toUpperCase()}</div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '7px', color: '#64748b' }}>REGIÓN</div>
                                                                    <div>{(coti.region || '---').toUpperCase()}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CÓDIGO DE BARRAS INFERIOR */}
                                                    {showBarcode && (
                                                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                                                            <div style={{ maxWidth: '85%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
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
                                                            <div style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: '700', color: '#4a5568', marginTop: '3px' }}>
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
                    <div style={{ display: 'none' }}>
                        <div ref={printContainerRef}>
                            {pages.map((pageSlots, pIdx) => (
                                <div key={pIdx} className={`print-page-wrapper ${formatCfg.pageClass}`}>
                                    {pageSlots.map((slot, sIdx) => {
                                        const coti = slot.coti;
                                        const cli = slot.cliente;
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
                                                        <div className="brand-title">VISTIÉNDOME CHILE</div>
                                                        <div className="brand-sub">TIENDA DE MODA CRISTIANA</div>
                                                    </div>

                                                    <div className="sec-title">DESTINATARIO</div>
                                                    <div className="recipient-name">
                                                        {fullName.toUpperCase()}
                                                    </div>

                                                    <div style={{ marginBottom: '4mm' }}>
                                                        {cli?.rut && <div className="info-row"><strong>RUT:</strong> {cli.rut}</div>}
                                                        {cli?.telefono && <div className="info-row"><strong>TEL:</strong> {cli.telefono}</div>}
                                                        {cli?.email_personal && <div className="info-row">{cli.email_personal}</div>}
                                                    </div>

                                                    <div className="address-box">
                                                        <div className="sec-title">DESPACHO • {coti.tipo_despacho === 'SUCURSAL' ? 'RETIRO SUCURSAL' : 'A DOMICILIO'}</div>
                                                        {(() => {
                                                            const transColor = getShippingColor(coti.transporte || 'STARKEN', shippingColors);
                                                            return (
                                                                <div className="transport-tag" style={showTransportColor ? { borderColor: transColor, backgroundColor: `${transColor}15`, color: transColor } : { borderColor: '#000', backgroundColor: '#fff', color: '#000' }}>
                                                                    TRANSPORTE: {(coti.transporte || 'STARKEN').toUpperCase()}
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="sec-title" style={{ marginTop: '2mm' }}>DIRECCIÓN</div>
                                                        <div className="main-address">
                                                            {(coti.direccion || 'POR CONFIRMAR / SUCURSAL').toUpperCase()}
                                                        </div>

                                                        <div className="city-box">
                                                            <div className="city-col" style={{ flex: 1 }}>
                                                                <div className="city-label">COMUNA</div>
                                                                <div className="city-val">{(coti.comuna || '---').toUpperCase()}</div>
                                                            </div>
                                                            <div className="city-col" style={{ flex: 1 }}>
                                                                <div className="city-label">REGIÓN</div>
                                                                <div className="city-val">{(coti.region || '---').toUpperCase()}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {showBarcode && (
                                                    <div className="barcode-box">
                                                        <div style={{ maxWidth: '85%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
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
