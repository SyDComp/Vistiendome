import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import { useNotification } from '../../../../context/NotificationContext';
import { Boxes, History, ArrowLeftRight, AlertTriangle, Plus, Minus, Info } from 'lucide-react';
import FilterBar from '../../../ui/admin/FilterBar';

const API_BASE = '/api/v1/admin/catalog';

const LogisticsManager = () => {
    const { toast, confirm } = useNotification();
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // Filtros por atributo de variante (Talla, Color, etc.), independientes
    // del buscador de texto. { nombreDelAtributo: valorElegido }
    const [activeFilters, setActiveFilters] = useState({});

    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [showAdjustment, setShowAdjustment] = useState(false);
    const [adjustmentTarget, setAdjustmentTarget] = useState(null);
    const [adjustmentForm, setAdjustmentForm] = useState({ quantity: 1, type: 'receipt', note: '' });

    const fetchBalances = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/kardex`);
            if (!res.ok) throw new Error('Error al cargar saldos');
            const data = await res.json();
            setBalances(data);
        } catch (err) {
            console.error(err);
            toast.error('No se pudo conectar con el servidor de inventario.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchBalances(); }, [fetchBalances]);

    const fetchHistory = async (skuId) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`${API_BASE}/kardex/${skuId}/history`);
            const data = await res.json();
            setHistoryData(data);
            setShowHistory(true);
        } catch (err) {
            toast.error('Error cargando historial del SKU');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleAdjustment = async () => {
        if (!adjustmentForm.note) return toast.error('Debes incluir una nota para el ajuste');
        
        try {
            const res = await fetch(`${API_BASE}/kardex/movement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku_id: adjustmentTarget.sku_id,
                    type: adjustmentForm.type,
                    quantity: adjustmentForm.type === 'receipt' ? Math.abs(adjustmentForm.quantity) : -Math.abs(adjustmentForm.quantity),
                    note: adjustmentForm.note
                })
            });

            if (res.ok) {
                toast.success('Movimiento registrado con éxito');
                setShowAdjustment(false);
                fetchBalances();
            } else {
                toast.error('Error al registrar movimiento');
            }
        } catch (err) {
            toast.error('Error de red');
        }
    };

    // Los atributos de variante (Talla, Color...) que hay HOY entre los saldos
    // cargados, con sus valores distintos. Se derivan en el cliente porque acá
    // ya se cargó todo de una vez (`GET /kardex` sin paginar): no hace falta
    // pedirle nada nuevo al servidor.
    const filtrosDeAtributos = useMemo(() => {
        const porClave = new Map();
        for (const b of balances) {
            for (const [clave, valor] of Object.entries(b.config || {})) {
                if (valor === null || valor === undefined || valor === '') continue;
                if (!porClave.has(clave)) porClave.set(clave, new Set());
                porClave.get(clave).add(String(valor));
            }
        }
        return Array.from(porClave.entries()).map(([clave, valores]) => ({
            key: clave,
            label: clave,
            options: Array.from(valores).sort().map(v => ({ value: v, label: v })),
        }));
    }, [balances]);

    const handleFilterChange = (updated) => setActiveFilters(updated);

    const filteredBalances = balances.filter(b => {
        // El buscador de texto miraba solo el SKU y el nombre del producto.
        // Con 1049 variantes, buscar "coral" o "3xl" -que es lo que se ve en
        // la columna Variante- no encontraba nada: no es que no funcionara,
        // es que no miraba donde Paola esperaba que mirara.
        const termino = searchTerm.toLowerCase();
        const enSkuONombre = b.sku.toLowerCase().includes(termino) ||
            b.product_name.toLowerCase().includes(termino);
        const enVariante = Object.values(b.config || {}).some(v =>
            String(v).toLowerCase().includes(termino)
        );
        if (termino && !enSkuONombre && !enVariante) return false;

        return Object.entries(activeFilters).every(([clave, valor]) => {
            if (!valor) return true;
            return String(b.config?.[clave] ?? '') === valor;
        });
    });

    const LOGISTICS_COLUMNS = [
        { 
            key: 'product_name', 
            label: 'Producto / SKU', 
            render: (v, row) => (
                <div className="logistics-product-wrapper">
                    <span className="logistics-product-name">{v}</span>
                    <span className="logistics-product-sku">{row.sku}</span>
                </div>
            )
        },
        { 
            key: 'config', 
            label: 'Variante', 
            render: (v) => (
                <div className="logistics-config-wrapper">
                    {Object.entries(v).map(([key, val]) => (
                        <span key={key} className="logistics-config-tag">
                            {val}
                        </span>
                    ))}
                </div>
            ) 
        },
        { 
            key: 'current_stock', 
            label: 'Stock Actual', 
            width: '120px',
            align: 'center',
            render: (v) => (
                <span className={`logistics-stock-badge ${v <= 0 ? 'empty' : v < 5 ? 'low' : 'good'}`}>
                    {v}
                </span>
            )
        }
    ];

    return (
        <div className="logistics-manager-layout">
            <SectionHeader 
                title="Gestión de Bodega (Kardex)"
                description="Control de inventario basado en eventos. Todos los movimientos son inmutables y trazables."
            />

            <FilterBar
                searchPlaceholder="Buscar por SKU, producto, talla, color..."
                onSearchChange={setSearchTerm}
                filters={filtrosDeAtributos}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
            />

            <DataTable 
                columns={LOGISTICS_COLUMNS}
                data={filteredBalances}
                isLoading={loading}
                emptyMessage="No hay productos registrados en el inventario."
                rowActions={(row) => (
                    <div className="logistics-actions-row">
                        <button 
                            onClick={() => fetchHistory(row.sku_id)}
                            title="Ver Historial (Kardex)"
                            className="logistics-action-btn history"
                        >
                            <History size={16} color="#64748b" />
                        </button>
                        <button 
                            onClick={() => { setAdjustmentTarget(row); setShowAdjustment(true); }}
                            title="Registrar Movimiento"
                            className="logistics-action-btn adjust"
                        >
                            <ArrowLeftRight size={16} color="#8f0653" />
                        </button>
                    </div>
                )}
            />

            {/* Modal de Ajuste / Movimiento */}
            {showAdjustment && (
                <div className="logistics-modal-overlay">
                    <div className="logistics-modal-content">
                        <h3 className="logistics-modal-title">Registrar Movimiento</h3>
                        <p className="logistics-modal-subtitle">
                            Producto: <strong>{adjustmentTarget?.product_name}</strong> ({adjustmentTarget?.sku})
                        </p>

                        <div className="logistics-modal-form">
                            <div>
                                <label className="logistics-modal-label">Tipo de Movimiento</label>
                                <div className="logistics-type-btns">
                                    <button 
                                        onClick={() => setAdjustmentForm({...adjustmentForm, type: 'receipt'})}
                                        className={`logistics-type-btn receipt ${adjustmentForm.type === 'receipt' ? 'active' : ''}`}
                                    >
                                        <Plus size={18} color={adjustmentForm.type === 'receipt' ? '#10b981' : '#cbd5e1'} />
                                        <div className="logistics-type-btn-text">Ingreso</div>
                                    </button>
                                    <button 
                                        onClick={() => setAdjustmentForm({...adjustmentForm, type: 'adjustment'})}
                                        className={`logistics-type-btn adjustment ${adjustmentForm.type === 'adjustment' ? 'active' : ''}`}
                                    >
                                        <ArrowLeftRight size={18} color={adjustmentForm.type === 'adjustment' ? '#f59e0b' : '#cbd5e1'} />
                                        <div className="logistics-type-btn-text">Ajuste / Merma</div>
                                    </button>
                                </div>
                            </div>

                            <div className="logistics-form-row">
                                <div className="logistics-form-col">
                                    <label className="logistics-modal-label">Cantidad</label>
                                    <input 
                                        type="number"
                                        value={adjustmentForm.quantity}
                                        onChange={e => setAdjustmentForm({...adjustmentForm, quantity: parseInt(e.target.value)})}
                                        className="logistics-modal-input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="logistics-modal-label">Nota / Razón</label>
                                <textarea 
                                    placeholder="Ej: Recepción proveedor X, Error en conteo anterior..."
                                    value={adjustmentForm.note}
                                    onChange={e => setAdjustmentForm({...adjustmentForm, note: e.target.value})}
                                    className="logistics-modal-textarea"
                                />
                            </div>
                        </div>

                        <div className="logistics-modal-actions">
                            <button 
                                onClick={() => setShowAdjustment(false)}
                                className="logistics-modal-btn-cancel"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAdjustment}
                                className="logistics-modal-btn-confirm"
                            >
                                Confirmar Movimiento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drawer de Historial (Kardex) */}
            <DetailDrawer 
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                data={historyData}
                type="custom"
                title={`Kardex: ${historyData?.sku}`}
                renderContent={(data) => (
                    <div className="logistics-drawer-body">
                        <div className="logistics-drawer-header">
                            <div className="logistics-drawer-label">Producto</div>
                            <div className="logistics-drawer-value">{data.product_name}</div>
                        </div>

                        <div className="logistics-history-list">
                            {data.history.length === 0 && (
                                // Un `.map` sobre un array vacio no pinta nada, ni
                                // siquiera un espacio en blanco: el drawer se abria
                                // con la cabecera y el cuerpo quedaba sin una sola
                                // linea, sin decir por que. Paola lo vio como "aprieto
                                // el boton y no aparece nada". Con 728 de 1049
                                // variantes sin un solo movimiento hoy, este es el
                                // caso mas comun, no la excepcion.
                                <div className="logistics-history-empty">
                                    <Info size={18} color="#94a3b8" />
                                    <span>Esta variante no tiene ningún movimiento registrado todavía.</span>
                                </div>
                            )}
                            {data.history.map((m) => (
                                <div key={m.id} className="logistics-history-item">
                                    <div className={`logistics-history-icon-wrapper ${m.type}`}>
                                        {m.type === 'receipt' ? <Plus size={20} color="#10b981" /> : m.type === 'sale' ? <Minus size={20} color="#ef4444" /> : <ArrowLeftRight size={20} color="#f59e0b" />}
                                    </div>
                                    <div className="logistics-history-details">
                                        <div className="logistics-history-row">
                                            <span className="logistics-history-type">
                                                {m.type === 'receipt' ? 'Ingreso' : m.type === 'sale' ? 'Venta' : 'Ajuste'}
                                            </span>
                                            <span className={`logistics-history-qty ${m.quantity > 0 ? 'positive' : 'negative'}`}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        </div>
                                        <div className="logistics-history-date">{new Date(m.created_at).toLocaleString()}</div>
                                        {m.note && <div className="logistics-history-note">"{m.note}"</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            />
        </div>
    );
};

export default LogisticsManager;
