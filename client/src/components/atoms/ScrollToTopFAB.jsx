import React, { useState, useEffect } from 'react';
import './ScrollToTopFAB.css';

const ScrollToTopFAB = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Set the top callback
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <button
            className={`scroll-to-top-fab ${isVisible ? 'visible' : ''}`}
            onClick={scrollToTop}
            title="Volver arriba"
            aria-label="Volver arriba"
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
            </svg>
        </button>
    );
};

export default ScrollToTopFAB;
