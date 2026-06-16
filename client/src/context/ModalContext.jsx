import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/molecules/ConfirmModal';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [confirmConfig, setConfirmConfig] = useState(null);

    const confirm = useCallback((config) => {
        return new Promise((resolve) => {
            setConfirmConfig({
                ...config,
                onConfirm: () => {
                    setConfirmConfig(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmConfig(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <ModalContext.Provider value={{ confirm }}>
            {children}
            {confirmConfig && (
                <ConfirmModal
                    isOpen={true}
                    title={confirmConfig.title || 'Confirmación'}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={confirmConfig.onCancel}
                    confirmText={confirmConfig.confirmText}
                    cancelText={confirmConfig.cancelText}
                    variant={confirmConfig.variant}
                />
            )}
        </ModalContext.Provider>
    );
};
