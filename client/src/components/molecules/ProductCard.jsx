import React from 'react';
import { useConfig } from '../../context/ConfigContext';
import SmartImage from '../atoms/SmartImage';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const { configs } = useConfig();
    const isCatalogMode = configs?.catalog_mode === 'Activado';

    // Fallback image if none provided
    const imageSrc = product.images && product.images.length > 0
        ? `${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${product.images[0]}`
        : 'https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=2564&auto=format&fit=crop';

    return (
        <div className="product-card">
            <div className="card-image-container">
                <SmartImage 
                    src={imageSrc}
                    settings={product.image_settings}
                />
                <div className="card-overlay">
                    <button className="btn-quick-view">Vista Rápida</button>
                </div>
            </div>
            
            {/* Floating Badges Container */}
            <div className="badges-container">
                {product.stock <= 0 && <span className="badge-out-of-stock">Agotado</span>}
                {product.stock > 0 && product.stock < 5 && <span className="badge-low-stock">Últimas unidades</span>}
                {product.mercadolibre_url && (
                    <span className="badge-mercadolibre">
                        Pieza en ML
                    </span>
                )}
            </div>

            <div className="card-info">
                <div className="card-header">
                    <h3 className="product-title">{product.name}</h3>
                    {!isCatalogMode && <span className="product-price">${Number(product.price).toLocaleString('es-CL')}</span>}
                </div>
                <p className="product-category">{product.category?.name || 'Artesanía'}</p>
            </div>
        </div>
    );
};

export default ProductCard;
