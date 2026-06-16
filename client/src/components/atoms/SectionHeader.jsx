import React from 'react';
import './SectionHeader.css';

const SectionHeader = ({ title, subtitle, onClick }) => {
    return (
        <header className="section-header-container" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="section-header-content">
                <h1 className="section-header-title">{title}</h1>
                {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
            </div>
        </header>
    );
};

export default SectionHeader;
