import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import TableFilter from '../../../components/templates/TableFilter';
import DataTable from '../../../components/organisms/DataTable';
import { usePermissions } from '../../../hooks/usePermissions';
import { useNotification } from '../../../context/NotificationContext';
import { useModal } from '../../../context/ModalContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import api from '../../../services/api';

export default function ProductList() {
    const { canWrite, canDelete } = usePermissions();
    const canEditProducts = canWrite('products');
    const canDeleteProducts = canDelete('products');

    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const { confirm } = useModal();
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            // Fetch all products
            const productsRes = await api.get('/products');
            const allProducts = productsRes.data;
            setProducts(allProducts);

            // Set initial filtered products (default to active) to avoid flicker
            setFilteredProducts(allProducts.filter(p => p.is_active !== false));

            // Fetch categories
            const categoriesRes = await api.get('/products/categories');
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const wsMessage = useWebSocket();
    useEffect(() => {
        if (wsMessage && wsMessage.event === 'PRODUCTS_UPDATED') {
            console.log('WebSocket update received for products');
            fetchData();
        }
    }, [wsMessage]);

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Ocultar Producto',
            message: '¿Estás seguro de ocultar este producto del catálogo? Podrás volver a mostrarlo más tarde si lo deseas.',
            confirmText: 'Ocultar',
            variant: 'warning'
        });

        if (!confirmed) return;

        try {
            await api.delete(`/products/${id}`);
            // Refresh data or update local state
            setProducts(products.map(p => p.id === id ? { ...p, is_active: false } : p));
            showNotification('success', 'Producto ocultado del catálogo');
        } catch (error) {
            console.error("Delete error:", error);
            showNotification('error', 'Error al ocultar el producto');
        }
    };

    const handleRestore = async (id) => {
        try {
            await api.patch(`/products/${id}/restore`);
            setProducts(products.map(p => p.id === id ? { ...p, is_active: true } : p));
            showNotification('success', 'Producto activado nuevamente');
        } catch (error) {
            console.error("Restore error:", error);
            showNotification('error', 'Error al activar el producto');
        }
    };

    if (loading) return <div>Cargando productos...</div>;

    return (
        <div className="admin-page">
            <div
                className="page-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '3rem',
                    marginBottom: '2rem',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}
            >
                <h2>Gestión de Productos</h2>
                {canEditProducts && (
                    <Link to="/admin/products/new">
                        <Button>+ Nuevo Producto</Button>
                    </Link>
                )}
            </div>

            {/* Table Filter */}
            <TableFilter
                searchPlaceholder="Buscar por nombre o descripción..."
                searchFields={['name', 'description']}
                filters={[
                    {
                        key: 'category.id',
                        label: 'Categoría',
                        options: categories.map(cat => ({ value: cat.id, label: cat.name }))
                    }
                ]}
                quickFilters={[
                    { key: 'all', label: 'Todos' },
                    { key: 'active', label: 'Activos', filterKey: 'is_active', filterValue: true },
                    { key: 'inactive', label: 'Ocultos / Inactivos', filterKey: 'is_active', filterValue: false },
                    { key: 'low_stock', label: 'Stock Bajo', filter: (p) => p.stock < 5 }
                ]}
                defaultQuickFilter="active"
                data={products}
                onFilterChange={setFilteredProducts}
            />

            {/* Data Table */}
            <DataTable
                columns={[
                    {
                        header: 'Img',
                        width: '60px',
                        cell: (product) => (
                            product.images && product.images.length > 0 ? (
                                <img
                                    src={`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}/static/${product.images[0]}`}
                                    alt=""
                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                            ) : null
                        )
                    },
                    { header: 'Nombre', accessor: 'name' },
                    { header: 'Categoría', cell: (p) => p.category?.name },
                    { header: 'Precio', cell: (p) => `$${Number(p.price).toLocaleString()}` },
                    {
                        header: 'Stock',
                        cell: (p) => (
                            <span style={{ color: p.stock > 0 ? '#2e7d32' : '#c62828', fontWeight: '500' }}>
                                {p.stock}
                            </span>
                        )
                    },
                    {
                        header: 'Acciones',
                        cell: (product) => (
                            canEditProducts ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button className="btn-action btn-edit" onClick={() => navigate(`/admin/products/${product.id}`)}>
                                        Editar
                                    </button>
                                    {canDeleteProducts && product.is_active !== false && (
                                        <button 
                                            className="btn-action" 
                                            onClick={() => handleDelete(product.id)}
                                            style={{ backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2' }}
                                        >
                                            Ocultar
                                        </button>
                                    )}
                                    {product.is_active === false && (
                                        <button
                                            className="btn-action"
                                            onClick={() => handleRestore(product.id)}
                                            style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}
                                        >
                                            Mostrar
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>Solo lectura</span>
                            )
                        )
                    }
                ]}
                data={filteredProducts}
                emptyMessage="No hay productos registrados. ¡Crea el primero!"
            />
        </div>
    );
}
