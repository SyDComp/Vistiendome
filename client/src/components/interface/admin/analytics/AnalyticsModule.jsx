import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Eye, MousePointerClick, Search, ShoppingCart, MessageCircle, AlertTriangle, Clock, Calendar, X, ExternalLink, Pencil, SlidersHorizontal } from 'lucide-react';
import { get } from '../../../../lib/api/client';
import { getImageUrl } from '../../../../lib/api/endpoints';
import TimeSeriesChart from './TimeSeriesChart';
import './AnalyticsModule.css';

const CHART_METRICS = [
    { key: 'views', label: 'Vistas', color: '#3b82f6' },
    { key: 'clicks', label: 'Clicks', color: '#8f0653' },
    { key: 'searches', label: 'Búsquedas', color: '#d97706' },
    { key: 'add_to_cart', label: 'Al carrito', color: '#059669' },
    { key: 'checkout_whatsapp', label: 'WhatsApp', color: '#16a34a' },
];

const AnalyticsModule = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [chartMetric, setChartMetric] = useState('views');
    const [selectedDay, setSelectedDay] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setSelectedDay(null);
        Promise.all([
            get(`/api/v1/analytics/summary?days=${days}`),
            get(`/api/v1/analytics/timeseries?days=${days}`),
        ])
            .then(([summary, ts]) => {
                if (!active) return;
                setData(summary);
                setSeries(ts.series || []);
            })
            .catch(err => { console.error('Error cargando estadísticas:', err); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [days]);

    const activeMetric = CHART_METRICS.find(m => m.key === chartMetric) || CHART_METRICS[0];
    const fmtDate = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    const t = data?.totals || {};
    const metrics = [
        { key: 'views', label: 'Vistas de producto', value: t.views, icon: <Eye size={18} />, color: '#3b82f6', bg: '#eff6ff' },
        { key: 'clicks', label: 'Clicks (consultas)', value: t.clicks, icon: <MousePointerClick size={18} />, color: '#8f0653', bg: '#fdf2f8' },
        { key: 'searches', label: 'Búsquedas', value: t.searches, icon: <Search size={18} />, color: '#d97706', bg: '#fef3c7' },
        { key: 'add_to_cart', label: 'Agregados al carrito', value: t.add_to_cart, icon: <ShoppingCart size={18} />, color: '#059669', bg: '#ecfdf5' },
        { key: 'checkout_whatsapp', label: 'Cierres por WhatsApp', value: t.checkout_whatsapp, icon: <MessageCircle size={18} />, color: '#16a34a', bg: '#f0fdf4' },
        { key: 'abandoned', label: 'Carritos abandonados', value: data?.abandoned_carts, icon: <AlertTriangle size={18} />, color: '#dc2626', bg: '#fef2f2' },
        { key: 'pending', label: 'Cotizaciones pendientes', value: data?.pending_quotes, icon: <Clock size={18} />, color: '#7c3aed', bg: '#f5f3ff' },
    ];

    return (
        <div className="ana">
            <header className="ana-cabecera">
                <div className="ana-cabecera-titulo">
                    <div className="ana-emblema">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h1 >Inteligencia de Negocio</h1>
                        <p >Qué miran, qué buscan y qué dejan en el camino tus clientes.</p>
                    </div>
                </div>
                <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} style={selectStyle}>
                    <option value={7}>Últimos 7 días</option>
                    <option value={30}>Últimos 30 días</option>
                    <option value={90}>Últimos 90 días</option>
                </select>
            </header>

            {loading ? (
                <div className="ana-aviso">Cargando estadísticas...</div>
            ) : !data ? (
                <div className="ana-aviso ana-aviso--vacio">Aún no hay datos suficientes para mostrar.</div>
            ) : (
                <>
                    <div className="ana-metricas">
                        {metrics.map(m => (
                            <div key={m.key} className="ana-metrica">
                                <div className="ana-metrica-cabecera">
                                    <div className="ana-metrica-icono" style={{ background: m.bg, color: m.color }}>
                                        {m.icon}
                                    </div>
                                    <span className="ana-metrica-nombre">{m.label}</span>
                                </div>
                                <div className="ana-metrica-valor">{(m.value ?? 0).toLocaleString('es-CL')}</div>
                            </div>
                        ))}
                    </div>

                    <section className="ana-panel">
                        <div className="ana-panel-cabecera">
                            <h3 className="ana-panel-titulo">Tendencia por día</h3>
                            <div className="ana-selector-metrica">
                                {CHART_METRICS.map(m => (
                                    <button
                                        key={m.key}
                                        onClick={() => setChartMetric(m.key)}
                                        style={{
                                            border: '1px solid ' + (chartMetric === m.key ? m.color : '#e2e8f0'),
                                            background: chartMetric === m.key ? m.color : '#fff',
                                            color: chartMetric === m.key ? '#fff' : '#64748b',
                                            borderRadius: '8px', padding: '6px 12px', fontSize: '12px',
                                            fontWeight: '700', cursor: 'pointer',
                                        }}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <TimeSeriesChart
                            series={series}
                            metric={chartMetric}
                            color={activeMetric.color}
                            selectedDate={selectedDay?.date}
                            onSelectDay={(d) => setSelectedDay(prev => prev?.date === d.date ? null : d)}
                        />

                        {selectedDay ? (
                            <div className="ana-dia">
                                <div className="ana-dia-titulo">
                                    <Calendar size={16} /> {fmtDate(selectedDay.date)}
                                </div>
                                <div className="ana-dia-numeros">
                                    {CHART_METRICS.map(m => (
                                        <div key={m.key} className="ana-dia-numero">
                                            <div className="ana-dia-numero-valor" style={{ color: m.color }}>{selectedDay[m.key] ?? 0}</div>
                                            <div className="ana-dia-numero-nombre">{m.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="ana-pista">
                                Haz clic en un día del gráfico para ver el detalle exacto de esa jornada.
                            </p>
                        )}
                    </section>

                    <div className="ana-listas">
                        <ListCard title="Productos más vistos" icon={<Eye size={18} />} empty="Sin vistas registradas todavía.">
                            {(data.top_viewed || []).map((p, i) => (
                                <Row key={p.product_id} index={i + 1} name={p.name} value={`${p.views} vistas`}
                                    onClick={() => setPreview({ kind: 'product', product_id: p.product_id, title: p.name, stats: [['Vistas', p.views]] })} />
                            ))}
                        </ListCard>

                        <ListCard title="Más vistos, menos consultados" icon={<MousePointerClick size={18} />} empty="Sin datos de interés todavía." hint="Mucha mirada, pocos clicks: candidatos a mejorar foto, precio o descripción.">
                            {(data.interest || []).map((p, i) => (
                                <Row key={p.product_id} index={i + 1} name={p.name} value={`${p.views} vistas · ${p.clicks} clicks`}
                                    onClick={() => setPreview({ kind: 'product', product_id: p.product_id, title: p.name, stats: [['Vistas', p.views], ['Clicks', p.clicks]] })} />
                            ))}
                        </ListCard>

                        <ListCard title="Búsquedas más frecuentes" icon={<Search size={18} />} empty="Aún nadie ha buscado." hint="Lo que más busca la gente: anticipa tu próxima producción.">
                            {(data.top_searches || []).map((s, i) => (
                                <Row key={s.query} index={i + 1} name={s.query} value={`${s.count}×`}
                                    onClick={() => window.open(`/search?q=${encodeURIComponent(s.query)}`, '_blank')} />
                            ))}
                        </ListCard>

                        <ListCard title="Filtros más usados" icon={<SlidersHorizontal size={18} />} empty="Aún no se aplican filtros." hint="Qué atributos (color, talla, etc.) filtra más la gente.">
                            {(data.top_filters || []).map((f, i) => (
                                <Row key={f.query} index={i + 1} name={f.query} value={`${f.count}×`} />
                            ))}
                        </ListCard>

                        <ListCard title="Variantes más agregadas al carrito" icon={<ShoppingCart size={18} />} empty="Sin variantes agregadas todavía." hint="La talla/color exacto que más interesa.">
                            {(data.top_cart_variants || []).map((v, i) => (
                                <Row key={v.sku} index={i + 1} name={v.label} value={`${v.count}×`}
                                    onClick={() => setPreview({ kind: 'variant', product_id: v.product_id, sku: v.sku, title: v.label, stats: [['Al carrito', v.count]] })} />
                            ))}
                        </ListCard>

                        <ListCard title="Variantes más cerradas por WhatsApp" icon={<MessageCircle size={18} />} empty="Sin cierres por WhatsApp todavía." hint="Lo que realmente se va a vender: producto + talla/color.">
                            {(data.top_checkout_variants || []).map((v, i) => (
                                <Row key={v.sku} index={i + 1} name={v.label} value={`${v.count}×`}
                                    onClick={() => setPreview({ kind: 'variant', product_id: v.product_id, sku: v.sku, title: v.label, stats: [['Cierres', v.count]] })} />
                            ))}
                        </ListCard>
                    </div>
                </>
            )}

            {preview && (
                <PreviewModal preview={preview} onClose={() => setPreview(null)} navigate={navigate} />
            )}
        </div>
    );
};

const ListCard = ({ title, icon, children, empty, hint }) => {
    const hasItems = React.Children.count(children) > 0;
    return (
        <section className="ana-panel">
            <div className="ana-panel-titulo-con-icono">
                {icon}
                <h3 className="ana-panel-titulo">{title}</h3>
            </div>
            {hint && <p className="ana-panel-ayuda">{hint}</p>}
            {hasItems ? <div className="ana-lista">{children}</div>
                      : <p className="ana-panel-vacio">{empty}</p>}
        </section>
    );
};

const Row = ({ index, name, value, onClick }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            padding: '8px 6px', borderBottom: '1px solid #f1f5f9', borderRadius: '6px',
            cursor: onClick ? 'pointer' : 'default',
        }}
        onMouseEnter={onClick ? (e) => { e.currentTarget.style.background = '#faf5f8'; } : undefined}
        onMouseLeave={onClick ? (e) => { e.currentTarget.style.background = 'transparent'; } : undefined}>
        <div className="ana-fila-izquierda">
            <span className="ana-fila-puesto">{index}</span>
            <span title={name} className="ana-fila-nombre">{name}</span>
        </div>
        <span className="ana-fila-valor">{value}</span>
    </div>
);

const PreviewModal = ({ preview, onClose, navigate }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        get(`/api/v1/products/${preview.product_id}`)
            .then(res => { if (active) setDetail(res); })
            .catch(() => {})
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [preview.product_id]);

    const isVariant = preview.kind === 'variant';

    // Imagen: para una variante usamos SU propia foto; si no tiene, caemos a la del producto
    let imgRaw = detail?.image || null;
    if (isVariant && detail?.skus) {
        const sk = detail.skus.find(s => s.sku === preview.sku);
        if (sk?.image_urls?.length) imgRaw = sk.image_urls[0];
    }
    const img = imgRaw ? getImageUrl(imgRaw) : null;

    const goToStore = () => {
        if (!detail?.slug) return;
        const url = isVariant ? `/catalogo/producto/${detail.slug}/${preview.sku}` : `/producto/${detail.slug}`;
        window.open(url, '_blank');
    };

    const goToAdmin = () => {
        onClose();
        navigate(`/admin/dashboard/inventory/${isVariant ? 'variants' : 'products'}`, {
            state: { initialSearch: isVariant ? preview.sku : (detail?.name || preview.title) },
        });
    };

    return (
        <div onClick={onClose} className="ana-overlay">
            <div onClick={(e) => e.stopPropagation()} className="ana-ventana">
                <div className="ana-foto">
                    {loading ? <span className="ana-suave">Cargando…</span>
                        : img ? <img src={img} alt={preview.title}  />
                              : <span className="ana-apagado">Sin imagen</span>}
                    <button onClick={onClose} aria-label="Cerrar" className="ana-cerrar"><X size={18} /></button>
                </div>

                <div className="ana-cuerpo">
                    <span className="ana-antetitulo">
                        {isVariant ? 'Variante' : 'Producto'}
                    </span>
                    <h3 className="ana-nombre-pieza">
                        {preview.title}
                    </h3>

                    <div className="ana-fila--separada">
                        {(preview.stats || []).map(([label, val]) => (
                            <div key={label} className="ana-cifra-caja">
                                <div className="ana-cifra">{val}</div>
                                <div className="ana-dia-numero-nombre">{label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="ana-fila">
                        <button onClick={goToStore} disabled={!detail?.slug} style={{
                            flex: 1, height: '46px', border: '1px solid #e2e8f0', borderRadius: '12px',
                            background: '#fff', color: '#334155', fontSize: '14px', fontWeight: '700',
                            cursor: detail?.slug ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}><ExternalLink size={16} /> Ver en la tienda</button>
                        <button onClick={goToAdmin} className="ana-accion"><Pencil size={16} /> {isVariant ? 'Editar variante' : 'Editar producto'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const selectStyle = {
    height: '44px',
    padding: '0 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    fontSize: '14px',
    color: '#1e1b4b',
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer',
};

export default AnalyticsModule;
