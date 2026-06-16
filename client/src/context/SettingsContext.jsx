/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSiteSettings } from '../lib/api/endpoints';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        social_links: {},
        contact_info: {}
    });
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        try {
            const data = await getSiteSettings();
            setSettings(data);
        } catch (err) {
            console.error("Error loading site settings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
