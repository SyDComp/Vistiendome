import React, { useEffect } from 'react';

const PremiumLoader = ({ text = "Cargando..." }) => {
    // Bloquear scroll del body mientras se muestra la carga
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    return (
        <div className="premium-loader-overlay">
            <div className="premium-loader-container">
                <div className="luxury-spinner">
                    <div className="spinner-inner"></div>
                </div>
                <h2 className="loading-title">Vistiendomé</h2>
                <p className="loading-subtitle">{text}</p>
            </div>
            <style>{`
                .premium-loader-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #fff;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                }
                .premium-loader-container {
                    text-align: center;
                    animation: luxuryFadeIn 0.8s ease-out;
                }
                .luxury-spinner {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 30px;
                    position: relative;
                }
                .spinner-inner {
                    width: 100%;
                    height: 100%;
                    border: 2px solid rgba(143, 6, 83, 0.1);
                    border-top: 2px solid #8f0653;
                    border-radius: 50%;
                    animation: luxurySpin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }
                .loading-title {
                    font-size: 28px;
                    font-weight: 900;
                    color: #1e1b4b;
                    letter-spacing: 4px;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .loading-subtitle {
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    letter-spacing: 1px;
                    opacity: 0.8;
                }
                @keyframes luxurySpin { to { transform: rotate(360deg); } }
                @keyframes luxuryFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default PremiumLoader;
