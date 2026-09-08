import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius = '4px', className = '', style = {} }) => {
    return (
        <div 
            className={`skeleton ${className}`} 
            style={{ 
                width, 
                height, 
                borderRadius, 
                ...style 
            }} 
        />
    );
};

export const SectionSkeleton = () => (
    <div className="esqueleto-seccion">
        <div className="esqueleto-seccion-titulo">
            <Skeleton width="20px" height="20px" />
            <Skeleton width="120px" height="14px" />
        </div>
        <div className="esqueleto-tarjeta">
            {[1, 2, 3, 4].map(i => (
                <div key={i}>
                    <Skeleton width="60px" height="10px" className="esqueleto-separacion" />
                    <Skeleton width="100px" height="14px" />
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
