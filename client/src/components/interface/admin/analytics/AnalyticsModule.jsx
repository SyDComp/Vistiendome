import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Eye, MousePointerClick, Search, ShoppingCart, MessageCircle, AlertTriangle, Clock, Calendar, X, ExternalLink, Pencil, SlidersHorizontal } from 'lucide-react';
import { get } from '../../../../lib/api/client';
import { getImageUrl } from '../../../../lib/api/endpoints';
import TimeSeriesChart from './TimeSeriesChart';

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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', overflowY: 'auto', paddingBottom: '40px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fdf2f8', color: '#8f0653', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#1e1b4b' }}>Inteligencia de Negocio</h1>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Qué miran, qué buscan y qué dejan en el camino tus clientes.</p>
                    </div>
                </div>
                <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} style={selectStyle}>
                    <option value={7}>Últimos 7 días</option>
                    <option value={30}>Últimos 30 días</option>
                    <option value={90}>Últimos 90 días</option>
                </select>
            </header>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando estadísticas...</div>
            ) : !data ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aún no hay datos suficientes para mostrar.</div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                        {metrics.map(m => (
                            <div key={m.key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: m.bg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {m.icon}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{m.label}</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e1b4b' }}>{(m.value ?? 0).toLocaleString('es-CL')}</div>
                            </div>
                        ))}
                    </div>

                    <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e1b4b' }}>Tendencia por día</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
                                        }}
                                    >
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
                            <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e1b4b', fontWeight: '800', fontSize: '14px' }}>
                                    <Calendar size={16} /> {fmtDate(selectedDay.date)}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                                    {CHART_METRICS.map(m => (
                                        <div key={m.key} style={{ textAlign: 'center', padding: '8px', background: '#fff', borderRadius: '10px', border: '1px solid #eef2f7' }}>
                                            <div style={{ fontSize: '20px', fontWeight: '900', color: m.color }}>{selectedDay[m.key] ?? 0}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{m.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                                Haz clic en un día del gráfico para ver el detalle exacto de esa jornada.
                            </p>
                        )}
                    </section>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
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
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#8f0653' }}>
                {icon}
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e1b4b' }}>{title}</h3>
            </div>
            {hint && <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{hint}</p>}
            {hasItems ? <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{children}</div>
                      : <p style={{ fontSize: '13px', color: '#94a3b8' }}>{empty}</p>}
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
        onMouseLeave={onClick ? (e) => { e.currentTarget.style.background = 'transparent'; } : undefined}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e1', width: '18px', flexShrink: 0 }}>{index}</span>
            <span title={name} style={{ fontSize: '14px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#8f0653', flexShrink: 0 }}>{value}</span>
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
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '20px',
                overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <div style={{ position: 'relative', height: '220px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loading ? <span style={{ color: '#94a3b8', fontSize: '13px' }}>Cargando…</span>
                        : img ? <img src={img} alt={preview.title} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} />
                              : <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Sin imagen</span>}
                    <button onClick={onClose} aria-label="Cerrar" style={{
                        position: 'absolute', top: '12px', right: '12px', width: '34px', height: '34px',
                        border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', color: '#1e293b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}><X size={18} /></button>
                </div>

                <div style={{ padding: '22px 24px 24px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {isVariant ? 'Variante' : 'Producto'}
                    </span>
                    <h3 style={{ margin: '6px 0 14px', fontSize: '17px', fontWeight: '800', color: '#1e1b4b', lineHeight: 1.4 }}>
                        {preview.title}
                    </h3>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        {(preview.stats || []).map(([label, val]) => (
                            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e1b4b' }}>{val}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{label}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={goToStore} disabled={!detail?.slug} style={{
                            flex: 1, height: '46px', border: '1px solid #e2e8f0', borderRadius: '12px',
                            background: '#fff', color: '#334155', fontSize: '14px', fontWeight: '700',
                            cursor: detail?.slug ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}><ExternalLink size={16} /> Ver en la tienda</button>
                        <button onClick={goToAdmin} style={{
                            flex: 1, height: '46px', border: 'none', borderRadius: '12px',
                            background: '#8f0653', color: '#fff', fontSize: '14px', fontWeight: '700',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}><Pencil size={16} /> {isVariant ? 'Editar variante' : 'Editar producto'}</button>
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
