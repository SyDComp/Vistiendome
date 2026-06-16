import React from 'react';
import CMSRenderer from './CMSRenderer';

const HomeRenderer = () => {
    return (
        <div className="home-dynamic-renderer">
            <CMSRenderer page="homepage" />
        </div>
    );
};

export default HomeRenderer;
