import React from 'react';
import PremiumLoader from './PremiumLoader';

/**
 * Fallback para React.Suspense.
 * Muestra un loader premium mientras se cargan los chunks lazy.
 */
const SuspenseFallback = () => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
        <PremiumLoader text="Cargando..." />
    </div>
);

export default SuspenseFallback;
