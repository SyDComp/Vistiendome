import React from 'react';
import { useConfig } from '../../context/ConfigContext';
import './TopBanner.css';

const TopBanner = () => {
    const { configs } = useConfig();
    const settings = configs?.top_banner_settings || {};

    if (!settings.active || !settings.message) {
        return null;
    }

    // Attempt to determine if background color is dark or light 
    // to dynamically set text color. Simple heuristic based on hex avg.
    const getTextColor = (bgColorHex) => {
        if (!bgColorHex || !bgColorHex.startsWith('#')) return '#ffffff';
        const hex = bgColorHex.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#0f172a' : '#ffffff';
    };

    const bgColor = settings.bgColor || '#0f172a';
    const textColor = getTextColor(bgColor);

    return (
        <div
            className="top-banner-container"
            style={{
                backgroundColor: bgColor,
                color: textColor
            }}
        >
            <p className="top-banner-message">
                {settings.message}
            </p>
        </div>
    );
};

export default TopBanner;
