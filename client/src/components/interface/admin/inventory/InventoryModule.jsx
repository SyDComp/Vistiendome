import React, { useState, useEffect, useCallback } from 'react';
import ProductForm from './ProductForm';
import CategoryManager from './CategoryManager';
import CharacteristicManager from './CharacteristicManager';
import FilterManager from './FilterManager';
import SpecificationManager from './SpecificationManager';
import LogisticsManager from './LogisticsManager';
import ColorManager from './ColorManager';
import CollectionManager from './CollectionManager';
import LibraryPicker from './LibraryPicker';
import SectionHeader from '../../../ui/admin/SectionHeader';
import FilterBar from '../../../ui/admin/FilterBar';
import DataTable from '../../../ui/admin/DataTable';
import Pagination from '../../../ui/admin/Pagination';
import RowActions from '../../../ui/admin/RowActions';
import Imagen from '../../../ui/Imagen';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import QuickPeek from '../../../ui/admin/QuickPeek';
import { useNotification } from '../../../../context/NotificationContext';
import { useLocation } from 'react-router-dom';
import { Package, Eye, Barcode as BarcodeIcon, AlertTriangle } from 'lucide-react';
import ReactBarcode from 'react-barcode';

const API_BASE = `/api/v1/admin/catalog`;
const PAGE_SIZE = 20;

// Configuración global de stock (fácilmente parametrizable)
const STOCK_THRESHOLD = 5;

const SkuCell = ({ sku, barcodeValue }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="sku-cell-wrapper">
            <div className="sku-cell-header">
                <span className="sku-cell-text">{sku}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShow(!show); }}
                    className={`sku-barcode-btn ${show ? 'active' : 'inactive'}`}
                    title={show ? "Ocultar código de barras" : "Ver código de barras"}
                >
                    <BarcodeIcon size={14} />
                </button>
            </div>
            {show && (
                <div className="sku-barcode-container">
                    <ReactBarcode value={barcodeValue || sku || '000000'} format="CODE128" width={1.2} height={30} fontSize={10} displayValue={true} margin={0} background="transparent" />
                </div>
            )}
        </div>
    );
};

// Badge de categoría
const CategoryBadge = ({ name }) => (
    <span className="category-badge">
        {name}
    </span>
);

// Badge de tipo
const TypeBadge = ({ type }) => {
    const typeClass = type === 'prenda' ? 'prenda' : type === 'accesorio' ? 'accesorio' : 'default';
    const label = type === 'prenda' ? 'Prenda' : type === 'accesorio' ? 'Accesorio' : type;
    return (
        <span className={`type-badge ${typeClass}`}>
            {label}
        </span>
    );
};

// Badge de stock
const StockBadge = ({ count }) => {
    const isLow = count < 5;
    const isEmpty = count === 0;
    const statusClass = isEmpty ? 'empty' : isLow ? 'low' : 'normal';
    return (
        <span className={`stock-badge ${statusClass}`}>
            {count} und.
        </span>
    );
};

const PRODUCT_COLUMNS = [
    { 
        key: 'image', 
        label: '', 
        width: '70px', 
        render: (v, row, { onPeek }) => (
            <div 
                onClick={(e) => { e.stopPropagation(); onPeek(row); }}
                className="admin-product-thumb"
            >
                {v ? (
                    <Imagen url={v} sizes="70px" alt="" />
                ) : (
                    <div className="admin-product-thumb-placeholder">
                        <Package size={22} />
                    </div>
                )}
            </div>
        )
    },
    { key: 'name', label: 'Producto', render: (v) => <span className="admin-product-name">{v}</span> },
    { key: 'category', label: 'Categoría', render: (v) => <CategoryBadge name={v} /> },
    { 
        key: 'price', 
        label: 'Precio', 
        render: (_, row) => {
            const min = row.price_min || 0;
            const max = row.price_max || 0;
            // min en 0 con max mayor = hay variantes sin precio cargado (no es un
            // regalo: esas variantes se muestran en $0 y no se pueden comprar).
            const faltanPrecios = min === 0 && max > 0;
            return (
                <span className="admin-product-price" style={faltanPrecios ? { display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#b45309' } : undefined}>
                    {faltanPrecios && <AlertTriangle size={14} />}
                    {min === max ? `$${min.toLocaleString()}` : `$${min.toLocaleString()} - $${max.toLocaleString()}`}
                    {faltanPrecios && <em style={{ fontSize: '11px', fontStyle: 'normal', fontWeight: 700 }} title="Hay variantes en $0 — revísalas en Producción › Sin precio">sin precio</em>}
                </span>
            );
        }
    },
    { 
        key: 'stock_total', 
        label: 'Stock', 
        width: '100px',
        render: (v) => (
            <span className={`admin-stock-val ${v > 0 ? 'positive' : 'negative'}`}>
                {v} und.
            </span>
        ) 
    },
];

const VARIANT_COLUMNS = [
    { 
        key: 'image_url', 
        label: 'Imagen', 
        width: '80px', 
        render: (v, row, { onPeek }) => (
            <div 
                onClick={(e) => { e.stopPropagation(); onPeek(row, 'variant'); }}
                className="admin-product-thumb"
            >
                {v ? (
                    <Imagen url={v} sizes="70px" alt="" />
                ) : (
                    <div className="admin-product-thumb-placeholder">
                        <Package size={22} />
                    </div>
                )}
            </div>
        )
    },
    { key: 'sku', label: 'SKU', render: (v, row) => <SkuCell sku={v} barcodeValue={row.barcode} /> },
    { key: 'product_name', label: 'Producto Padre', render: (v) => <span className="admin-product-name parent">{v}</span> },
    { 
        key: 'config', 
        label: 'Combinación', 
        render: (v) => (
            <div className="admin-variant-config-wrapper">
                {Object.values(v || {}).map((val, i) => (
                    <span key={i} className="admin-variant-config">{val}</span>
                ))}
            </div>
        )
    },
    {
        key: 'price',
        label: 'Precio',
        width: '110px',
        render: (v) => v ? (
            <span className="admin-product-price">${v.toLocaleString()}</span>
        ) : (
            <span className="admin-product-price" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#b45309', fontWeight: 700 }} title="Sin precio cargado — no se puede comprar en el sitio">
                <AlertTriangle size={13} /> $0
            </span>
        )
    },
    { 
        key: 'stock', 
        label: 'Stock', 
        width: '100px',
        render: (v) => (
            <span className={`admin-stock-val ${v > 0 ? 'positive' : 'negative'}`}>
                {v} und.
            </span>
        ) 
    },
];

const InventoryModule = ({ view = 'products' }) => {
    const { toast, confirm } = useNotification();
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Estado de productos con paginación
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const location = useLocation();
    const [search, setSearch] = useState(location.state?.initialSearch || '');
    const [activeFilters, setActiveFilters] = useState({});
    const [categories, setCategories] = useState([]);
    const [showDetail, setShowDetail] = useState(false);
    const [showQuickPeek, setShowQuickPeek] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [quickPeekData, setQuickPeekData] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [baseProducts, setBaseProducts] = useState([]); // Productos base reales para el picker "Nueva Variante"
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

    // POLÍTICA DE MESA LIMPIA: Cerrar todo al cambiar de sección/vista
    useEffect(() => {
        setShowForm(false);
        setEditingProduct(null);
        setShowDetail(false);
        setDetailData(null);
        setShowPicker(false);
        setPage(1); // Resetear paginación por cortesía
        setSearch('');
        setActiveFilters({});
    }, [view]);

    useEffect(() => {
        if (view === 'products' || view === 'variants') fetchProducts();
    }, [view, fetchProducts]);

    // Abrir el picker de "Nueva Variante" cargando SIEMPRE productos base reales,
    // sin importar si estamos en la vista de productos o de variantes.
    const openVariantBasePicker = async () => {
        try {
            const params = new URLSearchParams({ page: 1, page_size: 200 });
            const res = await fetch(`${API_BASE}/products?${params}`);
            const data = await res.json();
            const baseItems = data.items || [];
            if (baseItems.length === 0) {
                toast.info("Primero debes crear al menos un producto base.");
                return;
            }
            setBaseProducts(baseItems);
            setShowPicker(true);
        } catch (err) {
            console.error('Error cargando productos base:', err);
            toast.error('No se pudieron cargar los productos base.');
        }
    };

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
        } catch {
            toast.error('Error de red al intentar eliminar');
        }
    };

    const handleEditProduct = async (product) => {
        try {
            setDetailLoading(true);
            setEditingProduct(null);
            setShowForm(true);
            const res = await fetch(`${API_BASE}/products/${product.id}`);
            const fullData = await res.json();
            setEditingProduct(fullData);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el producto para edición.");
        } finally {
            setDetailLoading(false);
        }
    };

    const handleViewProduct = async (row) => {
        try {
            setDetailLoading(true);
            setDetailData(null);
            setShowDetail(true);
            const endpoint = view === 'variants' ? `skus/${row.id}` : `products/${row.id}`;
            const res = await fetch(`${API_BASE}/${endpoint}`);
            const fullData = await res.json();
            setDetailData(fullData);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el detalle del registro.");
        } finally {
            setDetailLoading(false);
        }
    };

    const handleQuickPeek = async (row) => {
        try {
            setDetailLoading(true);
            setQuickPeekData(null);
            setShowQuickPeek(true);
            const endpoint = view === 'variants' ? `skus/${row.id}` : `products/${row.id}`;
            const res = await fetch(`${API_BASE}/${endpoint}`);
            const fullData = await res.json();
            setQuickPeekData(fullData);
        } catch (err) {
            console.error("Error cargando quick peek:", err);
        } finally {
            setDetailLoading(false);
        }
    };

    if (showForm) {
        return (
            <div className={`admin-inventory-form-container ${isMobile ? 'mobile' : 'desktop'}`}>
                <button
                    onClick={() => { 
                        setShowForm(false); 
                        setEditingProduct(null); 
                        fetchProducts(); // Refrescar al volver para asegurar consistencia
                    }}
                    className={`admin-back-btn ${isMobile ? 'mobile' : 'desktop'}`}
                >
                    ← Volver al Listado
                </button>
                <div style={{ paddingBottom: '40px' }}>
                    {detailLoading ? (
                        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#8f0653', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                            Cargando datos del producto...
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-inventory-module">

            {view === 'categories' ? (
                <CategoryManager />
            ) : view === 'filters' ? (
                <FilterManager />
            ) : view === 'characteristics' || view === 'attributes' ? (
                <CharacteristicManager />
            ) : view === 'specifications' ? (
                <SpecificationManager />
            ) : view === 'logistics' || view === 'bodega' ? (
                <LogisticsManager />
            ) : view === 'colors' ? (
                <ColorManager />
            ) : view === 'collections' ? (
                <CollectionManager />
            ) : (
                <>
                    {/* Cabecera de sección de Productos / Variantes */}
                    <SectionHeader
                        title={view === 'variants' ? "Catálogo de Variantes" : "Catálogo de Productos"}
                        description={view === 'variants' ? `${totalItems} variante${totalItems !== 1 ? 's' : ''} en total` : `${totalItems} producto${totalItems !== 1 ? 's' : ''} en total`}
                        action={view === 'variants' ? [
                            { label: '📦 Nueva Variante', onClick: openVariantBasePicker, variant: 'primary' }
                        ] : [
                            { label: '＋ Nuevo Producto', onClick: () => setShowForm(true), variant: 'primary' },
                            { label: '📦 Nueva Variante', onClick: openVariantBasePicker, variant: 'outline' }
                        ]}
                    />

                    {/* Filtros */}
                    <FilterBar
                        key={view}
                        searchPlaceholder={view === 'variants' ? "Buscar por SKU o producto..." : "Buscar producto por nombre..."}
                        initialSearchValue={search}
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
                        context={{ onPeek: handleQuickPeek }}
                        rowActions={(row) => (
                            <RowActions
                                customButtons={[
                                    { icon: <Eye size={16} />, onClick: () => handleQuickPeek(row, view === 'variants' ? 'variant' : 'product'), title: 'Vistazo Rápido', variant: 'secondary' }
                                ]}
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
                onUpdate={view === 'variants' ? async (updated, current) => {
                    // Persistir precio y oferta de la variante individual
                    const skuId = current?.id || updated?.id;
                    if (!skuId) { toast.error('No se pudo identificar la variante'); return; }
                    try {
                        const res = await fetch(`${API_BASE}/skus/${skuId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                price: updated.price,
                                sale_type: updated.sale_type || null,
                                sale_value: updated.sale_type ? (updated.sale_value ?? null) : null,
                                sale_start: updated.sale_type ? (updated.sale_start || null) : null,
                                sale_end: updated.sale_type ? (updated.sale_end || null) : null,
                            })
                        });
                        if (res.ok) {
                            toast.success('Versión actualizada');
                            fetchProducts();
                        } else {
                            const err = await res.json().catch(() => ({}));
                            toast.error(err.detail || 'No se pudo guardar la versión');
                        }
                    } catch {
                        toast.error('Error de red al guardar la versión');
                    }
                } : null}
            />

            <QuickPeek 
                isOpen={showQuickPeek}
                onClose={() => setShowQuickPeek(false)}
                data={quickPeekData}
                type={view === 'variants' ? 'variant' : 'product'}
            />

            <LibraryPicker
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                items={baseProducts}
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
