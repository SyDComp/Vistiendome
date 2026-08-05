import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Hammer, Package, ArrowRight, LayoutDashboard, Zap } from 'lucide-react';
import BatchVariantEditor from './BatchVariantEditor';

const API_BASE = `/api/v1/admin/catalog`;

const WorkspaceModule = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showBatchEditor, setShowBatchEditor] = useState(false);
    const [productVariants, setProductVariants] = useState([]);
    const [allAttributes, setAllAttributes] = useState([]);
    const [categoryAttributes, setCategoryAttributes] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Cargamos productos (Sin límites)
                const resP = await fetch(`${API_BASE}/products?page_size=999999`);
                const dataP = await resP.json();
                setProducts(dataP.items || []);

                // 2. Cargamos TODOS los atributos del catálogo (Crucial para ver todas las opciones)
                const resA = await fetch(`${API_BASE}/attributes`);
                const dataA = await resA.json();
                setAllAttributes(dataA || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectProduct = async (product) => {
        setLoading(true);
        try {
            // 1. Cargamos el producto completo
            const resProd = await fetch(`${API_BASE}/products/${product.id}`);
            const fullProduct = await resProd.json();
            
            // 2. Cargamos todas sus variantes (SKUs) - Sin límites
            const resSkus = await fetch(`${API_BASE}/skus?product_id=${product.id}&page_size=999999&t=${Date.now()}`);
            const skusData = await resSkus.json();

            // 3. Cargamos los atributos de la categoría Y la biblioteca global para cruzar datos
            const [resCatAttrs, resGlobalAttrs] = await Promise.all([
                fetch(`${API_BASE}/categories/${fullProduct.category_id}/attributes`),
                fetch(`${API_BASE}/attributes`)
            ]);
            
            const catAttrs = await resCatAttrs.json();
            const globalAttrs = await resGlobalAttrs.json();

            // Guardamos los nombres de los atributos de la categoría para el filtro del Workspace
            const catAttrNames = (catAttrs || []).map(a => a.name);
            
            setSelectedProduct(fullProduct);
            setProductVariants(skusData.items || []);
            setAllAttributes(globalAttrs || []); // Biblioteca completa para el dominio
            setCategoryAttributes(catAttrNames); // Nuevo estado para filtrar visualmente
            setShowBatchEditor(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (showBatchEditor) {
        return (
            <div className="workspace-layout batch-editor-active-layout">
                <BatchVariantEditor 
                    product={selectedProduct}
                    initialVariants={productVariants}
                    allAttributes={allAttributes}
                    categoryAttributes={categoryAttributes}
                    onClose={() => setShowBatchEditor(false)}
                    onSave={() => {
                        // Opcional: refrescar datos si es necesario
                    }}
                />
            </div>
        );
    }

    return (
        <div className="workspace-layout">
            <div className="workspace-container">
                <div className="workspace-icon-wrapper">
                    <Zap size={36} fill="#fff" />
                </div>

                <h1 className="workspace-title">
                    Espacio de Producción
                </h1>
                <p className="workspace-subtitle">
                    Selecciona un lienzo del catálogo para entrar en el <strong>Modo Transformación</strong> y gestionar visualmente sus variantes.
                </p>

                {/* Buscador de Alto Impacto */}
                <div className="workspace-search-wrapper">
                    <div className="workspace-search-icon">
                        <Search size={24} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Escribe el nombre del producto para empezar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="workspace-search-input"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="workspace-search-btn-clear"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Resultados Rápidos */}
                <div className="workspace-results-wrapper">
                    {loading ? (
                        <div className="workspace-loading">Preparando mesa de trabajo...</div>
                    ) : filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleSelectProduct(p)}
                                className="workspace-result-item"
                            >
                                <div className="workspace-result-icon">
                                    <Package size={24} />
                                </div>
                                <div className="workspace-result-info">
                                    <div className="workspace-result-name">{p.name}</div>
                                    <div className="workspace-result-cat">{p.category}</div>
                                </div>
                                <div className="workspace-result-arrow">
                                    <ArrowRight size={20} />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="workspace-empty-msg">
                            No se encontró el lienzo solicitado. Verifica el nombre.
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default WorkspaceModule;
