import React, { useState, useEffect } from 'react';
import { 
    Camera, 
    Globe, 
    MessageCircle, 
    Mail, 
    Save, 
    CheckCircle,
    Phone,
    Info,
    Truck,
    Plus,
    X,
    Megaphone,
    Sliders,
    Tag,
    Gift
} from 'lucide-react';
import Button from '../../../ui/Button';
import MediaField from '../../../ui/admin/MediaField';
import LinkField from '../../../ui/admin/LinkField';
import { getSiteSettings, updateSiteSetting } from '../../../../lib/api/endpoints';
import { getFiltersMetadata, getCatalogo } from '../../../../lib/api/endpoints/products.api';
import { useSettings } from '../../../../context/SettingsContext';
import { getShippingColor } from '../../../../utils/shippingColors';
import { esTelefonoValido } from '../../../../utils/telefono';

const SettingsManager = () => {
    const [settings, setSettings] = useState({
        instagram: '',
        facebook: '',
        whatsapp: '',
        tiktok: '',
        email: '',
        phone_display: '',
        address: ''
    });
    const [shippingMethods, setShippingMethods] = useState([]);
    const [shippingColors, setShippingColors] = useState({});
    const [newMethod, setNewMethod] = useState('');
    const [welcomeModal, setWelcomeModal] = useState({
        active: false,
        frequency: 'session',
        title: '',
        body: '',
        image_url: '',
        image_asset_id: null,
        image_fit: 'cover',
        image_position: 'center',
        image_max_height: '280px',
        button_text: '',
        button_link: '',
        title_color: '#1e293b',
        body_color: '#475569',
        bg_color: '#ffffff',
        button_bg_color: '#8f0653',
        button_text_color: '#ffffff'
    });
    const [topBanner, setTopBanner] = useState({
        active: false,
        text: '',
        bg_color: '#8f0653',
        text_color: '#ffffff',
        animated: false,
        direction: 'left',
        speed: 20,
        repeat: true,
        link: '',
        link_label: '',
        frequency: 'session',
        font_size: 'normal',
        bold: false
    });
    const [nosotros, setNosotros] = useState({ image_asset_id: null, image_url: '' });
    // Tramos de precio por cantidad (mayorista, iglesia, los que ella defina).
    // Configuración global: aplica a todo el catálogo, no producto por producto.
    const [priceTiers, setPriceTiers] = useState({ tiers: [] });
    // Cada característica -> sus valores en orden real. Un tramo puede ser por
    // Talla, Material, Idioma, lo que exista: no está fijo a una sola.
    const [atributosDisponibles, setAtributosDisponibles] = useState({});
    // Promociones (lleva X paga Y, regalo) y la lista de productos para elegir
    // a cuáles aplica cada una.
    const [promotions, setPromotions] = useState({ promos: [] });
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const { refreshSettings } = useSettings();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getSiteSettings();
                if (data.social_links) {
                    setSettings(prev => ({ ...prev, ...data.social_links }));
                }
                if (data.contact_info) {
                    setSettings(prev => ({ ...prev, ...data.contact_info }));
                }
                if (data.shipping_methods !== undefined) {
                    setShippingMethods(data.shipping_methods.filter(m => !m.toUpperCase().includes('CHILEXPRESS')));
                } else {
                    setShippingMethods(['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO']);
                }
                if (data.shipping_colors !== undefined) {
                    setShippingColors(data.shipping_colors);
                }
                if (data.welcome_modal) {
                    setWelcomeModal(prev => ({ ...prev, ...data.welcome_modal }));
                }
                if (data.top_banner) {
                    setTopBanner(prev => ({ ...prev, ...data.top_banner }));
                }
                if (data.nosotros) {
                    setNosotros(prev => ({ ...prev, ...data.nosotros }));
                }
                if (data.price_tiers) {
                    setPriceTiers(prev => ({ ...prev, ...data.price_tiers }));
                }
                if (data.promotions) {
                    setPromotions(prev => ({ ...prev, ...data.promotions }));
                }
                try {
                    const catalogo = await getCatalogo();
                    setProductosDisponibles(catalogo?.products || []);
                } catch { /* no bloquea el resto de ajustes */ }
                // Valores de cada característica, en su orden real, para poder
                // elegir el "desde/hasta" de cualquier tramo sin escribirlo a mano.
                try {
                    const meta = await getFiltersMetadata();
                    const attrs = meta?.attributes || {};
                    // filters-metadata entrega cada característica como un array
                    // de valores. Ojo: `array.values` NO es undefined, es
                    // Array.prototype.values (una función), y pasársela a
                    // setState hace que React la ejecute como actualizador.
                    const normalizado = {};
                    Object.entries(attrs).forEach(([nombre, raw]) => {
                        normalizado[nombre] = Array.isArray(raw) ? raw : (raw?.values ?? []);
                    });
                    setAtributosDisponibles(normalizado);
                } catch { /* no bloquea el resto de ajustes */ }
            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const social = {
                instagram: settings.instagram,
                facebook: settings.facebook,
                whatsapp: settings.whatsapp,
                tiktok: settings.tiktok
            };
            const contact = {
                email: settings.email,
                phone_display: settings.phone_display,
                address: settings.address
            };

            await Promise.all([
                updateSiteSetting('social_links', social),
                updateSiteSetting('contact_info', contact),
                updateSiteSetting('shipping_methods', shippingMethods),
                updateSiteSetting('shipping_colors', shippingColors),
                updateSiteSetting('welcome_modal', welcomeModal),
                updateSiteSetting('top_banner', topBanner),
                updateSiteSetting('nosotros', nosotros),
                updateSiteSetting('price_tiers', priceTiers),
                updateSiteSetting('promotions', promotions)
            ]);
            
            if (refreshSettings) await refreshSettings();

            setMessage({ type: 'success', text: 'Configuraciones guardadas correctamente' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al guardar los cambios' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'phone_display') {
            value = value.replace(/[^0-9+\-() ]/g, '').slice(0, 25);
        } else if (name === 'whatsapp') {
            value = value.replace(/\D/g, '').slice(0, 15);
        }
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleAddShippingMethod = () => {
        if (newMethod.trim() && !shippingMethods.includes(newMethod.toUpperCase())) {
            setShippingMethods([...shippingMethods, newMethod.toUpperCase()]);
            setNewMethod('');
        }
    };

    const handleRemoveShippingMethod = (methodToRemove) => {
        setShippingMethods(shippingMethods.filter(m => m !== methodToRemove));
    };

    if (loading) return <div className="cms-adm-vacio">Cargando configuraciones...</div>;

    return (
        <div className="adm-vista">
            <header className="adm-seccion-cabecera">
                <div>
                    <h1 className="adm-titulo-grande">Puntos de Contacto</h1>
                    <p className="cms-adm-bajada">Configura tus redes sociales y datos de contacto globales.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    variant="primary" 
                    disabled={isSaving}
                    className="adm-boton-marca-alto"
                >
                    {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                </Button>
            </header>

            {message && (
                <div style={{ 
                    padding: '16px 24px', 
                    borderRadius: '16px', 
                    background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: message.type === 'success' ? '#059669' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '700',
                    fontSize: '14px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <CheckCircle size={20} />
                    {message.text}
                </div>
            )}

            <div className="adm-rejilla--doble">
                <section className="adm-panel">
                    <div className="adm-panel-cabecera">
                        <div className="adm-emblema-color adm-emblema-color--marca">
                            <Globe size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Redes Sociales</h3>
                    </div>

                    <div className="adm-columna">
                        <div className="input-group">
                            <label className="adm-rotulo"><Globe size={14} /> Facebook (URL) · principal</label>
                            <input
                                type="text"
                                name="facebook"
                                value={settings.facebook}
                                onChange={handleChange}
                                placeholder="https://facebook.com/tu_pagina"
                                className="adm-entrada"
                            />
                            <p className="adm-pie-campo">Es la red principal: se muestra primero en el sitio.</p>
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><Camera size={14} /> Instagram (URL)</label>
                            <input
                                type="text"
                                name="instagram"
                                value={settings.instagram}
                                onChange={handleChange}
                                placeholder="https://instagram.com/tu_cuenta"
                                className="adm-entrada"
                            />
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><Info size={14} /> TikTok (URL)</label>
                            <input 
                                type="text" 
                                name="tiktok" 
                                value={settings.tiktok} 
                                onChange={handleChange}
                                placeholder="https://tiktok.com/@tu_usuario"
                                className="adm-entrada" 
                            />
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><MessageCircle size={14} /> WhatsApp (Solo número)</label>
                            <input 
                                type="text" 
                                name="whatsapp" 
                                value={settings.whatsapp} 
                                onChange={handleChange}
                                maxLength={15}
                                placeholder="569XXXXXXXX"
                                className="adm-entrada" 
                            />
                            <p className="adm-pie-campo">Sin el signo '+' ni espacios.</p>
                        </div>
                    </div>
                </section>

                <section className="adm-panel">
                    <div className="adm-panel-cabecera">
                        <div className="adm-emblema-color adm-emblema-color--azul">
                            <Mail size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Información de Contacto</h3>
                    </div>

                    <div className="adm-columna">
                        <div className="input-group">
                            <label className="adm-rotulo"><Mail size={14} /> Correo Electrónico</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={settings.email} 
                                onChange={handleChange}
                                placeholder="contacto@vistiendome.cl"
                                className="adm-entrada" 
                            />
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><Phone size={14} /> Teléfono Visible</label>
                            <input 
                                type="text" 
                                name="phone_display" 
                                value={settings.phone_display} 
                                onChange={handleChange}
                                maxLength={25}
                                placeholder="+56 9 1234 5678"
                                className="adm-entrada" 
                            />
                            {/* Este numero se imprime en el pie de la web y en
                                la pagina de contacto: si esta mal, la clienta
                                marca un numero que no existe. Hoy hay uno de
                                doce digitos guardado ahi. */}
                            {settings.phone_display && !esTelefonoValido(settings.phone_display) && (
                                <p className="adm-aviso-campo">
                                    Revisa este número: un teléfono chileno tiene 9 dígitos
                                    (ej: 9 1234 5678). Así como está se mostrará en la web.
                                </p>
                            )}
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><Globe size={14} /> Dirección / Taller</label>
                            <textarea
                                name="address"
                                value={settings.address}
                                onChange={handleChange}
                                placeholder="San Carlos, Ñuble, Chile."
                                className="adm-entrada adm-entrada--parrafo-fijo"
                            />
                        </div>
                        <p className="adm-nota-parrafo">
                            Los íconos de Google Maps y Waze del sitio se calculan solos a partir de esta dirección — no hay que cargar un link aparte.
                        </p>
                    </div>
                    
                    <div className="adm-nota">
                        <Info size={16} className="adm-icono-fijo" />
                        <p className="adm-ayuda">
                            Los campos que dejes vacíos no se mostrarán en la web pública (Footer y Contacto).
                        </p>
                    </div>
                </section>

                <section className="adm-panel">
                    <div className="adm-panel-cabecera">
                        <div className="adm-emblema-color adm-emblema-color--ambar">
                            <Truck size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Métodos de Envío</h3>
                    </div>

                    <div className="adm-columna">
                        <div className="adm-fila-junta">
                            <input 
                                type="text" 
                                value={newMethod} 
                                onChange={(e) => setNewMethod(e.target.value)}
                                placeholder="Ej: BLUEXPRESS"
                                className="adm-entrada"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddShippingMethod()}
                            />
                            <Button onClick={handleAddShippingMethod} variant="secondary" className="adm-boton-fijo">
                                <Plus size={18} />
                            </Button>
                        </div>
                        
                        <div className="adm-fila-envuelta--junta">
                            {shippingMethods.length === 0 && <span className="adm-texto-suave">No hay métodos configurados.</span>}
                            {shippingMethods.map((method, idx) => {
                                const currentColor = shippingColors[method] || getShippingColor(method, shippingColors);
                                return (
                                    <div key={idx} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        background: `${currentColor}15`, padding: '6px 12px', 
                                        borderRadius: '8px', border: `1.5px solid ${currentColor}40`,
                                        fontSize: '13px', fontWeight: '700', color: currentColor,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <label className="adm-elegible--menuda" title="Haz clic para modificar el color de este transporte">
                                            <div style={{
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                backgroundColor: currentColor, border: '2px solid #fff',
                                                boxShadow: '0 0 0 1px #cbd5e1', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                            }}>
                                                <input 
                                                    type="color" 
                                                    value={currentColor} 
                                                    onChange={(e) => setShippingColors(prev => ({ ...prev, [method]: e.target.value }))}
                                                    className="adm-archivo-oculto"
                                                />
                                            </div>
                                            <span>{method}</span>
                                        </label>
                                        <X 
                                            size={14} 
                                            className="adm-quitar-icono" 
                                            onClick={() => handleRemoveShippingMethod(method)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="adm-panel adm-panel--ancho">
                    <div className="adm-panel-cabecera">
                        <div className="adm-emblema-color adm-emblema-color--marca">
                            <Megaphone size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Modal de Bienvenida</h3>
                    </div>

                    <label className="adm-elegible adm-elegible--separada">
                        <input
                            type="checkbox"
                            checked={welcomeModal.active}
                            onChange={(e) => setWelcomeModal(prev => ({ ...prev, active: e.target.checked }))}
                            className="adm-casilla"
                        />
                        <span className="adm-etiqueta-fuerte">
                            Mostrar el modal de bienvenida en la web
                        </span>
                    </label>

                    <div className="adm-rejilla--ancha">
                        <div className="input-group">
                            <label className="adm-rotulo"><Info size={14} /> Frecuencia</label>
                            <select
                                value={welcomeModal.frequency}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, frequency: e.target.value }))}
                                className="adm-entrada"
                            >
                                <option value="session">Una vez por sesión</option>
                                <option value="day">Una vez por día</option>
                                <option value="always">Siempre al entrar</option>
                            </select>
                            <p className="adm-ayuda adm-ayuda--pegada">
                                {welcomeModal.frequency === 'session' && 'Se muestra una vez por visita; no reaparece hasta que el cliente cierre y vuelva a abrir el navegador.'}
                                {welcomeModal.frequency === 'day' && 'Se muestra una vez al día por cliente, aunque siga navegando.'}
                                {welcomeModal.frequency === 'always' && 'Se muestra cada vez que el cliente entra a la web (más intrusivo).'}
                            </p>
                        </div>

                        <div className="input-group">
                            <label className="adm-rotulo"><Megaphone size={14} /> Título</label>
                            <input
                                type="text"
                                value={welcomeModal.title}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ej: ¡Bienvenida a Vistiendomé!"
                                className="adm-entrada"
                            />
                        </div>

                        <div className="input-group adm-ancho-total">
                            <label className="adm-rotulo"><Info size={14} /> Mensaje</label>
                            <textarea
                                value={welcomeModal.body}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, body: e.target.value }))}
                                placeholder="Anuncio, novedad o promoción que quieras destacar..."
                                className="adm-entrada adm-entrada--parrafo"
                            />
                        </div>

                        <div className="input-group adm-ancho-total">
                            <MediaField
                                label="Imagen (opcional)"
                                value={{ asset_id: welcomeModal.image_asset_id, url: welcomeModal.image_url }}
                                onChange={(v) => setWelcomeModal(prev => ({ ...prev, image_asset_id: v.asset_id, image_url: v.url }))}
                            />
                        </div>

                        {(welcomeModal.image_url || welcomeModal.image_asset_id) && (
                            <div className="adm-bloque-ancho">
                                <div className="adm-seccion-titulo">
                                    <Sliders size={16} className="adm-marca-texto" />
                                    Ajustes Visuales de la Imagen
                                </div>
                                <div className="adm-rejilla--media">
                                    <div>
                                        <label className="adm-rotulo adm-rotulo--menor">Modo de Ajuste</label>
                                        <select
                                            value={welcomeModal.image_fit || 'cover'}
                                            onChange={(e) => setWelcomeModal(prev => ({ ...prev, image_fit: e.target.value }))}
                                            className="adm-entrada adm-entrada--baja"
                                        >
                                            <option value="cover">Cover (Recortar llenando espacio)</option>
                                            <option value="contain">Contain (Ver imagen completa sin cortes)</option>
                                        </select>
                                    </div>

                                    {(welcomeModal.image_fit !== 'contain') && (
                                        <div>
                                            <label className="adm-rotulo adm-rotulo--menor">Posición de Encuadre</label>
                                            <select
                                                value={welcomeModal.image_position || 'center'}
                                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, image_position: e.target.value }))}
                                                className="adm-entrada adm-entrada--baja"
                                            >
                                                <option value="top">Superior (Arriba / Rostro)</option>
                                                <option value="center">Centro (Estándar)</option>
                                                <option value="bottom">Inferior (Abajo)</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="adm-rotulo adm-rotulo--menor">Altura Máxima del Contenedor</label>
                                        <select
                                            value={welcomeModal.image_max_height || '280px'}
                                            onChange={(e) => setWelcomeModal(prev => ({ ...prev, image_max_height: e.target.value }))}
                                            className="adm-entrada adm-entrada--baja"
                                        >
                                            <option value="200px">Compacta (200px)</option>
                                            <option value="280px">Estándar (280px)</option>
                                            <option value="360px">Grande (360px)</option>
                                            <option value="460px">Flyer / Vertical (460px)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="adm-rotulo"><Plus size={14} /> Texto del botón (opcional)</label>
                            <input
                                type="text"
                                value={welcomeModal.button_text}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, button_text: e.target.value }))}
                                placeholder="Ej: Ver colección"
                                className="adm-entrada"
                            />
                        </div>

                        <div className="input-group">
                            <LinkField
                                label="Link del botón (opcional)"
                                value={welcomeModal.button_link}
                                onChange={(v) => setWelcomeModal(prev => ({ ...prev, button_link: v }))}
                            />
                        </div>

                        <div className="adm-bloque-separado">
                            <label className="adm-rotulo">Colores</label>
                            <div className="adm-fila-envuelta">
                                <ColorField label="Título" value={welcomeModal.title_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, title_color: v }))} />
                                <ColorField label="Mensaje" value={welcomeModal.body_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, body_color: v }))} />
                                <ColorField label="Fondo modal" value={welcomeModal.bg_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, bg_color: v }))} />
                                <ColorField label="Fondo botón" value={welcomeModal.button_bg_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, button_bg_color: v }))} />
                                <ColorField label="Texto botón" value={welcomeModal.button_text_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, button_text_color: v }))} />
                            </div>
                            <p className="adm-nota-suelta">
                                La "X" para cerrar se ajusta automáticamente para contrastar con el fondo del modal.
                            </p>
                        </div>
                    </div>

                    <div className="adm-nota">
                        <Info size={16} className="adm-icono-fijo" />
                        <p className="adm-ayuda">
                            Si cambias el contenido, el modal volverá a mostrarse aunque el cliente ya lo haya visto. Deja el botón sin texto si no quieres llamado a la acción.
                        </p>
                    </div>
                </section>

                <section className="adm-panel adm-panel--ancho">
                    <div className="adm-fila-titulo">
                        <div className="adm-emblema-color adm-emblema-color--verde">
                            <Tag size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Precios por cantidad (mayorista, iglesia)</h3>
                    </div>
                    <p className="adm-descripcion">
                        El descuento se aplica solo si la clienta lleva el mínimo de unidades <strong>del mismo producto y color</strong>,
                        y <strong>todas las tallas caen dentro del rango</strong>. Puede mezclar tallas: 5 de la 12 y 1 de la 3XL cuenta como 6.
                        Si un pedido califica para dos tramos, se cobra el más barato.
                    </p>

                    {(priceTiers.tiers || []).map((t, i) => {
                        // Los valores de "desde/hasta" dependen de qué característica
                        // eligió para ESTE tramo — no está fijo a Talla. Si mañana
                        // define un tramo por Material o por Idioma, funciona igual.
                        const valoresCaracteristica = t.characteristic ? (atributosDisponibles[t.characteristic] || []) : [];
                        return (
                        <div key={i} className="adm-tarjeta-interna">
                            <div className="adm-rejilla--estrecha">
                                <div className="input-group">
                                    <label className="adm-rotulo">Nombre del tramo</label>
                                    <input type="text" value={t.name || ''} placeholder="Ej: Iglesia"
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, name: e.target.value } : x) }))}
                                        className="adm-entrada" />
                                </div>
                                <div className="input-group">
                                    <label className="adm-rotulo">Característica</label>
                                    <select value={t.characteristic || ''} className="adm-entrada"
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, characteristic: e.target.value, from: '', to: '' } : x) }))}>
                                        <option value="">—</option>
                                        {Object.keys(atributosDisponibles).map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="adm-rotulo">Desde</label>
                                    <select value={t.from || ''} className="adm-entrada" disabled={!t.characteristic}
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, from: e.target.value } : x) }))}>
                                        <option value="">—</option>
                                        {valoresCaracteristica.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="adm-rotulo">Hasta</label>
                                    <select value={t.to || ''} className="adm-entrada" disabled={!t.characteristic}
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, to: e.target.value } : x) }))}>
                                        <option value="">—</option>
                                        {valoresCaracteristica.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="adm-rotulo">Mínimo de unidades</label>
                                    {/* `|| ''` y no `?? 0`: con type="number", React compara el
                                        valor NUMERICAMENTE, asi que "03545" y 3545 le parecen iguales
                                        y no toca el DOM. El cero inicial se quedaba pegado adelante
                                        mientras se escribia. Un campo sin valor ahora se ve vacio, que
                                        ademas es lo que significa: sin minimo. */}
                                    <input type="number" min="2" value={t.min_qty || ''}
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, min_qty: parseInt(e.target.value) || 0 } : x) }))}
                                        className="adm-entrada" />
                                </div>
                                <div className="input-group">
                                    <label className="adm-rotulo">Tipo de descuento</label>
                                    <select value={t.discount_type || 'percent'} className="adm-entrada"
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, discount_type: e.target.value } : x) }))}>
                                        <option value="percent">Porcentaje (%)</option>
                                        <option value="amount">Rebaja fija ($)</option>
                                        <option value="fixed">Precio fijo ($)</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="adm-rotulo">Valor</label>
                                    <input type="number" min="0" value={t.discount_value ?? ''}
                                        onChange={e => setPriceTiers(p => ({ ...p, tiers: p.tiers.map((x, k) => k === i ? { ...x, discount_value: parseFloat(e.target.value) || 0 } : x) }))}
                                        className="adm-entrada" />
                                </div>
                            </div>
                            <button type="button"
                                onClick={() => setPriceTiers(p => ({ ...p, tiers: p.tiers.filter((_, k) => k !== i) }))}
                                className="adm-quitar">
                                Eliminar este tramo
                            </button>
                        </div>
                        );
                    })}

                    <button type="button"
                        onClick={() => setPriceTiers(p => ({ ...p, tiers: [...(p.tiers || []), { name: '', characteristic: '', from: '', to: '', min_qty: 6, discount_type: 'percent', discount_value: 10 }] }))}
                        className="adm-boton-oscuro">
                        + Agregar tramo
                    </button>
                </section>

                <section className="adm-panel adm-panel--ancho">
                    <div className="adm-fila-titulo">
                        <div className="adm-emblema-color adm-emblema-color--rosa">
                            <Gift size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Promociones</h3>
                    </div>
                    <p className="adm-descripcion">
                        <strong>Lleva X, paga Y:</strong> con descuento 100% la unidad va gratis (un 3x2 clásico);
                        con 50% queda a mitad de precio (la típica "segunda unidad al 50%"). El descuento se aplica
                        siempre sobre las prendas <strong>más baratas</strong> del carrito.
                        Si no eliges productos, la promoción aplica a <strong>todo el catálogo</strong>.
                    </p>

                    {(promotions.promos || []).map((p, i) => {
                        const editar = (campos) => setPromotions(prev => ({
                            ...prev,
                            promos: prev.promos.map((x, k) => k === i ? { ...x, ...campos } : x)
                        }));
                        const esRegalo = p.type === 'regalo';
                        return (
                            <div key={i} className="adm-tarjeta-interna">
                                <div className="adm-rejilla--estrecha">
                                    <div className="input-group">
                                        <label className="adm-rotulo">Nombre</label>
                                        <input type="text" value={p.name || ''} placeholder="Ej: Lleva 3 paga 2"
                                            onChange={e => editar({ name: e.target.value })} className="adm-entrada" />
                                    </div>
                                    <div className="input-group">
                                        <label className="adm-rotulo">Tipo</label>
                                        <select value={p.type || 'cantidad'} className="adm-entrada"
                                            onChange={e => editar({ type: e.target.value })}>
                                            <option value="cantidad">Lleva X, paga Y</option>
                                            <option value="regalo">Regalo por compra</option>
                                        </select>
                                    </div>

                                    {!esRegalo && (
                                        <>
                                            <div className="input-group">
                                                <label className="adm-rotulo">Lleva</label>
                                                <input type="number" min="2" value={p.lleva || ''}
                                                    onChange={e => editar({ lleva: parseInt(e.target.value) || 0 })} className="adm-entrada" />
                                            </div>
                                            <div className="input-group">
                                                <label className="adm-rotulo">Paga</label>
                                                <input type="number" min="1" value={p.paga || ''}
                                                    onChange={e => editar({ paga: parseInt(e.target.value) || 0 })} className="adm-entrada" />
                                            </div>
                                            <div className="input-group">
                                                <label className="adm-rotulo">Descuento (%)</label>
                                                <input type="number" min="1" max="100" value={p.descuento || ''}
                                                    onChange={e => editar({ descuento: parseInt(e.target.value) || 0 })} className="adm-entrada" />
                                            </div>
                                        </>
                                    )}

                                    {esRegalo && (
                                        <>
                                            <div className="input-group">
                                                <label className="adm-rotulo">Qué se regala</label>
                                                <input type="text" value={p.regalo_texto || ''} placeholder="Ej: Un cuello de encaje"
                                                    onChange={e => editar({ regalo_texto: e.target.value })} className="adm-entrada" />
                                            </div>
                                            <div className="input-group">
                                                <label className="adm-rotulo">Mínimo de unidades</label>
                                                <input type="number" min="0" value={p.min_unidades || ''}
                                                    onChange={e => editar({ min_unidades: parseInt(e.target.value) || 0 })} className="adm-entrada" />
                                            </div>
                                            <div className="input-group">
                                                <label className="adm-rotulo">O monto mínimo ($)</label>
                                                <input type="number" min="0" value={p.min_monto || ''}
                                                    onChange={e => editar({ min_monto: parseInt(e.target.value) || 0 })} className="adm-entrada" />
                                            </div>
                                        </>
                                    )}

                                    <div className="input-group">
                                        <label className="adm-rotulo">Válida desde</label>
                                        <input type="date" value={p.desde || ''}
                                            onChange={e => editar({ desde: e.target.value })} className="adm-entrada" />
                                    </div>
                                    <div className="input-group">
                                        <label className="adm-rotulo">Válida hasta</label>
                                        <input type="date" value={p.hasta || ''}
                                            onChange={e => editar({ hasta: e.target.value })} className="adm-entrada" />
                                    </div>
                                </div>

                                <div className="input-group adm-separacion--arriba">
                                    <label className="adm-rotulo">Productos ({(p.productos || []).length === 0 ? 'todo el catálogo' : `${p.productos.length} elegidos`})</label>
                                    <div className="adm-etiquetas">
                                        {productosDisponibles.map(prod => {
                                            const elegido = (p.productos || []).map(String).includes(String(prod.id));
                                            return (
                                                <button key={prod.id} type="button"
                                                    onClick={() => {
                                                        const actuales = (p.productos || []).map(String);
                                                        editar({
                                                            productos: elegido
                                                                ? actuales.filter(x => x !== String(prod.id))
                                                                : [...actuales, String(prod.id)]
                                                        });
                                                    }}
                                                    style={{
                                                        border: `1px solid ${elegido ? '#be185d' : '#e2e8f0'}`,
                                                        background: elegido ? '#fce7f3' : '#fff',
                                                        color: elegido ? '#be185d' : '#64748b',
                                                        borderRadius: '8px', padding: '5px 10px', fontSize: '12px',
                                                        fontWeight: 700, cursor: 'pointer'
                                                    }}>
                                                    {prod.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <label className="adm-elegible--arriba">
                                    <input type="checkbox" checked={p.combinable === true}
                                        onChange={e => editar({ combinable: e.target.checked })}
                                        className="adm-casilla" />
                                    <span className="adm-texto-medio">
                                        Se puede combinar con los precios por cantidad (mayorista/iglesia)
                                    </span>
                                </label>

                                <button type="button"
                                    onClick={() => setPromotions(prev => ({ ...prev, promos: prev.promos.filter((_, k) => k !== i) }))}
                                    className="adm-quitar">
                                    Eliminar esta promoción
                                </button>
                            </div>
                        );
                    })}

                    <button type="button"
                        onClick={() => setPromotions(p => ({ ...p, promos: [...(p.promos || []), { name: '', type: 'cantidad', lleva: 3, paga: 2, descuento: 100, productos: [], combinable: false }] }))}
                        className="adm-boton-oscuro adm-boton-rosa">
                        + Agregar promoción
                    </button>
                </section>

                <section className="adm-panel adm-panel--ancho">
                    <div className="adm-panel-cabecera">
                        <div className="adm-emblema-color adm-emblema-color--ambar">
                            <Megaphone size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Barra de Anuncio (arriba del sitio)</h3>
                    </div>

                    <label className="adm-elegible adm-elegible--separada">
                        <input
                            type="checkbox"
                            checked={topBanner.active}
                            onChange={(e) => setTopBanner(prev => ({ ...prev, active: e.target.checked }))}
                            className="adm-casilla"
                        />
                        <span className="adm-etiqueta-fuerte">
                            Mostrar la barra de anuncio en la parte superior
                        </span>
                    </label>

                    <div className="input-group adm-separacion--amplia">
                        <label className="adm-rotulo"><Info size={14} /> Mensaje</label>
                        <input
                            type="text"
                            value={topBanner.text}
                            onChange={(e) => setTopBanner(prev => ({ ...prev, text: e.target.value }))}
                            placeholder="Ej: Envío gratis en compras sobre $50.000"
                            className="adm-entrada"
                        />
                    </div>

                    <div className="adm-rejilla--holgada">
                        <div className="input-group">
                            <LinkField
                                label="Enlace (opcional)"
                                value={topBanner.link}
                                onChange={(v, lbl) => setTopBanner(prev => ({ ...prev, link: v, link_label: prev.link_label || lbl || '' }))}
                            />
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><Info size={14} /> Texto del enlace (apodo, opcional)</label>
                            <input
                                type="text"
                                value={topBanner.link_label}
                                onChange={(e) => setTopBanner(prev => ({ ...prev, link_label: e.target.value }))}
                                placeholder="Ej: Click acá"
                                className="adm-entrada"
                            />
                            <p className="adm-ayuda adm-ayuda--pegada">
                                Si lo dejas vacío, se muestra el enlace en crudo. Si es interno redirige; si es externo abre otra pestaña.
                            </p>
                        </div>
                        <div className="input-group">
                            <label className="adm-rotulo"><Info size={14} /> Frecuencia</label>
                            <select
                                value={topBanner.frequency}
                                onChange={(e) => setTopBanner(prev => ({ ...prev, frequency: e.target.value }))}
                                className="adm-entrada"
                            >
                                <option value="session">Una vez por sesión</option>
                                <option value="day">Una vez por día</option>
                                <option value="always">Siempre al entrar</option>
                            </select>
                            <p className="adm-ayuda adm-ayuda--pegada">
                                {topBanner.frequency === 'session' && 'Si el cliente la cierra, no reaparece hasta cerrar y reabrir el navegador.'}
                                {topBanner.frequency === 'day' && 'Reaparece una vez al día aunque la haya cerrado.'}
                                {topBanner.frequency === 'always' && 'Aparece cada vez que entra (se puede cerrar por esa visita).'}
                            </p>
                        </div>
                    </div>

                    <div className="adm-separacion--amplia">
                        <label className="adm-rotulo">Colores</label>
                        <div className="adm-fila-envuelta">
                            <ColorField label="Fondo" value={topBanner.bg_color} onChange={(v) => setTopBanner(prev => ({ ...prev, bg_color: v }))} />
                            <ColorField label="Texto" value={topBanner.text_color} onChange={(v) => setTopBanner(prev => ({ ...prev, text_color: v }))} />
                        </div>
                    </div>

                    <div className="adm-rejilla adm-rejilla--separada">
                        <div className="input-group">
                            <label className="adm-rotulo">Tamaño de letra</label>
                            <select
                                value={topBanner.font_size}
                                onChange={(e) => setTopBanner(prev => ({ ...prev, font_size: e.target.value }))}
                                className="adm-entrada"
                            >
                                <option value="normal">Normal</option>
                                <option value="large">Grande</option>
                                <option value="xlarge">Muy grande</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="adm-elegible adm-elegible--suelta">
                                <input
                                    type="checkbox"
                                    checked={topBanner.bold}
                                    onChange={(e) => setTopBanner(prev => ({ ...prev, bold: e.target.checked }))}
                                    className="adm-casilla"
                                />
                                <span className="adm-etiqueta-fuerte">
                                    Negrita
                                </span>
                            </label>
                        </div>
                    </div>

                    <label className="adm-elegible adm-elegible--junta">
                        <input
                            type="checkbox"
                            checked={topBanner.animated}
                            onChange={(e) => setTopBanner(prev => ({ ...prev, animated: e.target.checked }))}
                            className="adm-casilla"
                        />
                        <span className="adm-etiqueta-fuerte">
                            Texto en movimiento (animación deslizante)
                        </span>
                    </label>

                    {topBanner.animated && (
                        <div className="adm-rejilla">
                            <div className="input-group">
                                <label className="adm-rotulo">Dirección</label>
                                <select
                                    value={topBanner.direction}
                                    onChange={(e) => setTopBanner(prev => ({ ...prev, direction: e.target.value }))}
                                    className="adm-entrada"
                                >
                                    <option value="left">← Hacia la izquierda (clásico)</option>
                                    <option value="right">→ Hacia la derecha</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="adm-rotulo">Velocidad</label>
                                <select
                                    value={topBanner.speed}
                                    onChange={(e) => setTopBanner(prev => ({ ...prev, speed: parseInt(e.target.value) }))}
                                    className="adm-entrada"
                                >
                                    <option value={40}>Muy lenta</option>
                                    <option value={28}>Lenta</option>
                                    <option value={20}>Normal</option>
                                    <option value={12}>Rápida</option>
                                    <option value={7}>Muy rápida</option>
                                </select>
                            </div>
                            <div className="input-group adm-ancho-total">
                                <label className="adm-elegible">
                                    <input
                                        type="checkbox"
                                        checked={topBanner.repeat}
                                        onChange={(e) => setTopBanner(prev => ({ ...prev, repeat: e.target.checked }))}
                                        className="adm-casilla"
                                    />
                                    <span className="adm-etiqueta-fuerte">
                                        Repetir el texto para llenar la barra
                                    </span>
                                </label>
                                <p className="adm-ayuda adm-ayuda--pegada">
                                    {topBanner.repeat
                                        ? 'Activado: el mensaje se repite formando un flujo continuo que llena toda la barra (tipo ticker).'
                                        : 'Desactivado: un solo mensaje cruza la barra, sale por un lado y vuelve a entrar por el otro (con espacio entre pasadas).'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="adm-nota">
                        <Info size={16} className="adm-icono-fijo" />
                        <p className="adm-ayuda">
                            El cliente puede cerrarla; no reaparece en esa sesión. Si cambias el mensaje, vuelve a mostrarse. Con el texto en movimiento, la animación se pausa al pasar el mouse.
                        </p>
                    </div>
                </section>

                <section className="adm-panel adm-panel--ancho">
                    <div className="adm-panel-cabecera">
                        <div className="adm-emblema-color adm-emblema-color--azul">
                            <Info size={20} />
                        </div>
                        <h3 className="adm-panel-titulo">Página "Nosotros"</h3>
                    </div>

                    <MediaField
                        label="Imagen del Taller"
                        value={{ asset_id: nosotros.image_asset_id, url: nosotros.image_url }}
                        onChange={(v) => setNosotros(prev => ({ ...prev, image_asset_id: v.asset_id, image_url: v.url }))}
                    />

                    <div className="adm-nota">
                        <Info size={16} className="adm-icono-fijo" />
                        <p className="adm-ayuda">
                            Si no eliges una imagen, se mostrará la que viene por defecto en la página.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

const ColorField = ({ label, value, onChange }) => (
    <div className="adm-columna--menuda">
        <span className="adm-nota-menor">{label}</span>
        <div className="adm-fila-icono">
            <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="adm-color"
            />
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="adm-entrada adm-entrada--corta"
            />
        </div>
    </div>
);



export default SettingsManager;
