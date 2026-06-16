import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import './AdminFormLayout.css';

const AdminFormLayout = ({ 
    icon: Icon, 
    title, 
    onBack, 
    splitLayout = false, 
    rightPanel = null, 
    children 
}) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const layoutMode = splitLayout ? 'split-layout' : 'single-layout';
    const deviceMode = isMobile ? 'mobile' : 'desktop';

    return (
        <div className={`admin-form-container ${layoutMode} ${deviceMode}`}>
            <div className="admin-form-main-panel">
                <div className="admin-form-header">
                    {Icon && (
                        <div className="admin-form-header-icon">
                            <Icon size={20} />
                        </div>
                    )}
                    <h3 className="admin-form-header-title">{title}</h3>
                </div>

                <div className="admin-form-body">
                    {children}
                </div>
            </div>

            {splitLayout && rightPanel && (
                <div className="admin-form-right-panel">
                    {rightPanel}
                </div>
            )}
        </div>
    );
};

export const AdminFormSection = ({ title, badge, description, children }) => (
    <div style={{ marginTop: '32px' }}>
        <div className="admin-form-section-title-wrapper">
            <label className="admin-form-section-title">{title}</label>
            {badge && <div className="admin-form-section-badge">{badge}</div>}
        </div>
        {description && (
            <p className="admin-form-section-desc">{description}</p>
        )}
        {children}
    </div>
);

export const AdminFormRow = ({ children, balanced = false }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const classNames = ['admin-form-row', isMobile ? 'mobile' : 'desktop'];
    if (balanced) classNames.push('balanced');

    return (
        <div className={classNames.join(' ')}>
            {children}
        </div>
    );
};

export const AdminFormSubmit = ({ children }) => (
    <div className="admin-form-submit-wrapper">
        {children}
    </div>
);

export default AdminFormLayout;
