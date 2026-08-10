import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
    Printer, Search, ChevronDown, ChevronRight, CheckSquare, Square,
    Layers, Settings2, RefreshCw, Maximize2, X, Info, BarChart2,
    FileText, Minus, Plus, LayoutGrid, AlignJustify, Package
} from 'lucide-react';
import Barcode from 'react-barcode';
import { generateEAN13 } from '../../../../features/productDetail/utils/skuUtils';

// ─── Configuración de tamaños ─────────────────────────────────────────────────
const PAPER_SIZES = {
    carta: { label: 'Carta (8.5 × 11")', widthMm: 215.9, heightMm: 279.4, widthPx: '8.5in', heightPx: '11in' },
    oficio: { label: 'Oficio (8.5 × 14")', widthMm: 215.9, heightMm: 355.6, widthPx: '8.5in', heightPx: '14in' },
};

const LABEL_SIZES = {
    sm: {
        label: 'Pequeño',
        subtitle: '4.5 × 2 cm',
        widthMm: 45, heightMm: 20,
        bcWidth: 1.0, bcHeight: 30, bcFontSize: 8,
    },
    md: {
        label: 'Mediano',
        subtitle: '7 × 2.5 cm',
        widthMm: 70, heightMm: 25,
        bcWidth: 1.4, bcHeight: 42, bcFontSize: 10,
    },
    lg: {
        label: 'Grande',
        subtitle: '9 × 3.5 cm',
        widthMm: 90, heightMm: 35,
        bcWidth: 1.8, bcHeight: 58, bcFontSize: 12,
    },
};

const MARGIN_MM = 10; // margen de página

// Calcula cuántas etiquetas caben en una hoja
const calcGrid = (paper, label, orientation = 'portrait') => {
    const isLandscape = orientation === 'landscape';
    const paperW = isLandscape ? paper.heightMm : paper.widthMm;
    const paperH = isLandscape ? paper.widthMm : paper.heightMm;
    const usableW = paperW - MARGIN_MM * 2;
    const usableH = paperH - MARGIN_MM * 2;
    const cols = Math.floor(usableW / label.widthMm);
    const rows = Math.floor(usableH / label.heightMm);
    return { cols, rows, total: cols * rows, paperW, paperH };
};

// Distribuye N copias entre K códigos de modo que sumen ~total
const smartDistribute = (codes, total) => {
    if (!codes.length) return {};
    const base = Math.floor(total / codes.length);
    const remainder = total - base * codes.length;
    const result = {};
    codes.forEach((c, i) => { result[c] = base + (i < remainder ? 1 : 0); });
    return result;
};

// Paleta de colores para identificar variantes en la vista previa
const PALETTE = [
    { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
    { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
    { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
    { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
    { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
    { bg: '#ffedd5', border: '#f97316', text: '#c2410c' },
    { bg: '#cffafe', border: '#06b6d4', text: '#0e7490' },
    { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
    { bg: '#f0fdf4', border: '#16a34a', text: '#14532d' },
    { bg: '#fdf4ff', border: '#d946ef', text: '#86198f' },
];

// Asigna un color por SKU
const buildColorMap = (selectedList) => {
    const map = {};
    selectedList.forEach((item, i) => {
        map[item.sku] = PALETTE[i % PALETTE.length];
    });
    return map;
};

// ─── Generador de HTML para ventana de impresión (usa SVGs pre-renderizados, sin CDN) ────
const buildPrintHTML = (slots, paperCfg, labelCfg, grid, options = {}) => {
    const { labelStyle = 'classic', showSkuText = true, colorMap = {}, svgMap = {}, orientation = 'portrait' } = options;
    const { cols, rows, paperW, paperH } = grid;
    const mmToPx = mm => `${mm}mm`;

    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const pages = chunkArray(slots, grid.total);

    const pagesHTML = pages.map(pageSlots => {
        const labelItems = pageSlots.map(({ sku, barcode, productName, config }) => {
            const configText = Object.values(config || {}).join(' / ');
            const label = configText ? `${productName} – ${configText}` : productName || sku;
            const color = colorMap[sku] || { bg: '#fff', border: '#ddd', text: '#333' };
            const bgStyle = labelStyle === 'color'
                ? `background:${color.bg}; border:0.5px solid ${color.border};`
                : `background:#fff; border:0.3px solid #ddd;`;
            
            const svgContent = svgMap[barcode]
                ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;">${svgMap[barcode]}</div>`
                : `<div style="font-size:9px;font-family:monospace;color:#000;padding:2px;">${barcode}</div>`;
            
            const textContent = showSkuText
                ? `<div style="font-size:${Math.max(6, labelCfg.bcFontSize * 0.5)}px;color:${labelStyle === 'color' ? color.text : '#555'};text-align:center;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:bold;flex-shrink:0;">${label}</div>`
                : '';
                
            return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2mm;overflow:hidden;page-break-inside:avoid;box-sizing:border-box;${bgStyle}">${svgContent}${textContent}</div>`;
        }).join('');
        return `<div class="page"><div class="grid">${labelItems}</div></div>`;
    }).join('');

    const wPx = orientation === 'landscape' ? paperCfg.heightPx : paperCfg.widthPx;
    const hPx = orientation === 'landscape' ? paperCfg.widthPx : paperCfg.heightPx;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Códigos de Barras – Vistiendomé</title>
<style>
  @page { size: ${wPx} ${hPx}; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Courier New', monospace; }
  .page { width: 100vw; height: 100vh; overflow: hidden; padding: ${mmToPx(MARGIN_MM)}; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .grid { flex: 1; display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-template-rows: repeat(${rows}, minmax(0, 1fr)); justify-items: stretch; align-items: stretch; gap: 2mm; height: 100%; overflow: hidden; }
  svg { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; margin: 0 auto; object-fit: contain; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
${pagesHTML}
<script>setTimeout(function(){window.print();},300);<\\/script>
</body>
</html>`;
};

// ─── Componente principal ────────────────────────────────────────────────────
const BarcodePrinter = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedProducts, setExpandedProducts] = useState(new Set());
    const [selected, setSelected] = useState({});
    const [paper, setPaper] = useState('carta');
    const [orientation, setOrientation] = useState('portrait');
    const [labelSize, setLabelSize] = useState('md');
    const [labelStyle, setLabelStyle] = useState('classic');
    const [showSkuText, setShowSkuText] = useState(true);
    const [previewMode, setPreviewMode] = useState('grid'); // 'grid' | 'list'
    const [expandedSection, setExpandedSection] = useState(null); // 'copies' | 'preview' | null
    const barcodeContainerRef = useRef(null);
    const [svgMap, setSvgMap] = useState({});

    // Carga de SKUs y agrupación por producto
    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        fetch('/api/v1/admin/catalog/skus?page_size=9999', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                const skus = data.items || [];
                // Agrupar por product_id
                const grouped = {};
                skus.forEach(s => {
                    if (!grouped[s.product_id]) {
                        grouped[s.product_id] = {
                            id: s.product_id,
                            name: s.product_name,
                            skus: []
                        };
                    }
                    grouped[s.product_id].skus.push({
                        sku: s.sku,
                        barcode: s.barcode || generateEAN13(s.sku),
                        config: s.config || {},
                        price: s.price
                    });
                });
                setProducts(Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name)));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const paperCfg = PAPER_SIZES[paper];
    const labelCfg = LABEL_SIZES[labelSize];
    const grid = useMemo(() => calcGrid(paperCfg, labelCfg, orientation), [paperCfg, labelCfg, orientation]);

    const selectedList = Object.values(selected); // [{sku, barcode, productName, copies}]
    const totalCopies = selectedList.reduce((s, v) => s + (v.copies || 0), 0);

    // Cuando cambian los seleccionados o el grid, re-distribuye inteligentemente
    const redistribute = useCallback(() => {
        if (!selectedList.length) return;
        const codes = selectedList.map(s => s.sku);
        // Calcula cuántas páginas necesitamos como mínimo
        const pagesNeeded = Math.ceil(codes.length / grid.total);
        const targetTotal = pagesNeeded * grid.total; // Rellena páginas enteras
        
        const newDist = smartDistribute(codes, targetTotal);
        setSelected(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(sku => {
                next[sku] = { ...next[sku], copies: newDist[sku] ?? 1 };
            });
            return next;
        });
    }, [grid.total, selectedList.length]);

    // Ya no re-distribuimos al cambiar papel, solo ajustamos si el usuario hace click en rellenar.
    
    // Toggle selección de variante — guarda config para el print
    const toggleSku = (sku, barcode, productName, config) => {
        setSelected(prev => {
            const next = { ...prev };
            if (next[sku]) {
                delete next[sku];
            } else {
                next[sku] = { sku, barcode, productName, config: config || {}, copies: 1 };
            }
            return next;
        });
    };

    // Extraer SVGs responsivos
    useEffect(() => {
        if (barcodeContainerRef.current) {
            const wrappers = barcodeContainerRef.current.querySelectorAll('[data-bc]');
            const newMap = {};
            wrappers.forEach(w => {
                const bc = w.getAttribute('data-bc');
                let svgStr = w.innerHTML;
                const matchW = svgStr.match(/width="([^"]+)"/);
                const matchH = svgStr.match(/height="([^"]+)"/);
                if (matchW && matchH) {
                    const wVal = parseFloat(matchW[1]);
                    const hVal = parseFloat(matchH[1]);
                    svgStr = svgStr.replace(/width="[^"]+"/, 'width="100%"');
                    svgStr = svgStr.replace(/height="[^"]+"/, 'height="100%"');
                    if (!svgStr.includes('viewBox')) {
                        svgStr = svgStr.replace('<svg ', `<svg viewBox="0 0 ${wVal} ${hVal}" preserveAspectRatio="xMidYMid meet" `);
                    }
                }
                newMap[bc] = svgStr;
            });
            setSvgMap(newMap);
        }
    }, [selected, labelCfg, labelStyle, showSkuText]);

    // Seleccionar/deseleccionar todos los SKUs de un producto
    const toggleProduct = (product) => {
        const skus = product.skus || [];
        const allSelected = skus.every(s => selected[s.sku]);
        setSelected(prev => {
            const next = { ...prev };
            if (allSelected) {
                skus.forEach(s => delete next[s.sku]);
            } else {
                skus.forEach(s => {
                    if (!next[s.sku]) {
                        next[s.sku] = {
                            sku: s.sku,
                            barcode: s.barcode || generateEAN13(s.sku),
                            productName: product.name,
                            config: s.config || {},
                            copies: 1
                        };
                    }
                });
            }
            return next;
        });
    };

    const setCopies = (sku, val) => {
        const num = Math.max(0, parseInt(val) || 0);
        setSelected(prev => ({ ...prev, [sku]: { ...prev[sku], copies: num } }));
    };

    const clearAll = () => setSelected({});

    // Construye los slots de impresión (puede ser multi-página)
    const buildSlots = () => {
        const slots = [];
        const items = selectedList.filter(s => s.copies > 0);
        if (!items.length) return slots;

        // Añadir exactamente las copias pedidas
        items.forEach(item => {
            for (let i = 0; i < item.copies; i++) slots.push(item);
        });

        return slots;
    };

    const handlePrint = () => {
        if (!selectedList.length) return;
        const slots = buildSlots();
        const colorMap = buildColorMap(selectedList);
        
        const html = buildPrintHTML(slots, paperCfg, labelCfg, grid, { labelStyle, showSkuText, colorMap, svgMap, orientation });
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(html);
        win.document.close();
    };

    // Filtro de búsqueda avanzado
    const filtered = useMemo(() => {
        if (!search) return products;
        const q = search.toLowerCase();
        
        return products.map(p => {
            const matchProduct = p.name?.toLowerCase().includes(q);
            // Filtramos los skus del producto para ver cuáles coinciden
            const matchedSkus = (p.skus || []).filter(s => 
                matchProduct || s.sku?.toLowerCase().includes(q) || (s.barcode && s.barcode.toLowerCase().includes(q))
            );
            
            if (matchedSkus.length > 0) {
                return { ...p, skus: matchedSkus };
            }
            return null;
        }).filter(Boolean);
    }, [products, search]);

    // Slots para vista previa
    const previewSlots = buildSlots();

    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobile = windowWidth <= 768;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={`barcode-printer-container ${isMobile ? 'mobile' : ''}`}>

            {/* ── Panel izquierdo: Selector ── */}
            <div className="barcode-printer-left-panel">
                {/* Header */}
                <div className="barcode-printer-left-header">
                    <div className="barcode-printer-left-header-title-row">
                        <div className="barcode-printer-left-header-icon">
                            <BarChart2 size={18} color="#fff" />
                        </div>
                        <div>
                            <h2 className="barcode-printer-left-header-title">Selección de Etiquetas</h2>
                            <p className="barcode-printer-left-header-desc">
                                {selectedList.length} variante{selectedList.length !== 1 ? 's' : ''} · {totalCopies} etiquetas
                            </p>
                        </div>
                    </div>

                    {/* Buscador */}
                    <div className="barcode-printer-search-wrap">
                        <Search size={14} className="barcode-printer-search-icon" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar producto o SKU…"
                            className="barcode-printer-search-input"
                        />
                    </div>
                </div>

                {/* Lista de productos */}
                <div className="barcode-printer-list">
                    {loading ? (
                        <div className="barcode-printer-empty">
                            <RefreshCw size={24} className="barcode-printer-loading-icon" />
                            <p>Cargando productos…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="barcode-printer-empty">
                            <Package size={32} className="barcode-printer-empty-icon" />
                            <p>No se encontraron productos</p>
                        </div>
                    ) : filtered.map(product => {
                        const skus = product.skus || [];
                        if (!skus.length) return null;
                        const isExpanded = expandedProducts.has(product.id);
                        const allSel = skus.every(s => selected[s.sku]);
                        const someSel = skus.some(s => selected[s.sku]);

                        return (
                            <div key={product.id} className="barcode-printer-product-mb">
                                {/* Fila de producto */}
                                <div className={`barcode-printer-product-row ${someSel ? 'selected' : ''}`}
                                    onClick={() => {
                                        setExpandedProducts(prev => {
                                            const n = new Set(prev);
                                            n.has(product.id) ? n.delete(product.id) : n.add(product.id);
                                            return n;
                                        });
                                    }}
                                >
                                    <button
                                        onClick={e => { e.stopPropagation(); toggleProduct(product); }}
                                        className={`barcode-printer-product-btn ${allSel ? 'all' : (someSel ? 'some' : 'none')}`}
                                    >
                                        {allSel ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                    <span className="barcode-printer-product-name">{product.name}</span>
                                    <span className="barcode-printer-product-count">{skus.length}</span>
                                    {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                                </div>

                                {/* Variantes del producto */}
                                {isExpanded && (
                                    <div className="barcode-printer-variants">
                                        {skus.map(s => {
                                            const bc = s.barcode || generateEAN13(s.sku);
                                            const isSel = !!selected[s.sku];
                                            const config = s.config || {};
                                            return (
                                                <div key={s.sku} className={`barcode-printer-variant-row ${isSel ? 'selected' : ''}`}
                                                    onClick={() => toggleSku(s.sku, bc, product.name, s.config)}
                                                >
                                                    <span className={`barcode-printer-variant-icon ${isSel ? 'selected' : 'unselected'}`}>
                                                        {isSel ? <CheckSquare size={15} /> : <Square size={15} />}
                                                    </span>
                                                    <div className="barcode-printer-variant-info">
                                                        <div className="barcode-printer-variant-name">
                                                            {Object.values(config).join(' / ') || s.sku}
                                                        </div>
                                                        <div className="barcode-printer-variant-bc">{bc}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer con acciones rápidas */}
                {selectedList.length > 0 && (
                    <div className="barcode-printer-left-footer">
                        <button onClick={redistribute} className="barcode-printer-btn-distribute">
                            <RefreshCw size={12} /> Auto-distribuir
                        </button>
                        <button onClick={clearAll} className="barcode-printer-btn-clear">
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            {/* ── Panel derecho: Configurador + Vista previa ── */}
            <div className="barcode-printer-right-panel">

                {/* Configuración */}
                <div className="barcode-printer-config">
                    <div className="barcode-printer-config-header">
                        <Settings2 size={16} color="#8f0653" />
                        <h3 className="barcode-printer-config-title">Configuración de Impresión</h3>
                        <div className="barcode-printer-config-info">
                            <Info size={12} color="#94a3b8" />
                            <span className="barcode-printer-config-info-text">
                                Caben <strong className="barcode-printer-config-info-highlight">{grid.total}</strong> etiquetas · {grid.cols} col × {grid.rows} fil
                            </span>
                        </div>
                    </div>

                    <div className="barcode-printer-config-grid">
                        {/* Tamaño de papel */}
                        <div className="barcode-printer-config-group">
                            <label className="barcode-printer-config-label">Tamaño de Hoja</label>
                            <div className="barcode-printer-config-options">
                                {Object.entries(PAPER_SIZES).map(([key, cfg]) => (
                                    <button key={key} onClick={() => setPaper(key)} className={`barcode-printer-config-option ${paper === key ? 'primary' : 'inactive'}`}>
                                        <FileText size={16} />
                                        <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Orientación */}
                        <div className="barcode-printer-config-group">
                            <label className="barcode-printer-config-label">Orientación</label>
                            <div className="barcode-printer-config-options">
                                {[{ key: 'portrait', label: 'Vertical' }, { key: 'landscape', label: 'Horizontal' }].map(opt => (
                                    <button key={opt.key} onClick={() => setOrientation(opt.key)} className={`barcode-printer-config-option ${orientation === opt.key ? 'primary' : 'inactive'}`}>
                                        <div className="barcode-printer-config-option-icon">{opt.key === 'portrait' ? '📄' : '📝'}</div>
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tamaño de etiqueta */}
                        <div className="barcode-printer-config-group large">
                            <label className="barcode-printer-config-label">Tamaño de Etiqueta</label>
                            <div className="barcode-printer-config-options">
                                {Object.entries(LABEL_SIZES).map(([key, cfg]) => (
                                    <button key={key} onClick={() => setLabelSize(key)} className={`barcode-printer-config-option ${labelSize === key ? 'secondary' : 'inactive'}`}>
                                        <div className="barcode-printer-config-option-title">{cfg.label}</div>
                                        <div className="barcode-printer-config-option-sub">{cfg.subtitle}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estilo de etiqueta + Texto SKU */}
                        <div className="barcode-printer-config-styles">
                            {/* Estilo */}
                            <div className="barcode-printer-config-group">
                                <label className="barcode-printer-config-label">Estilo de etiqueta</label>
                                <div className="barcode-printer-config-options">
                                    {[{ key: 'classic', icon: '◼', label: 'Clásico B/N', sub: 'Estándar industrial' }, { key: 'color', icon: '🎨', label: 'Color', sub: 'Fondo por variante' }].map(opt => (
                                        <button key={opt.key} onClick={() => setLabelStyle(opt.key)} className={`barcode-printer-config-option ${labelStyle === opt.key ? 'primary' : 'inactive'}`}>
                                            <div className="barcode-printer-config-option-icon">{opt.icon}</div>
                                            <div className="barcode-printer-config-option-title">{opt.label}</div>
                                            <div className="barcode-printer-config-option-sub">{opt.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Texto SKU */}
                            <div className="barcode-printer-config-text-options">
                                <label className="barcode-printer-config-label">Mostrar texto</label>
                                <div className="barcode-printer-config-options">
                                    {[{ v: true, label: 'Con texto' }, { v: false, label: 'Solo barras' }].map(opt => (
                                        <button key={String(opt.v)} onClick={() => setShowSkuText(opt.v)} className={`barcode-printer-config-option ${showSkuText === opt.v ? 'secondary' : 'inactive'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Info compatibilidad */}
                            <div className="barcode-printer-config-compat">
                                <div className="barcode-printer-config-compat-box">
                                    <div className="barcode-printer-config-compat-title">✓ Compatible con lectores</div>
                                    <div className="barcode-printer-config-compat-sub">Pistola láser · Lector USB · App móvil</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel de copias manuales */}
                {selectedList.length > 0 && (
                    <div className="barcode-printer-copies">
                        <div className="barcode-printer-copies-header">
                            <div className="barcode-printer-copies-title-wrap">
                                <button onClick={() => setExpandedSection('copies')} className="barcode-printer-btn-expand" title="Ampliar">
                                    <Maximize2 size={14} color="#8f0653" />
                                </button>
                                <span className="barcode-printer-copies-title">Copias por etiqueta</span>
                                <span className="barcode-printer-copies-info">
                                    Total: {totalCopies} etiquetas ({Math.ceil(totalCopies / grid.total)} páginas)
                                </span>
                            </div>
                            <button onClick={redistribute} className="barcode-printer-copies-btn-fill">
                                <RefreshCw size={12} /> Rellenar páginas completas
                            </button>
                        </div>
                        <div className="barcode-printer-copies-list">
                            {selectedList.map(item => (
                                <div key={item.sku} className="barcode-printer-copy-item">
                                    <div className="barcode-printer-copy-info">
                                        <div className="barcode-printer-copy-name">{item.productName}</div>
                                        <div className="barcode-printer-copy-sku">{item.sku}</div>
                                    </div>
                                    <div className="barcode-printer-copy-actions">
                                        <button onClick={() => setCopies(item.sku, (item.copies || 0) - 1)} className="barcode-printer-copy-btn">
                                            <Minus size={10} />
                                        </button>
                                        <input
                                            type="number" min="0"
                                            value={item.copies || 0}
                                            onChange={e => setCopies(item.sku, e.target.value)}
                                            className="barcode-printer-copy-input"
                                        />
                                        <button onClick={() => setCopies(item.sku, (item.copies || 0) + 1)} className="barcode-printer-copy-btn">
                                            <Plus size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vista previa de la hoja */}
                <div className="barcode-printer-preview">
                    <div className="barcode-printer-preview-header">
                        <div className="barcode-printer-preview-title-wrap">
                            <button onClick={() => setExpandedSection('preview')} className="barcode-printer-btn-expand" title="Ampliar">
                                <Maximize2 size={14} color="#8f0653" />
                            </button>
                            <span className="barcode-printer-preview-title">Vista Previa de hoja</span>
                            <span className="barcode-printer-preview-info">
                                {labelStyle === 'classic' ? '◼ Clásico B/N' : '🎨 Color'}{showSkuText ? ' · con texto' : ' · solo barras'}
                            </span>
                        </div>
                        <button onClick={handlePrint} disabled={!selectedList.length}
                            className={`barcode-printer-btn-print ${selectedList.length ? 'active' : 'inactive'}`}>
                            <Printer size={15} />
                            Imprimir
                        </button>
                    </div>

                    {/* Vista Previa tipo hoja de papel */}
                    <div className="barcode-printer-preview-area">
                        {previewSlots.length === 0 ? (
                            <div className="barcode-printer-preview-empty">
                                <BarChart2 size={48} className="barcode-printer-preview-empty-icon" />
                                <p className="barcode-printer-preview-empty-title">Selecciona variantes para ver la vista previa</p>
                                <p className="barcode-printer-preview-empty-desc">La página se llenará automáticamente con las etiquetas configuradas</p>
                            </div>
                        ) : (() => {
                            const colorMap = buildColorMap(selectedList);
                            const SHEET_W = isMobile ? Math.max(250, Math.min(500, windowWidth - 48)) : 500;
                            const SHEET_H = Math.round(SHEET_W * (grid.paperH / grid.paperW));
                            const PAD = 14;
                            const cellW = Math.floor((SHEET_W - PAD * 2) / grid.cols);
                            const cellH = Math.floor((SHEET_H - PAD * 2) / grid.rows);

                            const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                            const previewPages = chunkArray(previewSlots, grid.total);

                            const txtFs = Math.max(7, Math.min(10, cellH * 0.18));

                            return (
                                <div className="barcode-printer-pages">
                                    {previewPages.map((pageSlots, pageIndex) => (
                                        <div key={pageIndex} className="barcode-printer-page" style={{
                                            width: `${SHEET_W}px`,
                                            height: `${SHEET_H}px`,
                                            padding: `${PAD}px`,
                                            gridTemplateColumns: `repeat(${grid.cols}, ${cellW}px)`,
                                            gridTemplateRows: `repeat(${grid.rows}, ${cellH}px)`,
                                        }}>
                                            {pageSlots.map((slot, i) => {
                                                const color = colorMap[slot.sku] || PALETTE[0];
                                                const configText = Object.values(slot.config || {}).join(' / ');
                                                const label = configText ? `${slot.productName} – ${configText}` : slot.productName || slot.sku;
                                                const isClassic = labelStyle === 'classic';
                                                return (
                                                    <div key={i} title={`${slot.productName}\n${slot.sku}`} className="barcode-printer-label" style={{
                                                        width: `${cellW}px`, height: `${cellH}px`,
                                                        background: isClassic ? '#fff' : color.bg,
                                                        border: isClassic ? '0.5px solid #e2e8f0' : `1px solid ${color.border}`,
                                                    }}>
                                                        <div className="barcode-printer-label-svg">
                                                            {svgMap[slot.barcode] ? (
                                                                <div className="barcode-printer-label-svg-inner"
                                                                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgMap[slot.barcode], { ADD_TAGS: ['svg', 'g', 'rect', 'text', 'path'] }) }} />
                                                            ) : (
                                                                <span className="barcode-printer-label-loading">Generando...</span>
                                                            )}
                                                        </div>
                                                        {showSkuText && (
                                                            <span className="barcode-printer-label-text" style={{
                                                                fontSize: `${txtFs}px`,
                                                                color: isClassic ? '#444' : color.text,
                                                            }}>
                                                                {label}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Contenedor oculto para pre-renderizar SVGs de impresión */}
                    <div ref={barcodeContainerRef} className="barcode-printer-hidden-container">
                        {[...new Set(previewSlots.map(s => s.barcode))].map(bc => (
                            <div key={bc} data-bc={bc}>
                                <Barcode
                                    value={bc || '0000000000000'}
                                    format="CODE128"
                                    width={labelCfg.bcWidth}
                                    height={labelCfg.bcHeight * (showSkuText ? 1 : 1.2)}
                                    fontSize={labelCfg.bcFontSize}
                                    margin={2}
                                    displayValue={true}
                                    background={labelStyle === 'color' ? 'transparent' : '#ffffff'}
                                    lineColor="#000000"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlay Modal Expandido */}
            {expandedSection && (
                <div className={`barcode-printer-modal-overlay ${window.innerWidth <= 768 ? 'is-mobile' : 'is-desktop'}`}>
                    <div className={`barcode-printer-modal-content ${expandedSection === 'preview' ? 'preview-size' : 'copies-size'}`}>
                        <div className="barcode-printer-modal-header">
                            <div className="barcode-printer-modal-header-info">
                                <div className="barcode-printer-modal-icon-wrapper">
                                    {expandedSection === 'copies' ? <Layers size={20} /> : <Maximize2 size={20} />}
                                </div>
                                <div>
                                    <h2 className="barcode-printer-modal-title">
                                        {expandedSection === 'copies' ? 'Gestión de Copias por Etiqueta' : 'Vista Previa Ampliada'}
                                    </h2>
                                    <p className="barcode-printer-modal-subtitle">
                                        {expandedSection === 'copies' ? `Total: ${totalCopies} etiquetas (${Math.ceil(totalCopies / grid.total)} páginas)` : (labelStyle === 'classic' ? '◼ Clásico B/N' : '🎨 Color') + (showSkuText ? ' · con texto' : ' · solo barras')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setExpandedSection(null)} className="barcode-printer-modal-close-btn">
                                <X size={18} color="#64748b" />
                            </button>
                        </div>
                        <div className={`barcode-printer-modal-body ${expandedSection === 'preview' ? 'bg-preview' : 'bg-copies'}`}>
                            {expandedSection === 'copies' ? (
                                <div className="barcode-printer-copies-list barcode-printer-copies-grid">
                                    {selectedList.map(item => (
                                        <div key={item.sku} className="barcode-printer-copy-item">
                                            <div className="barcode-printer-copy-info">
                                                <div className="barcode-printer-copy-name">{item.productName}</div>
                                                <div className="barcode-printer-copy-sku">{item.sku}</div>
                                            </div>
                                            <div className="barcode-printer-copy-actions">
                                                <button onClick={() => setCopies(item.sku, (item.copies || 0) - 1)} className="barcode-printer-copy-btn">
                                                    <Minus size={10} />
                                                </button>
                                                <input
                                                    type="number" min="0"
                                                    value={item.copies || 0}
                                                    onChange={e => setCopies(item.sku, e.target.value)}
                                                    className="barcode-printer-copy-input"
                                                />
                                                <button onClick={() => setCopies(item.sku, (item.copies || 0) + 1)} className="barcode-printer-copy-btn">
                                                    <Plus size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="barcode-printer-preview-area" style={{ background: 'transparent', border: 'none', height: 'auto', minHeight: '100%', padding: 0, overflow: 'visible' }}>
                                    {previewSlots.length === 0 ? (
                                        <div className="barcode-printer-preview-empty">
                                            <BarChart2 size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                            <p className="barcode-printer-preview-empty-title">Selecciona variantes para ver la vista previa</p>
                                        </div>
                                    ) : (() => {
                                        const colorMap = buildColorMap(selectedList);
                                        const SHEET_W = isMobile ? Math.max(250, windowWidth - 32) : Math.min(800, windowWidth - 80);
                                        const SHEET_H = Math.round(SHEET_W * (grid.paperH / grid.paperW));
                                        const PAD = 14;
                                        const cellW = Math.floor((SHEET_W - PAD * 2) / grid.cols);
                                        const cellH = Math.floor((SHEET_H - PAD * 2) / grid.rows);

                                        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                                        const previewPages = chunkArray(previewSlots, grid.total);
                                        const txtFs = Math.max(7, Math.min(10, cellH * 0.18));

                                        return (
                                            <div className="barcode-printer-pages" style={{ gap: '32px' }}>
                                                {previewPages.map((pageSlots, pageIndex) => (
                                                    <div key={pageIndex} className="barcode-printer-page" style={{
                                                        width: `${SHEET_W}px`,
                                                        height: `${SHEET_H}px`,
                                                        padding: `${PAD}px`,
                                                        gridTemplateColumns: `repeat(${grid.cols}, ${cellW}px)`,
                                                        gridTemplateRows: `repeat(${grid.rows}, ${cellH}px)`,
                                                    }}>
                                                        {pageSlots.map((slot, i) => {
                                                            const color = colorMap[slot.sku] || PALETTE[0];
                                                            const configText = Object.values(slot.config || {}).join(' / ');
                                                            const label = configText ? `${slot.productName} – ${configText}` : slot.productName || slot.sku;
                                                            const isClassic = labelStyle === 'classic';
                                                            return (
                                                                <div key={i} title={`${slot.productName}\n${slot.sku}`} className="barcode-printer-label" style={{
                                                                    width: `${cellW}px`, height: `${cellH}px`,
                                                                    background: isClassic ? '#fff' : color.bg,
                                                                    border: isClassic ? '0.5px solid #e2e8f0' : `1px solid ${color.border}`,
                                                                }}>
                                                                    <div className="barcode-printer-label-svg">
                                                                        {svgMap[slot.barcode] ? (
                                                                            <div className="barcode-printer-label-svg-inner"
                                                                                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgMap[slot.barcode], { ADD_TAGS: ['svg', 'g', 'rect', 'text', 'path'] }) }} />
                                                                        ) : (
                                                                            <span className="barcode-printer-label-loading">Generando...</span>
                                                                        )}
                                                                    </div>
                                                                    {showSkuText && (
                                                                        <span className="barcode-printer-label-text" style={{
                                                                            fontSize: `${txtFs}px`,
                                                                            color: isClassic ? '#444' : color.text,
                                                                        }}>
                                                                            {label}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                        {expandedSection === 'copies' && (
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <button onClick={redistribute} className="barcode-printer-copies-btn-fill" style={{ fontSize: '14px', padding: '10px 20px', height: '44px' }}>
                                    <RefreshCw size={16} /> Rellenar páginas completas
                                </button>
                                <button onClick={() => setExpandedSection(null)} style={{ background: '#1e1b4b', color: '#fff', border: 'none', padding: '0 24px', height: '44px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                                    Listo
                                </button>
                            </div>
                        )}
                        {expandedSection === 'preview' && (
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button onClick={() => { handlePrint(); setExpandedSection(null); }} className="barcode-printer-btn-print active" style={{ height: '44px', fontSize: '14px' }}>
                                    <Printer size={16} /> Imprimir Ahora
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default BarcodePrinter;
