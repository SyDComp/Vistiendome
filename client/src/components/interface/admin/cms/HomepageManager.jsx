import React from 'react';
import CMSPageManager from './CMSPageManager';

const HomepageManager = () => {
    return (
        <CMSPageManager 
            page="homepage" 
            title="Gestor de Portada" 
            subtitle="Configura el orden y contenido de tu página de inicio."
        />
    );
};

export default HomepageManager;
