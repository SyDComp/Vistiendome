import React from 'react';
import PremiumLoader from './PremiumLoader';

/**
 * Fallback para React.Suspense.
 * Muestra un loader premium mientras se cargan los chunks lazy.
 */
const SuspenseFallback = () => (
    <div className="adm-pantalla-centrada">
        <PremiumLoader text="Cargando..." />
    </div>
);

export default SuspenseFallback;
