import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import { useNotification } from '../../../../context/NotificationContext';
import { Boxes, History, ArrowLeftRight, AlertTriangle, Plus, Minus, Info } from 'lucide-react';
import FilterBar from '../../../ui/admin/FilterBar';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin/catalog';

const LogisticsManager = () => {
    const { toast, confirm } = useNotification();
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
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

    const filteredBalances = balances.filter(b => 
        b.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const LOGISTICS_COLUMNS = [
        { 
            key: 'product_name', 
            label: 'Producto / SKU', 
            render: (v, row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '700', color: '#1e1b4b' }}>{v}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{row.sku}</span>
                </div>
            )
        },
        { 
            key: 'config', 
            label: 'Variante', 
            render: (v) => (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {Object.entries(v).map(([key, val]) => (
                        <span key={key} style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
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
                <span style={{ 
                    fontWeight: '800', 
                    fontSize: '15px',
                    color: v <= 0 ? '#ef4444' : v < 5 ? '#f59e0b' : '#10b981',
                    background: v <= 0 ? '#fef2f2' : v < 5 ? '#fffbe6' : '#ecfdf5',
                    padding: '4px 12px',
                    borderRadius: '8px'
                }}>
                    {v}
                </span>
            )
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <SectionHeader 
                title="Gestión de Bodega (Kardex)"
                description="Control de inventario basado en eventos. Todos los movimientos son inmutables y trazables."
            />

            <FilterBar 
                searchPlaceholder="Buscar por SKU o Producto..."
                onSearchChange={setSearchTerm}
            />

            <DataTable 
                columns={LOGISTICS_COLUMNS}
                data={filteredBalances}
                isLoading={loading}
                emptyMessage="No hay productos registrados en el inventario."
                rowActions={(row) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => fetchHistory(row.sku_id)}
                            title="Ver Historial (Kardex)"
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                        >
                            <History size={16} color="#64748b" />
                        </button>
                        <button 
                            onClick={() => { setAdjustmentTarget(row); setShowAdjustment(true); }}
                            title="Registrar Movimiento"
                            style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                        >
                            <ArrowLeftRight size={16} color="#8f0653" />
                        </button>
                    </div>
                )}
            />

            {/* Modal de Ajuste / Movimiento */}
            {showAdjustment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '800', color: '#1e1b4b' }}>Registrar Movimiento</h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b' }}>
                            Producto: <strong>{adjustmentTarget?.product_name}</strong> ({adjustmentTarget?.sku})
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Tipo de Movimiento</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => setAdjustmentForm({...adjustmentForm, type: 'receipt'})}
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid', borderColor: adjustmentForm.type === 'receipt' ? '#10b981' : '#e2e8f0', background: adjustmentForm.type === 'receipt' ? '#ecfdf5' : 'white', cursor: 'pointer', transition: '0.2s' }}
                                    >
                                        <Plus size={18} color="#10b981" />
                                        <div style={{ fontSize: '12px', fontWeight: '800' }}>Ingreso</div>
                                    </button>
                                    <button 
                                        onClick={() => setAdjustmentForm({...adjustmentForm, type: 'adjustment'})}
                                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid', borderColor: adjustmentForm.type === 'adjustment' ? '#f59e0b' : '#e2e8f0', background: adjustmentForm.type === 'adjustment' ? '#fffbeb' : 'white', cursor: 'pointer', transition: '0.2s' }}
                                    >
                                        <ArrowLeftRight size={18} color="#f59e0b" />
                                        <div style={{ fontSize: '12px', fontWeight: '800' }}>Ajuste / Merma</div>
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Cantidad</label>
                                    <input 
                                        type="number"
                                        value={adjustmentForm.quantity}
                                        onChange={e => setAdjustmentForm({...adjustmentForm, quantity: parseInt(e.target.value)})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Nota / Razón</label>
                                <textarea 
                                    placeholder="Ej: Recepción proveedor X, Error en conteo anterior..."
                                    value={adjustmentForm.note}
                                    onChange={e => setAdjustmentForm({...adjustmentForm, note: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', height: '80px', resize: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button 
                                onClick={() => setShowAdjustment(false)}
                                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAdjustment}
                                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#8f0653', color: 'white', fontWeight: '700', cursor: 'pointer' }}
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
                    <div style={{ padding: '20px' }}>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Producto</div>
                            <div style={{ fontWeight: '800', color: '#1e1b4b' }}>{data.product_name}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {data.history.map((m) => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ 
                                        width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: m.type === 'receipt' ? '#ecfdf5' : m.type === 'sale' ? '#fef2f2' : '#fffbeb'
                                    }}>
                                        {m.type === 'receipt' ? <Plus size={20} color="#10b981" /> : m.type === 'sale' ? <Minus size={20} color="#ef4444" /> : <ArrowLeftRight size={20} color="#f59e0b" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>
                                                {m.type === 'receipt' ? 'Ingreso' : m.type === 'sale' ? 'Venta' : 'Ajuste'}
                                            </span>
                                            <span style={{ fontSize: '14px', fontWeight: '900', color: m.quantity > 0 ? '#10b981' : '#ef4444' }}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(m.created_at).toLocaleString()}</div>
                                        {m.note && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>"{m.note}"</div>}
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
