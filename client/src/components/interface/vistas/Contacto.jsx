import React, { useState } from 'react';

const Contacto = () => {
    const [tipoContacto, setTipoContacto] = useState('seleccion'); // 'seleccion', 'individual', 'grupo'
    const [formData, setFormData] = useState({
        nombre: '',
        whatsapp: '+569',
        mensaje: '',
        tipoGrupo: 'Coristas',
        cantidad: '',
        evento: ''
    });

    const [status, setStatus] = useState(''); // 'sending', 'success', 'error'

    const handleWhatsAppChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+569')) {
            value = '+569';
        }
        // Solo permitir números después del +569
        const numbers = value.slice(4).replace(/\D/g, '').slice(0, 8);
        setFormData({ ...formData, whatsapp: '+569' + numbers });
    };

    const validateWhatsApp = (number) => {
        return /^\+569\d{8}$/.test(number);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateWhatsApp(formData.whatsapp)) {
            setStatus('error-whatsapp');
            return;
        }

        setStatus('sending');
        // Simulación de envío
        setTimeout(() => {
            console.log('Datos enviados:', formData);
            setStatus('success');
        }, 1500);
    };

    const renderSelection = () => (
        <div className="contact-selection fade-in">
            <h2 className="selection-title">¿Cómo podemos ayudarte?</h2>
            <div className="selection-grid">
                <div className="selection-card" onClick={() => setTipoContacto('individual')}>
                    <div className="card-icon">🛍️</div>
                    <h3>Busco una prenda para mí</h3>
                    <p>Consultas sobre tallas, disponibilidad o visitas al local en San Carlos.</p>
                    <button className="ui-btn ui-btn-secondary">Contactar Ventas</button>
                </div>
                <div className="selection-card" onClick={() => setTipoContacto('grupo')}>
                    <div className="card-icon">⛪</div>
                    <h3>Uniformes para mi Grupo</h3>
                    <p>Cotizaciones para Coristas o Dorcas, elección de telas y plazos de confección.</p>
                    <button className="ui-btn ui-btn-secondary">Solicitar Presupuesto</button>
                </div>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="contact-form-wrapper fade-in">
            <button className="back-btn" onClick={() => setTipoContacto('seleccion')}>
                ← Volver a elegir
            </button>
            <div className="form-header">
                <h2>{tipoContacto === 'individual' ? 'Consulta Personal' : 'Presupuesto Grupal'}</h2>
                <p>Déjanos tus datos y Paola te contactará a la brevedad.</p>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nombre Completo</label>
                    <input 
                        type="text" 
                        placeholder="Ej: María González" 
                        required 
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label>WhatsApp (Chile)</label>
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

                {tipoContacto === 'grupo' && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tipo de Grupo</label>
                                <select 
                                    value={formData.tipoGrupo}
                                    onChange={(e) => setFormData({...formData, tipoGrupo: e.target.value})}
                                >
                                    <option>Coristas</option>
                                    <option>Dorcas</option>
                                    <option>Otro</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cantidad Aprox.</label>
                                <input 
                                    type="number" 
                                    placeholder="Ej: 20" 
                                    required
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Fecha de Evento (Opcional)</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Aniversario en Noviembre"
                                value={formData.evento}
                                onChange={(e) => setFormData({...formData, evento: e.target.value})}
                            />
                        </div>
                    </>
                )}

                <div className="form-group">
                    <label>Mensaje</label>
                    <textarea 
                        rows="4" 
                        placeholder="Cuéntanos más para asesorarte mejor..."
                        value={formData.mensaje}
                        onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                    ></textarea>
                </div>
                
                <div className="form-submit-container">
                    <button type="submit" className="ui-btn ui-btn-primary" disabled={status === 'sending'}>
                        {status === 'sending' ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                </div>

                {status === 'success' && (
                    <div className="success-banner">¡Mensaje enviado con éxito! Paola se contactará contigo pronto.</div>
                )}
            </form>
        </div>
    );

    return (
        <section className="contacto-view">
            <div className="container">
                <div className="contacto-header">
                    <span className="subtitle">Hablemos</span>
                    <h1>Contacto Directo</h1>
                    <p className="hero-text">Estamos en San Carlos, Ñuble, listos para vestir tu fe con elegancia.</p>
                </div>

                <div className="contacto-main-container">
                    {tipoContacto === 'seleccion' ? renderSelection() : renderForm()}
                </div>

                <div className="contacto-footer-info">
                    <div className="info-block">
                        <h4>📍 Taller y Showroom</h4>
                        <p>Camino San Camilo Km 1,8, San Carlos, Chile.</p>
                    </div>
                    <div className="info-block">
                        <h4>⏰ Horarios</h4>
                        <p>Lun - Vie: 09:00 - 18:00 / Sáb: 09:00 - 14:00</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contacto;
