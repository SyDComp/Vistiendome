import React from 'react';
import '../../styles/components/Badge.css';

const Badge = ({ 
    children, 
    variant = 'neutral', // success, error, warning, info, neutral
    size = 'md', // sm, md, lg
    className = '', 
    style = {} 
}) => {
    return (
        <span 
            className={`badge badge-${variant} badge-${size} ${className}`} 
            style={style}
        >
            {children}
        </span>
    );
};

export default Badge;
