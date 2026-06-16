import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import Button from '../../../components/atoms/Button';
import ConfigImageUpload from '../../../components/molecules/ConfigImageUpload';
import SectionsEditor from './SectionsEditor';
import CollectionsEditor from './CollectionsEditor';
import ImageSettingsEditor from './components/ImageSettingsEditor';
import RichTextModal from './components/RichTextModal';

import ImageAdjusterModal from './components/ImageAdjusterModal';
import SmartImage from '../../../components/atoms/SmartImage';
import { useConfig } from '../../../context/ConfigContext';
import { useNotification } from '../../../context/NotificationContext';
import './StoreConfig.css';

export default function StoreConfig() {
    const { refreshConfig } = useConfig();
    const { showNotification } = useNotification();
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingRichText, setEditingRichText] = useState(null);
    const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState(() => {
        // Get last expanded section from localStorage, default to 'store'
        return localStorage.getItem('storeConfigExpandedSection') || 'store';
    });

    // Configuration structure
    const configSections = {
        store: {
            title: 'Información de la Tienda',
            icon: '🏪',
            fields: {
                store_name: { label: 'Nombre de la Tienda', type: 'text', required: true },
                store_description: { label: 'Descripción', type: 'textarea', required: false },
                store_email: { label: 'Email de Contacto', type: 'email', required: true },
                store_phone: { label: 'Teléfono', type: 'tel', required: true },
                origin_address: { label: 'Dirección de Origen (Despachos)', type: 'text', required: false, placeholder: 'Ej: Av Providencia 1234, Providencia, Santiago' },
                origin_lat: { label: 'Latitud Origen (Opcional)', type: 'text', required: false, placeholder: '-33.4489', helpText: 'Copia la latitud desde Google Maps para precisión GPS' },
                origin_lng: { label: 'Longitud Origen (Opcional)', type: 'text', required: false, placeholder: '-70.6693', helpText: 'Copia la longitud desde Google Maps para precisión GPS' },
            }
        },
        home: {
            title: 'Página de Inicio',
            icon: '🏠',
            fields: {
                home_hero_title: { label: 'Título Principal', type: 'text', placeholder: 'Creando espacios...', required: true },
                home_hero_subtitle: { label: 'Subtítulo Pequeño', type: 'text', placeholder: 'DISEÑO & ARTESANÍA', required: false },
                home_hero_desc: { label: 'Descripción Principal', type: 'textarea', required: false },
                home_hero_bg: { label: 'Imagen en Inicio', type: 'image', helpText: 'Recomendado: 1920x1080px', required: true },
                home_collections: { label: 'Colecciones Destacadas', type: 'collections_editor' },
                home_sections: { label: 'Secciones de Contenido', type: 'sections_editor' }
            }
        },
        bank: {
            title: 'Datos Bancarios',
            icon: '🏦',
            fields: {
                bank_name: { label: 'Banco', type: 'text', required: true },
                account_type: { label: 'Tipo de Cuenta', type: 'select', options: ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta RUT'], required: true },
                account_number: { label: 'Número de Cuenta', type: 'text', required: true },
                account_rut: { label: 'RUT del Titular', type: 'text', required: true },
                account_holder: { label: 'Nombre del Titular', type: 'text', required: true },
            }
        },
        contact: {
            title: 'Redes Sociales y Contacto',
            icon: '📱',
            fields: {
                whatsapp_number: { label: 'WhatsApp', type: 'tel', placeholder: '+56 9 1234 5678', required: false },
                instagram: { label: 'Instagram', type: 'text', placeholder: '@usuario', required: false },
                facebook: { label: 'Facebook', type: 'text', placeholder: 'facebook.com/pagina', required: false },
                support_email: { label: 'Email de Soporte', type: 'email', required: false },
            }
        },
        policy: {
            title: 'Páginas Legales y de Información',
            icon: '⚖️',
            fields: {
                about_us: { label: 'Sobre Nosotros', type: 'richtext', required: false },
                terms_conditions: { label: 'Términos y Condiciones', type: 'richtext', required: false },
                shipping_policy: { label: 'Políticas de Envío', type: 'richtext', required: false },
            },
            hideSaveButton: true // The Modal handles direct saving
        },
        general: {
            title: 'Configuración General',
            icon: '⚙️',
            fields: {
                top_banner_settings: { label: 'Banner Superior de Anuncios', type: 'banner_editor' },
                vacation_mode_settings: { label: 'Modo Vacaciones (Bloquear Compras)', type: 'vacation_editor' },
                catalog_mode: { label: 'Modo Solo Catálogo (Ocultar Precios y Carrito)', type: 'switch', required: false },
                shipping_base_cost: { label: 'Costo Base de Envío ($)', type: 'number', min: 0, required: false, helpText: 'Deja vacío para envío gratis.' },
                shipping_free_threshold: { label: 'Monto Mínimo para Envío Gratis ($)', type: 'number', min: 0, required: false, helpText: 'Deja vacío si el envío siempre es gratis o siempre cobras lo mismo.' },
                help_messages: { label: 'Mensajes de Ayuda y Advertencias', type: 'help_toggles' }
            }
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const response = await api.get('/config');
            const configMap = {};
            response.data.forEach(item => {
                try {
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
            console.error('Error fetching configs:', error);
            showNotification('error', 'Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (sectionKey) => {
        const newExpandedSection = expandedSection === sectionKey ? null : sectionKey;
        setExpandedSection(newExpandedSection);

        // Save to localStorage
        if (newExpandedSection) {
            localStorage.setItem('storeConfigExpandedSection', newExpandedSection);

            // Scroll to section after a brief delay to allow render
            setTimeout(() => {
                const element = document.getElementById(`section-${newExpandedSection}`);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    });
                }
            }, 100);
        }
    };

    const handleChange = (key, value) => {
        setConfigs(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (sectionKey) => {
        setSaving(true);
        const section = configSections[sectionKey];

        try {
            // Get all fields in the section
            const fieldKeys = Object.keys(section.fields);

            // Sequential saving to avoid saturating server connection pool (Postgres pool limit)
            for (const fieldKey of fieldKeys) {
                let value = configs[fieldKey];
                const promises = [];

                // 1. Prepare and save the primary field
                let serializedValue = value;
                if ((fieldKey === 'home_sections' || fieldKey === 'home_collections' || fieldKey.endsWith('_settings')) && typeof value === 'object') {
                    serializedValue = JSON.stringify(value);
                }

                if (serializedValue === undefined || serializedValue === null) serializedValue = '';

                const saveKey = async (key, val, label) => {
                    try {
                        await api.patch(`/config/${key}`, { config_value: val });
                    } catch (error) {
                        if (error.response?.status === 404) {
                            await api.post('/config', {
                                config_key: key,
                                config_value: val,
                                description: label
                            });
                        } else {
                            throw error;
                        }
                    }
                };

                // Add the primary field save task
                promises.push(saveKey(fieldKey, serializedValue, section.fields[fieldKey].label));

                // 2. If it's an image, check for associated settings (e.g., home_hero_bg -> home_hero_bg_settings)
                if (section.fields[fieldKey].type === 'image') {
                    const settingsKey = `${fieldKey}_settings`;
                    const settingsValue = configs[settingsKey];
                    if (settingsValue) {
                        const serializedSettings = typeof settingsValue === 'object' ? JSON.stringify(settingsValue) : settingsValue;
                        promises.push(saveKey(settingsKey, serializedSettings, `Ajustes de ${section.fields[fieldKey].label}`));
                    }
                }

                // Wait for this field and its settings to save before moving to the next field
                await Promise.all(promises);
            }

            await refreshConfig();
            showNotification('success', 'Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving config:', error);
            showNotification('error', 'Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const renderField = (key, config) => {
        const value = configs[key];

        if (config.type === 'sections_editor') {
            return (
                <SectionsEditor
                    sections={value || []}
                    onChange={(newSections) => handleChange(key, newSections)}
                />
            );
        }

        if (config.type === 'banner_editor') {
            const settings = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
            const updateSettings = (field, val) => {
                handleChange(key, { ...settings, [field]: val });
            };

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                        <input
                            type="checkbox"
                            checked={settings.active || false}
                            onChange={(e) => updateSettings('active', e.target.checked)}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: '500' }}>Activar Banner Superior</span>
                    </label>
                    {settings.active && (
                        <>
                            <input
                                type="text"
                                placeholder="Ej: ¡CyberMonday! 20% de descuento en toda la tienda"
                                value={settings.message || ''}
                                onChange={(e) => updateSettings('message', e.target.value)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Color de fondo:</span>
                                <input
                                    type="color"
                                    value={settings.bgColor || '#0f172a'}
                                    onChange={(e) => updateSettings('bgColor', e.target.value)}
                                    style={{ width: '40px', height: '30px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                />
                            </div>
                        </>
                    )}
                </div>
            );
        }

        if (config.type === 'vacation_editor') {
            const settings = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
            const updateSettings = (field, val) => {
                handleChange(key, { ...settings, [field]: val });
            };

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, color: '#b45309' }}>
                        <input
                            type="checkbox"
                            checked={settings.active || false}
                            onChange={(e) => updateSettings('active', e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#d97706' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>Activar Modo Vacaciones</span>
                    </label>
                    {settings.active && (
                        <textarea
                            placeholder="Ej: Tomando un descanso. Volvemos el 15 de Marzo. Puedes seguir vitrineando."
                            value={settings.message || ''}
                            onChange={(e) => updateSettings('message', e.target.value)}
                            rows={2}
                            style={{ borderColor: '#fcd34d', outlineColor: '#f59e0b' }}
                        />
                    )}
                </div>
            );
        }

        if (config.type === 'switch') {
            const isChecked = value === 'Activado' || value === 'true' || value === true;
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <label className="switch" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            style={{ width: '18px', height: '18px' }}
                            checked={isChecked}
                            onChange={(e) => handleChange(key, e.target.checked ? 'Activado' : 'Desactivado')}
                        />
                        <span style={{ fontWeight: isChecked ? 'bold' : 'normal', color: isChecked ? '#10b981' : '#64748b' }}>
                            {isChecked ? 'Activado' : 'Desactivado'}
                        </span>
                    </label>
                </div>
            );
        }

        if (config.type === 'help_toggles') {
            const knownKeys = ['hide_assign_courier_warning']; // Add new keys here as they are created

            const handleEnableAll = () => {
                knownKeys.forEach(k => localStorage.removeItem(k));
                showNotification('success', 'Todos los mensajes de ayuda han sido reactivados.');
            };

            const handleDisableAll = () => {
                knownKeys.forEach(k => localStorage.setItem(k, 'true'));
                showNotification('success', 'Todos los mensajes de ayuda han sido ocultados.');
            };

            return (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button type="button" variant="outline" onClick={handleEnableAll}>
                        Activar Todos
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleDisableAll}>
                        Desactivar Todos
                    </Button>
                </div>
            );
        }

        if (config.type === 'collections_editor') {
            return (
                <CollectionsEditor
                    collections={value || []}
                    onChange={(newCollections) => handleChange(key, newCollections)}
                />
            );
        }

        if (config.type === 'image') {
            const settingsKey = `${key}_settings`;
            const settings = configs[settingsKey] || { zoom: 1, x: 50, y: 50, shape: 'original' };

            return (
                <div className="config-image-field-container">
                    <ConfigImageUpload
                        currentImage={value || ''}
                        onImageUploaded={(url) => handleChange(key, url)}
                        label={config.label}
                        imageSettings={settings}
                        showPreview={false}
                    />
                    
                    {value && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <SmartImage 
                                    src={value} 
                                    settings={{
                                        ...settings,
                                        canvas: {
                                            ...settings.canvas,
                                            shape: settings.canvas?.shape || 'wide' // Hero always looks better wide by default
                                        }
                                    }} 
                                    style={{
                                        maxWidth: '800px',
                                        border: '2px solid #3182ce',
                                        boxShadow: '0 4px 12px rgba(49, 130, 206, 0.15)',
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            </div>

                            <button 
                                type="button"
                                className="btn-adjust-image"
                                onClick={() => setIsAdjusterOpen(true)}
                                style={{
                                    width: '100%',
                                    padding: '0.85rem',
                                    background: '#ebf8ff',
                                    border: '1px solid #3182ce',
                                    color: '#2c5282',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    fontSize: '1rem'
                                }}
                            >
                                🎨 Ajustar Encuadre y Zoom del Hero
                            </button>
                            
                            <ImageAdjusterModal
                                isOpen={isAdjusterOpen}
                                onClose={() => setIsAdjusterOpen(false)}
                                src={value}
                                settings={settings}
                                onSave={(newSettings) => handleChange(settingsKey, newSettings)}
                            />
                        </div>
                    )}

                    {config.helpText && (
                        <small style={{ display: 'block', marginTop: '0.5rem', color: '#64748b' }}>
                            {config.helpText}
                        </small>
                    )}
                </div>
            );
        }

        if (config.type === 'richtext') {
            return (
                <div className='contenidoCustom'>
                    <Button
                        variant="outline"
                        onClick={() => setEditingRichText({ key, title: config.label, initialValue: value })}
                    >
                        Editar Contenido 📝
                    </Button>
                    {value && <span style={{ fontSize: '0.85rem', color: '#666' }}>Contenido añadido ✓</span>}
                </div>
            );
        }

        if (config.type === 'textarea') {
            return (
                <textarea
                    value={value || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={config.placeholder}
                    rows={4}
                    required={config.required}
                />
            );
        }

        if (config.type === 'select') {
            return (
                <select
                    value={value || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    required={config.required}
                >
                    <option value="">Seleccionar...</option>
                    {config.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            );
        }



        if (config.type === 'hidden') {
            return null;
        }

        return (
            <div>
                <input
                    type={config.type}
                    value={value || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={config.placeholder}
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    required={config.required}
                />
                {config.helpText && (
                    <small className="field-help-text" style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '0.8rem' }}>
                        {config.helpText}
                    </small>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="config-loading">Cargando configuración...</div>;
    }

    return (
        <div className="store-config">
            <div className="config-header">
                <h1>Configuración de la Tienda</h1>
                <p className="config-subtitle">Administra la información de tu tienda y preferencias</p>
            </div>

            <div className="config-sections">
                {Object.entries(configSections).map(([sectionKey, section]) => {
                    const isExpanded = expandedSection === sectionKey;

                    return (
                        <div
                            key={sectionKey}
                            id={`section-${sectionKey}`}
                            className={`config-section ${isExpanded ? 'expanded' : 'collapsed'}`}
                        >
                            <div
                                className="section-header"
                                onClick={() => toggleSection(sectionKey)}
                            >
                                <h2>
                                    <span className="section-icon">{section.icon}</span>
                                    {section.title}
                                </h2>
                                <span className="accordion-toggle">
                                    {isExpanded ? '−' : '+'}
                                </span>
                            </div>

                            {isExpanded && (
                                <div className="section-body">
                                    {Object.entries(section.fields).map(([fieldKey, fieldConfig]) => (
                                        <div key={fieldKey} className="config-field" style={{ display: fieldConfig.type === 'hidden' ? 'none' : 'flex' }}>
                                            {/* Labels for images and custom editors are handled inside the component */}
                                            {fieldConfig.type !== 'image' && fieldConfig.type !== 'sections_editor' && fieldConfig.type !== 'collections_editor' && fieldConfig.type !== 'hidden' && (
                                                <label htmlFor={fieldKey}>
                                                    {fieldConfig.label}
                                                    {fieldConfig.required && <span className="required">*</span>}
                                                </label>
                                            )}
                                            {renderField(fieldKey, fieldConfig)}
                                        </div>
                                    ))}

                                    {!section.hideSaveButton && (
                                        <div className="section-actions">
                                            <Button
                                                onClick={() => handleSave(sectionKey)}
                                                disabled={saving}
                                            >
                                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {editingRichText && (
                <RichTextModal
                    title={editingRichText.title}
                    initialValue={editingRichText.initialValue}
                    onSave={async (newContent) => {
                        // Optimistic local update
                        handleChange(editingRichText.key, newContent);
                        setEditingRichText(null);

                        // Direct DB Save
                        try {
                            setSaving(true);
                            await api.patch(`/config/${editingRichText.key}`, { config_value: newContent });
                            await refreshConfig();
                            showNotification('success', 'Texto guardado correctamente.');
                        } catch (error) {
                            if (error.response?.status === 404) {
                                try {
                                    await api.post('/config', {
                                        config_key: editingRichText.key,
                                        config_value: newContent,
                                        description: editingRichText.title
                                    });
                                    await refreshConfig();
                                    showNotification('success', 'Texto creado y guardado correctamente.');
                                } catch (postError) {
                                    console.error('Error creating config:', postError);
                                    showNotification('error', 'Error al guardar el texto');
                                }
                            } else {
                                console.error('Error patching config:', error);
                                showNotification('error', 'Error al guardar el texto');
                            }
                        } finally {
                            setSaving(false);
                        }
                    }}
                    onClose={() => setEditingRichText(null)}
                />
            )}
        </div>
    );
}
