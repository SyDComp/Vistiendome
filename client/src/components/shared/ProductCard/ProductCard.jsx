import { useState, useEffect } from 'react';
import PremiumImage from '../../ui/PremiumImage';
import './ProductCard.css';

const ProductCard = ({
    type = 'vertical',
    name,
    description,
    destination,
    onRedirect,
    images = [],
    interval = 3000,
    isPaused = false,
    image,
    // srcset que manda el servidor para `image`. Vacio = se usa la foto
    // original tal cual, asi que nada se rompe si no tiene derivadas.
    imageSrcSet = '',
    // Derivadas de las fotos del carrusel, por URL.
    srcSetPorUrl = {},
    priority = false,
    price,
    originalPrice,
    onSale = false,
    pricePrefix,
    backgroundColor = '#f8fafc',
    onClick,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const imageList = images.length > 0 ? images : [image];
    
    // Si React reutiliza el componente y la nueva lista es más corta, evitamos out-of-bounds
    const safeCurrentIndex = currentIndex >= imageList.length ? 0 : currentIndex;
    const safeNextIndex = nextIndex >= imageList.length ? 0 : nextIndex;
    
    const currentImage = imageList[safeCurrentIndex];
    const nextImage = imageList[safeNextIndex];

    // Carrusel automático con cross-fade
    useEffect(() => {
        if (imageList.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            const nextIdx = (safeCurrentIndex + 1) % imageList.length;
            setNextIndex(nextIdx);
            setIsTransitioning(true);

            setTimeout(() => {
                setCurrentIndex(nextIdx);
                setIsTransitioning(false);
            }, 800);
        }, interval);

        return () => clearInterval(timer);
    }, [imageList, interval, safeCurrentIndex, isPaused]);

    const handleClick = () => {
        if (onClick) {
            onClick(safeCurrentIndex);
        } else if (onRedirect) {
            onRedirect(destination, safeCurrentIndex);
        }
    };

    if (type === 'post') {
        return (
            <div className="product-card product-card--post" onClick={handleClick}>
                <div className="product-card__post-content">
                    <h3>{name}</h3>
                    <p>{description}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="product-card product-card--vertical"
            onClick={handleClick}
            style={{ backgroundColor }}
        >
            <div className="product-card__images">
                {onSale && <span className="product-card__sale-badge">Oferta</span>}
                <PremiumImage
                    src={currentImage}
                    srcSet={srcSetPorUrl[currentImage] || (currentImage === image ? imageSrcSet : '')}
                    priority={priority}
                    alt={name}
                    className="product-card__image product-card__image--current"
                    style={{ position: 'absolute' }}
                    objectFit="contain"
                />
                {isTransitioning && (
                    <PremiumImage
                        src={nextImage}
                        srcSet={srcSetPorUrl[nextImage] || ''}
                        alt={name}
                        className="product-card__image product-card__image--next"
                        style={{ position: 'absolute' }}
                        objectFit="contain"
                    />
                )}
            </div>

            <div className="product-card__info">
                <h3 className="product-card__name">{name}</h3>
                {price && (
                    <div className="product-card__price-container">
                        {pricePrefix && <span className="product-card__price-prefix">{pricePrefix}</span>}
                        {originalPrice && (
                            <span className="product-card__price-original">{originalPrice}</span>
                        )}
                        <span className={`product-card__price${onSale ? ' product-card__price--sale' : ''}`}>{price}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
