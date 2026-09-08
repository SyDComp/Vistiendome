import React from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import LogoVistiendome from './LogoVistiendome';
import './PremiumLoader.css';

const PremiumLoader = ({ text = "Cargando..." }) => {
    useScrollLock(true);

    return (
        <div className="premium-loader-overlay">
            <div className="premium-loader-container">
                <div className="luxury-spinner">
                    <div className="spinner-inner"></div>
                </div>
                {/* El logo, no el nombre escrito a mano. Esta pantalla es la
                    marca presentandose sola —no una palabra dentro de una frase—
                    y era el unico lugar donde salia en otra tipografia, en
                    mayusculas y con el espaciado cambiado. */}
                <div className="loading-marca">
                    <LogoVistiendome tamano="1.9rem" />
                </div>
                <p className="loading-subtitle">{text}</p>
            </div>
        </div>
    );
};

export default PremiumLoader;
