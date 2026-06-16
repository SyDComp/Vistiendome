import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const ConfigContext = createContext();

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};

export const ConfigProvider = ({ children }) => {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchConfigs = useCallback(async () => {
        try {
            const response = await api.get('/config');
            const configMap = {};
            response.data.forEach(item => {
                try {
                    // Try to parse JSON for specific fields, otherwise keep as string
                    // Try to parse JSON for specific fields or any key ending in _settings
                    if (['home_sections', 'home_collections'].includes(item.config_key) || item.config_key.endsWith('_settings')) {
                        configMap[item.config_key] = JSON.parse(item.config_value);
                    } else {
                        configMap[item.config_key] = item.config_value;
                    }
                } catch (e) {
                    configMap[item.config_key] = item.config_value;
                }
            });
            setConfigs(configMap);
        } catch (error) {
            console.error('Error fetching global configs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    // Helper to get nested bank details reliably
    const getBankDetails = () => ({
        bank_name: configs.bank_name || 'Banco Estado',
        account_type: configs.account_type || 'Cuenta Vista',
        account_number: configs.account_number || '123456789',
        account_rut: configs.account_rut || '12.345.678-9',
        account_holder: configs.account_holder || 'Jessica Parra'
    });

    // Helper for structured social links
    const getSocialLinks = () => ({
        whatsapp: configs.whatsapp_number || '',
        instagram: configs.instagram || '',
        facebook: configs.facebook || '',
        email: configs.support_email || configs.store_email || ''
    });

    return (
        <ConfigContext.Provider value={{
            configs,
            loading,
            refreshConfig: fetchConfigs,
            storeName: configs.store_name || 'N&M Artesanías',
            bankDetails: getBankDetails(),
            socialLinks: getSocialLinks()
        }}>
            {children}
        </ConfigContext.Provider>
    );
};
