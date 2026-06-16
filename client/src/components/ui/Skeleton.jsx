import React from 'react';
import '../../styles/components/Skeleton.css';

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
    <div style={{ marginBottom: '40px', opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Skeleton width="20px" height="20px" />
            <Skeleton width="120px" height="14px" />
        </div>
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i}>
                    <Skeleton width="60px" height="10px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="100px" height="14px" />
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
