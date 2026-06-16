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
    price,
    backgroundColor = '#f8fafc',
    onClick,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const imageList = images.length > 0 ? images : [image];
    const currentImage = imageList[currentIndex];
    const nextImage = imageList[nextIndex];

    // Carrusel automático con cross-fade
    useEffect(() => {
        if (imageList.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            const nextIdx = (currentIndex + 1) % imageList.length;
            setNextIndex(nextIdx);
            setIsTransitioning(true);

            setTimeout(() => {
                setCurrentIndex(nextIdx);
                setIsTransitioning(false);
            }, 800);
        }, interval);

        return () => clearInterval(timer);
    }, [imageList, interval, currentIndex, isPaused]);

    const handleClick = () => {
        if (onClick) {
            onClick(currentIndex);
        } else if (onRedirect) {
            onRedirect(destination, currentIndex);
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
                <PremiumImage
                    src={currentImage}
                    alt={name}
                    className="product-card__image product-card__image--current"
                    style={{ position: 'absolute' }}
                />
                {isTransitioning && (
                    <PremiumImage
                        src={nextImage}
                        alt={name}
                        className="product-card__image product-card__image--next"
                        style={{ position: 'absolute' }}
                    />
                )}
            </div>

            <div className="product-card__info">
                <h3 className="product-card__name">{name}</h3>
                {price && <span className="product-card__price">{price}</span>}
            </div>
        </div>
    );
};

export default ProductCard;
