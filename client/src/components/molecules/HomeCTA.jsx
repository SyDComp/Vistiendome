import React, { useState } from 'react';
import Button from '../atoms/Button';
import Modal from './Modal';
import { useNotification } from '../../context/NotificationContext';
import { WhatsAppIcon } from '../atoms/SocialIcons';
import './HomeCTA.css';

// ... imports
import api from '../../services/api'; // Add API import

const HomeCTA = () => {
    const { showNotification } = useNotification();
    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);

    const openModal = (type) => {
        setActiveModal(type);
    };

    const closeModal = () => {
        setActiveModal(null);
        setFormData({ name: '', email: '', phone: '', message: '' }); // Reset form
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // Allow only numbers and +
            const filteredValue = value.replace(/[^0-9+]/g, '');
            setFormData(prev => ({ ...prev, [name]: filteredValue }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/contact', {
                ...formData,
                subject: 'Nuevo Pedido Personalizado (desde Home)'
            });
            showNotification('success', '¡Hemos recibido tu pedido personalizado! Te contactaremos pronto.');
            closeModal();
        } catch (error) {
            console.error('Error submitting form:', error);
            showNotification('error', 'Hubo un error al enviar la solicitud. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="home-cta-section">
            {/* ... (buttons remain same) ... */}
            <div className="cta-container">
                <div className="cta-buttons-wrapper">
                    <Button
                        variant="primary"
                        size="lg"
                        className="cta-btn-order"
                        onClick={() => openModal('order')}
                    >
                        📝 Solicitar Pedido
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="cta-btn-whatsapp"
                        onClick={() => openModal('whatsapp')}
                    >
                        <WhatsAppIcon size={20} /> Contactar por WhatsApp
                    </Button>
                </div>
            </div>

            {/* Modal Solicitar Pedido */}
            <Modal
                isOpen={activeModal === 'order'}
                onClose={closeModal}
                title="¿Cómo Solicitar un Pedido?"
                footer={
                    <div className="modal-footer-content">
                        <Button
                            onClick={() => openModal('customRequest')}
                            variant="primary"
                            className="btn-custom-order"
                        >
                            ✨ Pedido Personalizado
                        </Button>
                        <Button onClick={closeModal} variant="secondary">Entendido</Button>
                    </div>
                }
            >
                <div className="modal-body-content">
                    <p>✨ <strong>¡Crear tu pedido es muy sencillo!</strong></p>
                    <ol className="steps-list">
                        <li>Explora nuestro <strong>Catálogo</strong> y añade los productos que te encanten al carrito.</li>
                        <li>Ve a tu <strong>Carrito de Compras</strong> y revisa tu selección.</li>
                        <li>Haz clic en <strong>"Cotizar Pedido"</strong>.</li>
                        <li>Completa tus datos de contacto y envíanos la solicitud.</li>
                    </ol>
                    <p className="note">Nos pondremos en contacto contigo a la brevedad para confirmar disponibilidad y coordinar el pago/entrega.</p>
                </div>
            </Modal>

            {/* Modal Pedido Personalizado */}
            <Modal
                isOpen={activeModal === 'customRequest'}
                onClose={closeModal}
                title="Solicitud de Pedido Personalizado"
            >
                <div className="modal-body-content">
                    <form onSubmit={handleSubmit} className="custom-order-form">
                        <p className="form-intro">Cuéntanos qué tienes en mente y lo haremos realidad.</p>

                        <div className="form-group">
                            <label>Nombre Completo <span className="input-required">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="Ej. María Pérez"
                            />
                        </div>

                        <div className="form-group">
                            <label>Correo Electrónico <span className="input-required">*</span></label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Teléfono (Opcional)</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="+56 9 ..."
                                maxLength={15}
                            />
                        </div>

                        <div className="form-group">
                            <label>Detalles del Pedido <span className="input-required">*</span></label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                required
                                className="form-input textarea"
                                rows="4"
                                placeholder="Describe el producto que buscas, medidas aproximadas, colores, estilo..."
                            />
                        </div>

                        <div className="form-actions">
                            <Button type="button" onClick={() => openModal('order')} variant="secondary">Volver</Button>
                            <Button type="submit" variant="primary" disabled={loading}>
                                {loading ? 'Enviando...' : 'Enviar Solicitud'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal WhatsApp */}
            <Modal
                isOpen={activeModal === 'whatsapp'}
                onClose={closeModal}
                title="Hablemos por WhatsApp"
                footer={
                    <>
                        <a
                            href="https://wa.me/56912345678"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            <Button variant="primary">Abrir WhatsApp</Button>
                        </a>
                        <Button onClick={closeModal} variant="secondary">Cerrar</Button>
                    </>
                }
            >
                <div className="modal-body-content center-text">
                    <div className="whatsapp-icon-large"><WhatsAppIcon size={64} /></div>
                    <p>¿Tienes dudas o quieres un diseño personalizado?</p>
                    <p><strong>Estamos disponibles para ayudarte.</strong></p>
                    <p>Horario de atención:<br />Lunes a Viernes de 9:00 a 18:00 hrs.</p>
                    <p className="phone-number">+56 9 1234 5678</p>
                </div>
            </Modal>
        </section>
    );
};

export default HomeCTA;
