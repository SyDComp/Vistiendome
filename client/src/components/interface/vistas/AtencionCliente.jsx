import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const AtencionCliente = ({ initialSection = 'tallas' }) => {
    const location = useLocation();
    const [activeSection, setActiveSection] = useState(initialSection);

    // Sincronizar sección con el estado de navegación (Footer -> Deep Linking)
    useEffect(() => {
        if (location.state?.section) {
            setActiveSection(location.state.section);
            // Hacer scroll al inicio de la sección para asegurar visibilidad
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [location.state]);

    const sections = [
        { id: 'tallas', title: 'Guía de Tallas', icon: '📏' },
        { id: 'faq', title: 'Preguntas Frecuentes', icon: '❓' },
        { id: 'cambios', title: 'Cambios y Devoluciones', icon: '🔄' },
        { id: 'envios', title: 'Envíos y Seguimiento', icon: '🚚' },
        { id: 'cuidados', title: 'Cuidado de Prendas', icon: '✨' }
    ];

    const sizeGuideData = [
        { talla: '12', busto: '94-98', cintura: '76-80', cadera: '102-106' },
        { talla: '14', busto: '98-102', cintura: '80-84', cadera: '106-110' },
        { talla: '16 (XL)', busto: '102-106', cintura: '84-88', cadera: '110-114' },
        { talla: 'XXL (48)', busto: '108-112', cintura: '90-94', cadera: '116-120' },
        { talla: '3XL', busto: '114-118', cintura: '96-100', cadera: '122-126' },
        { talla: '4XL', busto: '120-124', cintura: '102-106', cadera: '128-132' },
        { talla: '5XL', busto: '126-130', cintura: '108-112', cadera: '134-138' },
        { talla: '6XL', busto: '132-136', cintura: '114-118', cadera: '140-144' },
        { talla: '7XL', busto: '140-146', cintura: '122-128', cadera: '148-154' },
    ];

    const faqs = [
        {
            q: "¿Hacen envíos a todo Chile?",
            a: "Sí, enviamos a todas las regiones a través de Starken y Chilexpress con cobro en destino o previo pago según prefieras."
        },
        {
            q: "¿Tienen tienda física para probarse?",
            a: "Contamos con nuestro taller showroom en San Carlos (Camino San Camilo Km 1,8). Te recomendamos agendar tu visita vía WhatsApp para darte una atención personalizada."
        },
        {
            q: "¿Cómo pido uniformes para mi grupo de Coristas?",
            a: "Puedes usar nuestro formulario de contacto sección 'Grupos' o hablarnos directamente por WhatsApp. Trabajamos con precios especiales por volumen desde las 12 unidades."
        },
        {
            q: "¿Qué telas utilizan?",
            a: "Seleccionamos textiles de alta gama como Punto Roma premium, Sofía, Lanillas y Encajes elásticos, priorizando la durabilidad y la caída elegante."
        }
    ];

    const renderTallas = () => (
        <div className="ayuda-content fade-in">
            <h2>Guía de Tallas Inclusiva</h2>
            <p className="ayuda-intro">
                En Vistiéndome, sabemos que cada cuerpo es único. Nuestra tabla de medidas está diseñada para que elijas con total confianza desde la talla 12 hasta la 7XL.
            </p>
            <div className="table-responsive">
                <table className="tallas-table">
                    <thead>
                        <tr>
                            <th>Talla</th>
                            <th>Busto (cm)</th>
                            <th>Cintura (cm)</th>
                            <th>Cadera (cm)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sizeGuideData.map((item, index) => (
                            <tr key={index}>
                                <td className="talla-highlight">{item.talla}</td>
                                <td>{item.busto}</td>
                                <td>{item.cintura}</td>
                                <td>{item.cadera}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="ayuda-tip">
                <strong>💡 Tip Pro:</strong> Si estás entre dos tallas, te recomendamos elegir la más grande para mayor comodidad, especialmente en telas sin elasticidad.
            </div>
        </div>
    );

    const renderFAQ = () => (
        <div className="ayuda-content fade-in">
            <h2>Preguntas Frecuentes</h2>
            <div className="faq-grid">
                {faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                        <h4>{faq.q}</h4>
                        <p>{faq.a}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCambios = () => (
        <div className="ayuda-content fade-in">
            <h2>Cambios y Devoluciones</h2>
            <div className="ayuda-text-block">
                <h3>Políticas de Satisfacción</h3>
                <p>Queremos que ames tu prenda Vistiéndome. Si por alguna razón necesitas un cambio:</p>
                <ul>
                    <li>Tienes <strong>15 días</strong> desde que recibes tu pedido para solicitar un cambio de talla o modelo.</li>
                    <li>La prenda debe estar sin uso, con sus etiquetas y en perfecto estado.</li>
                    <li>Los costos de envío por cambios de talla son responsabilidad de la cliente, a menos que exista una falla de fabricación.</li>
                    <li><strong>Pedidos Especiales:</strong> Las prendas confeccionadas a medida o con modificaciones personalizadas no admiten cambios ni devoluciones.</li>
                </ul>
            </div>
        </div>
    );

    const renderEnvios = () => (
        <div className="ayuda-content fade-in">
            <h2>Envíos y Seguimiento</h2>
            <div className="ayuda-text-block">
                <p>Procesamos tu pedido con la máxima dedicación desde San Carlos.</p>
                <div className="envio-steps">
                    <div className="step">
                        <strong>1. Confección / Preparación</strong>
                        <span>2-5 días hábiles (si no hay stock inmediato).</span>
                    </div>
                    <div className="step">
                        <strong>2. Despacho</strong>
                        <span>Te enviamos el número de seguimiento por WhatsApp.</span>
                    </div>
                    <div className="step">
                        <strong>3. Entrega</strong>
                        <span>Depende de la región, generalmente 24-48 horas tras el despacho.</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCuidados = () => (
        <div className="ayuda-content fade-in">
            <h2>Cuidado de tus Prendas</h2>
            <div className="ayuda-text-block">
                <p>Nuestros diseños están hechos para acompañarte por mucho tiempo. Sigue estos consejos:</p>
                <div className="cuidados-grid">
                    <div className="cuidado-card">
                        <strong>Lavado</strong>
                        <p>Lavar a mano o en ciclo delicado con agua fría. Evita el uso de cloro.</p>
                    </div>
                    <div className="cuidado-card">
                        <strong>Secado</strong>
                        <p>No usar secadora. Secar a la sombra para mantener la intensidad de los colores.</p>
                    </div>
                    <div className="cuidado-card">
                        <strong>Planchado</strong>
                        <p>Usar plancha a temperatura media/baja por el revés de la prenda.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'tallas': return renderTallas();
            case 'faq': return renderFAQ();
            case 'cambios': return renderCambios();
            case 'envios': return renderEnvios();
            case 'cuidados': return renderCuidados();
            default: return renderTallas();
        }
    };

    return (
        <div className="atencion-hub-view">
            <div className="ayuda-hero">
                <div className="container">
                    <span className="subtitle">Atención al Cliente</span>
                    <h1>¿Cómo podemos ayudarte hoy?</h1>
                </div>
            </div>

            <div className="container ayuda-layout">
                {/* Sidebar Navigation */}
                <aside className="ayuda-sidebar">
                    <nav>
                        {sections.map(sec => (
                            <button 
                                key={sec.id}
                                className={`ayuda-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(sec.id)}
                            >
                                <span className="icon">{sec.icon}</span>
                                <span className="title">{sec.title}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="ayuda-main">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default AtencionCliente;
