import React, { useState, useEffect } from 'react';
import ArmadorDePrenda from '../../ui/ArmadorDePrenda';
import './Contacto.css';
import { useSettings } from '../../../context/SettingsContext';
import { Camera, Globe, MessageCircle, Mail, Phone, MapPin, Clock, User, Users, Calendar, FileText, X, Map, Navigation, Package } from 'lucide-react';
import { formatRUT } from '../../../utils/formatters';
import { openWhatsApp } from '../../../utils/cartUtils';
import { buildMapLinks } from '../../../utils/mapLinks';
import Button from '../../ui/Button';
import { post } from '../../../lib/api/client';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { formatearTelefono } from '../../../utils/telefono';
import CamposEntrega from './contacto/CamposEntrega';
import { armarSolicitud } from './contacto/armarSolicitud';
import { ENTREGA_INICIAL } from './contacto/entrega';

const BORRADOR = 'contactoDraft';
const METODOS_POR_DEFECTO = ['STARKEN', 'CORREOS DE CHILE', 'OTRO'];

const formularioVacio = (transporte) => ({
    rut: '',
    nombre: '',
    email: '',
    whatsapp: '+569',
    entrega: ENTREGA_INICIAL,
    transporte,
    region: '',
    comuna: '',
    comuna_id: '',
    direccion: '',
    mensaje: '',
    tipoGrupo: 'Coristas',
    cantidad: '',
    evento: ''
});

const Contacto = () => {
    const { settings } = useSettings();
    const contact = settings.contact_info || {};
    const social = settings.social_links || {};
    const { googleMapsUrl, wazeUrl } = buildMapLinks();

    // Los transportistas. El retiro en tienda no es uno de ellos: es su propio
    // tipo de entrega (ver contacto/entrega.js), igual que en el carrito.
    const metodosConfigurados = (settings?.shipping_methods ?? METODOS_POR_DEFECTO).filter(m => {
        const nombre = m.toUpperCase();
        return !nombre.includes('CHILEXPRESS') && !nombre.includes('RETIRO');
    });
    const finalShippingMethods = metodosConfigurados.length > 0 ? metodosConfigurados : METODOS_POR_DEFECTO;

    const [tipoContacto, setTipoContacto] = useState('seleccion'); // 'seleccion', 'individual', 'grupo'

    // Las prendas que la clienta arma para este pedido. El modal arma UNA: la
    // lista vive acá porque una misma solicitud puede llevar varias.
    const [prendas, setPrendas] = useState([]);
    const [armando, setArmando] = useState(false);
    const [atributos, setAtributos] = useState({});
    const [catalogo, setCatalogo] = useState([]);

    // Con el formulario abierto, la rueda del mouse fuera de la tarjeta movía
    // la página de atrás: se perdía de vista el formulario que se estaba
    // llenando. Es el mismo candado que ya usan el carrito y los otros
    // modales; a éste no se le había puesto.
    useScrollLock(tipoContacto !== 'seleccion');

    // Las características y las prendas salen del catálogo: la clienta elige,
    // no inventa. Se piden la primera vez que abre el armador.
    const abrirArmador = async () => {
        setArmando(true);
        if (Object.keys(atributos).length) return;
        try {
            const [meta, prods] = await Promise.all([
                fetch('/api/v1/products/filters-metadata').then(r => r.json()),
                fetch('/api/v1/products/').then(r => r.json()),
            ]);
            setAtributos(meta?.attributes || {});
            setCatalogo(Array.isArray(prods) ? prods : []);
        } catch { /* si falla, el armador lo dice y se puede pedir igual por el mensaje */ }
    };

    // Lo escrito se guarda mientras se llena, para no perderlo si se recarga
    // la página. Un borrador viejo se completa con los campos que le falten.
    const [formData, setFormData] = useState(() => {
        const vacio = formularioVacio(finalShippingMethods[0]);
        try {
            const guardado = JSON.parse(localStorage.getItem(BORRADOR) || 'null');
            return guardado ? { ...vacio, ...guardado } : vacio;
        } catch {
            return vacio;
        }
    });
    const cambiar = (parcial) => setFormData(prev => ({ ...prev, ...parcial }));

    const [status, setStatus] = useState(''); // 'sending', 'success', 'error-whatsapp'

    // Los ajustes cargan después: si el transportista elegido no está en la
    // lista real, vale el primero. Se resuelve al leer, sin reescribir lo guardado.
    const datos = finalShippingMethods.includes(formData.transporte)
        ? formData
        : { ...formData, transporte: finalShippingMethods[0] };

    useEffect(() => {
        try { localStorage.setItem(BORRADOR, JSON.stringify(formData)); } catch { /* sin almacenamiento se sigue igual */ }
    }, [formData]);

    const handleWhatsAppChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+569')) {
            value = '+569';
        }
        const numbers = value.slice(4).replace(/\D/g, '').slice(0, 8);
        cambiar({ whatsapp: '+569' + numbers });
    };

    const validateWhatsApp = (number) => /^\+569\d{8}$/.test(number);

    const olvidarFormulario = () => {
        setFormData(formularioVacio(finalShippingMethods[0]));
        setPrendas([]);
        try { localStorage.removeItem(BORRADOR); } catch { /* nada que borrar */ }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateWhatsApp(datos.whatsapp)) {
            setStatus('error-whatsapp');
            return;
        }

        const { mensaje, pedido } = armarSolicitud({ tipo: tipoContacto, datos, prendas });

        // Se olvida ANTES de abrir WhatsApp. Si el navegador lo abre en esta
        // misma pestaña, lo que viene después ya no corre: el borrador quedaba
        // guardado y al volver el formulario aparecía con todo lo enviado.
        olvidarFormulario();

        // keepalive: el registro llega al panel aunque la página se vaya a
        // WhatsApp mientras viaja.
        const registro = post('/api/v1/crm/', pedido, { keepalive: true });

        // Dentro del mismo clic y sin esperar nada: si no, el navegador
        // bloquea la ventana (iPhone, iPad).
        const numeroTaller = (social.whatsapp || '').replace(/\D/g, '');
        if (numeroTaller) openWhatsApp(numeroTaller, mensaje);

        setStatus('sending');
        try {
            await registro;
        } catch (error) {
            // WhatsApp ya se abrió con la solicitud completa: no se le pide a
            // la clienta que lo haga de nuevo.
            console.error('No se pudo registrar el contacto en el panel', error);
        }
        setStatus('success');
    };

    const renderSelection = () => (
        <div className="contact-selection fade-in">
            <h2 className="selection-title">¿Cómo podemos ayudarte?</h2>
            <div className="selection-grid">
                <div className="selection-card" onClick={() => setTipoContacto('individual')}>
                    <div className="card-icon">🛍️</div>
                    <h3>Busco una prenda para mí</h3>
                    <p>Consultas sobre tallas, disponibilidad o visitas al local en San Carlos.</p>
                    <Button variant="secondary">Contactar Ventas</Button>
                </div>
                <div className="selection-card" onClick={() => setTipoContacto('grupo')}>
                    <div className="card-icon">⛪</div>
                    <h3>Uniformes para mi Grupo</h3>
                    <p>Cotizaciones para Coristas o Dorcas, elección de telas y plazos de confección.</p>
                    <Button variant="secondary">Solicitar Presupuesto</Button>
                </div>
            </div>
        </div>
    );

    const renderFormModal = () => {
        if (tipoContacto === 'seleccion') return null;

        return (
            <div className="contact-modal-overlay fade-in" onClick={() => setTipoContacto('seleccion')}>
                {/* Encima del formulario, arma UNA prenda. Al confirmarla se suma
                    a la lista de arriba y se cierra: si quiere otra, vuelve a
                    abrirlo. */}
                {armando && (
                    <div className="armador-overlay" onClick={e => { e.stopPropagation(); setArmando(false); }}>
                        <div className="armador-caja" onClick={e => e.stopPropagation()}>
                            <ArmadorDePrenda
                                atributos={atributos}
                                productos={catalogo}
                                mostrarPrecio={false}
                                textoBoton="Agregar esta prenda"
                                onAgregar={({ nombre, productoId, config, propuestos }) => {
                                    setPrendas(p => [...p, { nombre, productoId, config, propuestos, cantidad: 1 }]);
                                    setArmando(false);
                                }}
                                onCancelar={() => setArmando(false)}
                            />
                        </div>
                    </div>
                )}
                <div className="contact-modal-card slide-up" onClick={e => e.stopPropagation()}>
                    <div className="contact-modal-header">
                        <h2>{tipoContacto === 'individual' ? 'Consulta Personal' : 'Presupuesto Grupal'}</h2>
                        <button type="button" className="btn-close-modal" onClick={() => setTipoContacto('seleccion')}>
                            <X size={20} />
                        </button>
                    </div>

                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="contact-form-body">
                            <p className="form-intro">Déjanos tus datos y te contactaremos a la brevedad.</p>
                <div className="form-group">
                    <label><User size={16} /> RUT *</label>
                    <input
                        type="text"
                        placeholder="Ej: 12.345.678-9"
                        required
                        value={formData.rut}
                        onChange={(e) => cambiar({ rut: e.target.value })}
                        onBlur={(e) => cambiar({ rut: formatRUT(e.target.value) })}
                    />
                </div>
                <div className="form-group">
                    <label><User size={16} /> Nombre Completo *</label>
                    <input
                        type="text"
                        placeholder="Ej: María González"
                        required
                        value={formData.nombre}
                        onChange={(e) => cambiar({ nombre: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label><Mail size={16} /> Email</label>
                    <input
                        type="email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={(e) => cambiar({ email: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label><Phone size={16} /> WhatsApp (Chile) *</label>
                    <input
                        type="tel"
                        placeholder="+569 1234 5678"
                        required
                        value={formData.whatsapp}
                        onChange={handleWhatsAppChange}
                        className={status === 'error-whatsapp' ? 'input-error' : ''}
                    />
                    {status === 'error-whatsapp' && <span className="error-msg">El número debe tener 8 dígitos después del +569</span>}
                </div>

                <CamposEntrega datos={datos} cambiar={cambiar} metodosEnvio={finalShippingMethods} />

                {tipoContacto === 'grupo' && (
                    <>
                        <div className="form-row--dos">
                            <div className="form-group">
                                <label><Users size={16} /> Tipo de Grupo</label>
                                <select
                                    value={formData.tipoGrupo}
                                    onChange={(e) => cambiar({ tipoGrupo: e.target.value })}
                                >
                                    <option>Coristas</option>
                                    <option>Dorcas</option>
                                    <option>Otro</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label><Users size={16} /> Cantidad Aprox.</label>
                                <input
                                    type="number"
                                    placeholder="Ej: 20"
                                    required
                                    value={formData.cantidad}
                                    onChange={(e) => cambiar({ cantidad: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label><Calendar size={16} /> Fecha de Evento (Opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: Aniversario en Noviembre"
                                value={formData.evento}
                                onChange={(e) => cambiar({ evento: e.target.value })}
                            />
                        </div>
                    </>
                )}

                {/* Las prendas que quiere, armadas con las características del
                    catálogo. Antes esto se escribía en el mensaje y llegaba como
                    un párrafo imposible de cortar o cotizar. */}
                <div className="form-group">
                    <label><Package size={16} /> Prendas que necesitas</label>

                    {prendas.length > 0 && (
                        <ul className="prendas-pedidas">
                            {prendas.map((pr, i) => (
                                <li key={i}>
                                    <div>
                                        <strong>{pr.nombre}</strong>
                                        {Object.keys(pr.config || {}).length > 0 && (
                                            <span className="prenda-detalle">
                                                {Object.entries(pr.config).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                            </span>
                                        )}
                                        {pr.propuestos && Object.keys(pr.propuestos).length > 0 && (
                                            <span className="prenda-propuesta">
                                                A confirmar con el taller: {Object.keys(pr.propuestos).join(', ').toLowerCase()}
                                            </span>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setPrendas(p => p.filter((_, j) => j !== i))}
                                        aria-label="Quitar">
                                        <X size={15} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <button type="button" className="btn-armar-prenda" onClick={abrirArmador}>
                        + Pide tu prenda personalizada
                    </button>
                </div>

                <div className="form-group">
                    <label><FileText size={16} /> Mensaje</label>
                    <textarea
                        rows="4"
                        placeholder="Cuéntanos más para asesorarte mejor..."
                        value={formData.mensaje}
                        onChange={(e) => cambiar({ mensaje: e.target.value })}
 ></textarea>
                </div>

                        </div>

                        <div className="contact-form-footer">
                            <Button type="submit" variant="primary" disabled={status === 'sending'} className="contacto-enviar">
                                {status === 'sending' ? 'Enviando...' : 'Enviar Solicitud'}
                            </Button>

                            {status === 'success' && (
                                <div className="success-banner">¡Listo! Te abrimos WhatsApp para enviar tu solicitud. Si no se abrió, revisa que tu navegador permita ventanas emergentes.</div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <section className="contacto-view">
            {renderFormModal()}
            <div className="container">
                <div className="contacto-header">
                    <span className="subtitle">Hablemos</span>
                    <h1>Contacto Directo</h1>
                    <p className="hero-text">Estamos en San Carlos, Ñuble, listos para vestir tu fe con elegancia.</p>
                </div>

                <div>
                    {renderSelection()}
                </div>

                <div className="contacto-footer-info">
                    <div className="info-block">
                        <h4><MapPin size={18} /> Taller y Showroom</h4>
                        <p>{contact.address || 'Camino San Camilo Km 1,8, San Carlos, Chile.'}</p>
                    </div>
                    {contact.email && (
                        <div className="info-block">
                            <h4><Mail size={18} /> Correo Electrónico</h4>
                            <p>{contact.email}</p>
                        </div>
                    )}
                    {contact.phone_display && (
                        <div className="info-block">
                            <h4><Phone size={18} /> Teléfono Directo</h4>
                            <p>{formatearTelefono(contact.phone_display)}</p>
                        </div>
                    )}
                    <div className="info-block">
                        <h4><Clock size={18} /> Horarios</h4>
                        <p>Lun - Vie: 09:00 - 18:00 / Sáb: 09:00 - 14:00</p>
                    </div>
                </div>

                <div className="contacto-social-links">
                    {social.facebook && (
                        <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Globe size={24} /> <span>Facebook</span>
                        </a>
                    )}
                    {social.instagram && (
                        <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Camera size={24} /> <span>Instagram</span>
                        </a>
                    )}
                    {social.whatsapp && (
                        <a href={`https://wa.me/${social.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <MessageCircle size={24} /> <span>WhatsApp</span>
                        </a>
                    )}
                    {googleMapsUrl && (
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Map size={24} /> <span>Google Maps</span>
                        </a>
                    )}
                    {wazeUrl && (
                        <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Navigation size={24} /> <span>Waze</span>
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Contacto;
