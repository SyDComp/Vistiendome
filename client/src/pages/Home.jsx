import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ContentBlock from '../components/organisms/ContentBlock';
import Button from '../components/atoms/Button';
import HomeCTA from '../components/molecules/HomeCTA';
import ProductModal from '../components/molecules/ProductModal';
import { getCollectionImage } from '../utils/collectionConfig';
import { useConfig } from '../context/ConfigContext';
import SmartImage from '../components/atoms/SmartImage';
import './Home.css';

const CategoryCard = ({ title, image, link, imageSettings }) => {
    return (
        <Link to={link || '/catalogo'} className="category-card-link">
            <div className="category-card">
                <div className="category-image-wrapper">
                    <SmartImage 
                        src={image} 
                        settings={imageSettings} 
                    />
                </div>
                <div className="category-info">
                    <h3>{title}</h3>
                    <span className="category-link">Ver Colección</span>
                </div>
            </div>
        </Link>
    );
};

export default function Home() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { configs, loading: loadingConfig } = useConfig();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        fetchCategories();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/products/categories');
            if (response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error("Error fetching categories for home:", error);
        }
    };

    // Helper to process data that might be stringified
    const safeParse = (data, fallback = [], key = '') => {
        if (!data) return fallback;
        if (typeof data === 'object') return data;

        // If it's a string but we expect JSON (based on key or fallback type)
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`Error parsing JSON for key ${key}:`, e);
            return fallback;
        }
    };

    // Fallback values for config
    const homeConfig = {
        home_hero_title: configs.home_hero_title || 'Creando espacios\ncon alma.',
        home_hero_subtitle: configs.home_hero_subtitle || 'DISEÑO & ARTESANÍA',
        home_hero_desc: configs.home_hero_desc || 'Piezas únicas hechas a mano que combinan tradición artesanal con diseño contemporáneo. Descubre la belleza de lo auténtico.',
        home_hero_bg: configs.home_hero_bg || 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?q=80&w=2574&auto=format&fit=crop',
        home_hero_bg_settings: safeParse(configs.home_hero_bg_settings, { zoom: 1, x: 50, y: 50, shape: 'original' }, 'hero_settings'),
        home_sections: safeParse(configs.home_sections, [], 'sections'),
        home_collections: safeParse(configs.home_collections, [], 'collections')
    };

    // Helper to process newlines in text
    const renderTextWithNewlines = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [navigate]);

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileMenuOpen(false);
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    // Determine which collections to show
    let collectionsToRender = [];

    if (homeConfig.home_collections.length > 0) {
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        collectionsToRender = homeConfig.home_collections
            .filter(col => col && col.category_id)
            .map(col => ({
                id: col.category_id,
                name: col.alias || col.category_name || categories.find(c => String(c.id) === String(col.category_id))?.name || 'Colección',
                image: col.product_image ? `${apiUrl.replace('/api/v1', '')}/static/${col.product_image}` : getCollectionImage(col.category_name || ''),
                link: `/catalogo?category=${col.category_id}`,
                imageSettings: col.image_settings
            }));
    }

    // Fallback if no collections
    if (collectionsToRender.length === 0) {
        collectionsToRender = categories.slice(0, 3).map(cat => ({
            id: cat.id,
            name: cat.name,
            image: getCollectionImage(cat.slug || cat.name),
            link: `/catalogo?category=${cat.id}`,
            imageSettings: { shape: 'square' }
        }));
    }

    // Handle actions from ContentBlocks (e.g., opening product modal)
    const handleAction = async (action, data) => {
        if (action === 'open_product' && data) {
            try {
                const response = await api.get(`/products/${data}`);
                const product = response.data;

                if (product && product.is_active !== false) {
                    setSelectedProduct(product);
                } else {
                    console.warn("Product is inactive and cannot be viewed.");
                }
            } catch (error) {
                console.error("Error fetching product for modal:", error);
            }
        } else if (action === 'open_workshop' && data) {
            navigate(`/el-taller#workshop-${data}`);
        }
    };

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <span className="hero-subtitle">{homeConfig.home_hero_subtitle}</span>
                    <h1 className="hero-title">
                        {renderTextWithNewlines(homeConfig.home_hero_title)}
                    </h1>
                    <p className="hero-description">
                        {homeConfig.home_hero_desc}
                    </p>
                    <div className="hero-buttons">
                        <Link to="/catalogo">
                            <Button variant="primary" size="lg">Ver Catálogo</Button>
                        </Link>
                        <Link to="/nosotros">
                            <Button variant="outline" size="lg">Conocer Más</Button>
                        </Link>
                    </div>
                </div>
                <div className="hero-visual">
                    <SmartImage 
                        src={homeConfig.home_hero_bg}
                        settings={{
                            ...homeConfig.home_hero_bg_settings,
                            canvas: {
                                ...homeConfig.home_hero_bg_settings.canvas,
                                shape: homeConfig.home_hero_bg_settings.canvas?.shape || 'wide'
                            }
                        }}
                    />
                </div>
            </section>

            {/* CTA Buttons Section */}
            <HomeCTA />

            {/* Categories Section */}
            <section className="categories-section">
                <div className="section-header">
                    <h2>Colecciones</h2>
                </div>
                <div className="categories-grid">
                    {collectionsToRender.length > 0 ? (
                        collectionsToRender.map((col, index) => (
                            <CategoryCard
                                key={col.id || index}
                                title={col.name}
                                image={col.image}
                                link={col.link}
                                imageSettings={col.imageSettings}
                            />
                        ))
                    ) : (
                        <>
                            <CategoryCard
                                title="Mobiliario"
                                image="https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=2564&auto=format&fit=crop"
                                link="/catalogo"
                            />
                            <CategoryCard
                                title="Decoración"
                                image="https://images.unsplash.com/photo-1578500494198-246f612d3b3d?q=80&w=2670&auto=format&fit=crop"
                                link="/catalogo"
                            />
                            <CategoryCard
                                title="Accesorios"
                                image="https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2564&auto=format&fit=crop"
                                link="/catalogo"
                            />
                        </>
                    )}
                </div>
            </section>


            {/* Dynamic Content Blocks */}
            {homeConfig.home_sections
                .filter(block => block.visible !== false)
                .map((block, index) => (
                    <ContentBlock
                        key={block.id || index}
                        block={block}
                        onAction={handleAction}
                    />
                ))}

            {/* Product Modal */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </div>
    );
}
