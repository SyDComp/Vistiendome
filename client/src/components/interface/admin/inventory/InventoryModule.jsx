import React, { useState, useEffect, useCallback } from 'react';
import ProductForm from './ProductForm';
import CategoryManager from './CategoryManager';
import CharacteristicManager from './CharacteristicManager';
import SpecificationManager from './SpecificationManager';
import LogisticsManager from './LogisticsManager';
import ColorManager from './ColorManager';
import LibraryPicker from './LibraryPicker';
import SectionHeader from '../../../ui/admin/SectionHeader';
import FilterBar from '../../../ui/admin/FilterBar';
import DataTable from '../../../ui/admin/DataTable';
import Pagination from '../../../ui/admin/Pagination';
import RowActions from '../../../ui/admin/RowActions';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import { useNotification } from '../../../../context/NotificationContext';
import { Package } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1/admin/catalog';
const PAGE_SIZE = 20;

// Configuración global de stock (fácilmente parametrizable)
const STOCK_THRESHOLD = 5;

// Badge de categoría
const CategoryBadge = ({ name }) => (
    <span style={{
        padding: '3px 10px',
        background: '#eff6ff',
        color: '#3b82f6',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    }}>
        {name}
    </span>
);

// Badge de tipo
const TypeBadge = ({ type }) => {
    const config = {
        prenda: { bg: '#f0fdf4', color: '#16a34a', label: 'Prenda' },
        accesorio: { bg: '#fdf4ff', color: '#9333ea', label: 'Accesorio' }
    };
    const c = config[type] || { bg: '#f1f5f9', color: '#64748b', label: type };
    return (
        <span style={{ padding: '3px 10px', background: c.bg, color: c.color, borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
            {c.label}
        </span>
    );
};

// Badge de stock
const StockBadge = ({ count }) => {
    const isLow = count < 5;
    const isEmpty = count === 0;
    return (
        <span style={{
            padding: '3px 10px',
            background: isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4',
            color: isEmpty ? '#ef4444' : isLow ? '#d97706' : '#15803d',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700'
        }}>
            {count} und.
        </span>
    );
};

const PRODUCT_COLUMNS = [
    { key: 'name', label: 'Producto', render: (v) => <span style={{ fontWeight: '700', color: '#1e1b4b' }}>{v}</span> },
    { key: 'category', label: 'Categoría', render: (v) => <CategoryBadge name={v} /> },
    { key: 'stock_total', label: 'Stock Total', width: '140px', render: (v) => <StockBadge count={v} /> },
];

const VARIANT_COLUMNS = [
    { 
        key: 'image_url', 
        label: 'Imagen', 
        width: '80px', 
        render: (v) => v ? (
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                <img src={`http://localhost:8000${v}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
        ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                <Package size={20} />
            </div>
        )
    },
    { key: 'sku', label: 'SKU', render: (v) => <span style={{ fontWeight: '800', color: '#1e1b4b', fontFamily: 'monospace' }}>{v}</span> },
    { key: 'product_name', label: 'Producto Padre', render: (v) => <span style={{ fontWeight: '600', color: '#64748b' }}>{v}</span> },
    { 
        key: 'config', 
        label: 'Combinación', 
        render: (v) => (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {Object.values(v || {}).map((val, i) => (
                    <span key={i} style={{ padding: '2px 8px', background: '#fdf2f8', color: '#8f0653', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>{val}</span>
                ))}
            </div>
        )
    },
    { key: 'price', label: 'Precio', width: '110px', render: (v) => <span style={{ fontWeight: '800', color: '#16a34a' }}>${v?.toLocaleString()}</span> },
    { key: 'stock', label: 'Stock', width: '110px', render: (v) => <StockBadge count={v} /> },
];

const InventoryModule = ({ view = 'products' }) => {
    const { toast, confirm } = useNotification();
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Estado de productos con paginación
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [categories, setCategories] = useState([]);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerContext, setPickerContext] = useState(null);
    const [autoOpenVariants, setAutoOpenVariants] = useState(false);
    const [characteristics, setCharacteristics] = useState([]);

    // Cargar categorías y características para los filtros
    useEffect(() => {
        // Categorías
        fetch(`${API_BASE}/categories?page_size=200`)
            .then(r => r.json())
            .then(data => setCategories(data.items || []))
            .catch(console.error);
        
        // Características (Atributos para variantes)
        fetch(`${API_BASE}/attributes`)
            .then(r => r.json())
            .then(data => setCharacteristics(data || []))
            .catch(console.error);
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
            if (search) params.append('search', search);
            if (activeFilters.category_id) params.append('category_id', activeFilters.category_id);
            if (activeFilters.type) params.append('type', activeFilters.type);
            
            // Filtros específicos de variantes
            if (view === 'variants') {
                if (activeFilters.stock_status) {
                    params.append('stock_status', activeFilters.stock_status);
                    params.append('stock_threshold', STOCK_THRESHOLD);
                }
                
                // Filtros de atributos dinámicos
                Object.keys(activeFilters).forEach(key => {
                    if (key.startsWith('attr_')) {
                        params.append(key, activeFilters[key]);
                    }
                });
            }

            const endpoint = view === 'variants' ? '/skus' : '/products';
            const res = await fetch(`${API_BASE}${endpoint}?${params}`);
            const data = await res.json();
            setProducts(data.items || []);
            setTotalPages(data.total_pages || 1);
            setTotalItems(data.total || 0);
        } catch (err) {
            console.error('Error cargando datos:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, activeFilters, view]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (view === 'products' || view === 'variants') fetchProducts();
    }, [view, fetchProducts]);

    // Resetear página al cambiar filtros
    const handleSearchChange = (val) => { setSearch(val); setPage(1); };
    const handleFilterChange = (filters) => { setActiveFilters(filters); setPage(1); };

    const handleDelete = async (row) => {
        // En desarrollo, queremos alertar sobre el Hard Delete si hay versiones
        const hasVersions = row.stock_total > 0 || row.sku_count > 0; // sku_count vendría del backend ajustado
        
        let message = '¿Estás seguro de que quieres eliminar este producto?';
        if (hasVersions) {
            message = `Este producto tiene versiones activas. ¿Deseas continuar con la eliminación completa del producto y todas sus versiones? Esta acción no se puede deshacer.`;
        }

        if (!await confirm(message)) return;

        try {
            // Enviamos force=true por si acaso para asegurar el Hard Delete en desarrollo
            const res = await fetch(`${API_BASE}/products/${row.id}?force=true`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Producto eliminado con éxito');
                fetchProducts();
            } else {
                toast.error('No se pudo eliminar el producto');
            }
        } catch (err) {
            toast.error('Error de red al intentar eliminar');
        }
    };

    const handleEditProduct = async (product) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/products/${product.id}`);
            const fullData = await res.json();
            setEditingProduct(fullData);
            setShowForm(true);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el producto para edición.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewProduct = async (row) => {
        try {
            setLoading(true);
            // Si es una variante, usamos el endpoint de SKUs
            const endpoint = view === 'variants' ? `skus/${row.id}` : `products/${row.id}`;
            const res = await fetch(`${API_BASE}/${endpoint}`);
            const fullData = await res.json();
            setDetailData(fullData);
            setShowDetail(true);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el detalle del registro.");
        } finally {
            setLoading(false);
        }
    };

    if (showForm) {
        return (
            <div style={{ height: '100%', overflowY: 'auto', animation: 'fadeIn 0.3s ease', padding: isMobile ? '5px' : '0' }}>
                <button
                    onClick={() => { 
                        setShowForm(false); 
                        setEditingProduct(null); 
                        fetchProducts(); // Refrescar al volver para asegurar consistencia
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'none', border: 'none', color: '#8f0653',
                        cursor: 'pointer', fontWeight: '700', marginBottom: '24px',
                        fontSize: '14px', padding: '10px 0', width: isMobile ? '100%' : 'auto'
                    }}
                >
                    ← Volver al Listado
                </button>
                <div style={{ paddingBottom: '40px' }}>
                    <ProductForm
                        initialData={editingProduct}
                        autoOpenVariants={autoOpenVariants}
                        onRefresh={fetchProducts} // Callback para refresco en segundo plano
                        onSuccess={() => { 
                            setShowForm(false); 
                            setEditingProduct(null); 
                            setAutoOpenVariants(false);
                            fetchProducts(); 
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.3s ease', overflow: 'hidden' }}>

            {view === 'categories' ? (
                <CategoryManager />
            ) : view === 'characteristics' || view === 'attributes' ? (
                <CharacteristicManager />
            ) : view === 'specifications' ? (
                <SpecificationManager />
            ) : view === 'logistics' || view === 'bodega' ? (
                <LogisticsManager />
            ) : view === 'colors' ? (
                <ColorManager />
            ) : (
                <>
                    {/* Cabecera de sección de Productos */}
                    <SectionHeader
                        title="Catálogo de Productos"
                        description={`${totalItems} producto${totalItems !== 1 ? 's' : ''} en total`}
                        action={[
                            { label: '＋ Nuevo Producto', onClick: () => setShowForm(true), variant: 'primary' },
                            { label: '📦 Nueva Variante', onClick: () => {
                                if (products.length === 0) {
                                    toast.info("Primero debes crear al menos un producto base.");
                                } else {
                                    setPickerContext('variant_base');
                                    setShowPicker(true);
                                }
                            }, variant: 'outline' }
                        ]}
                    />

                    {/* Filtros */}
                    <FilterBar
                        searchPlaceholder={view === 'variants' ? "Buscar por SKU o producto..." : "Buscar producto por nombre..."}
                        onSearchChange={handleSearchChange}
                        activeFilters={activeFilters}
                        onFilterChange={handleFilterChange}
                        filters={[
                            {
                                key: 'category_id',
                                label: 'Categoría',
                                options: categories
                                    .filter(c => c.slug !== 'sin_categoria')
                                    .map(c => ({ value: c.id, label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name }))
                            },
                            ...(view === 'variants' ? [
                                {
                                    key: 'stock_status',
                                    label: 'Disponibilidad',
                                    options: [
                                        { value: 'disponible', label: '✅ Disponible' },
                                        { value: 'bajo_stock', label: `⚠️ Bajo Stock (<${STOCK_THRESHOLD})` },
                                        { value: 'agotado', label: '❌ Agotado' }
                                    ]
                                },
                                // Añadir una opción de filtro por cada característica dinámica
                                ...characteristics.map(char => ({
                                    key: `attr_${char.name}`,
                                    label: char.name,
                                    options: (char.domain || []).map(opt => ({
                                        value: opt.value,
                                        label: opt.label || opt.value
                                    }))
                                }))
                            ] : [])
                        ]}
                    />

                    {/* Tabla */}
                    <DataTable
                        columns={view === 'variants' ? VARIANT_COLUMNS : PRODUCT_COLUMNS}
                        data={products}
                        isLoading={loading}
                        emptyMessage={view === 'variants' ? "No se encontraron variantes." : "No se encontraron productos con los filtros aplicados."}
                        rowActions={(row) => (
                            <RowActions
                                onView={() => handleViewProduct(row)}
                                onEdit={() => view === 'variants' ? handleViewProduct(row) : handleEditProduct(row)}
                                onDelete={() => view === 'variants' ? null : handleDelete(row)}
                            />
                        )}
                    />

                    {/* Paginación */}
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                    />
                </>
            )}

            <DetailDrawer 
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type={view === 'variants' ? 'variant' : 'product'}
                title={view === 'variants' ? detailData?.sku : detailData?.name}
                onUpdate={view === 'variants' ? (updated) => {
                    // Refrescar lista al guardar cambios en variante
                    fetchProducts();
                } : null}
            />

            <LibraryPicker 
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                items={products}
                onSelect={(selected) => {
                    const product = selected[0];
                    if (product) {
                        handleEditProduct(product);
                        setAutoOpenVariants(true);
                        setShowPicker(false);
                    }
                }}
                title="Seleccionar Producto Base"
                description="Escoge el modelo base para el cual quieres crear una nueva versión específica."
                type="products"
                labelSingular="producto"
                labelPlural="productos"
                allowMultiple={false}
            />
        </div>
    );
};

export default InventoryModule;
