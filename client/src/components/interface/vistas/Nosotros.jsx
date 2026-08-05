import React from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { getImageUrl } from '../../../lib/api/endpoints';

// Imagen por defecto si el admin aún no configuró una desde la galería
const TALLER_IMG_FALLBACK = 'https://vistiendomechile.cl/data/files/whatsappimage2025-12-31at9.11.46am.jpg';

const Nosotros = () => {
    const { settings } = useSettings();
    const tallerImg = getImageUrl(settings?.nosotros?.image_url || TALLER_IMG_FALLBACK);

    const pilares = [
        {
            titulo: "Elegancia Natural",
            descripcion: "Diseñamos para realzar la belleza propia sin estridencias, manteniendo un equilibrio perfecto entre lo contemporáneo y lo clásico.",
            icono: "✨"
        },
        {
            titulo: "Modestia Consciente",
            descripcion: "Nuestras prendas respetan los valores de fe y recato, demostrando que la modestia es el grado más alto de la sofisticación.",
            icono: "🕊️"
        },
        {
            titulo: "Calidad de Oficio",
            descripcion: "Utilizamos textiles seleccionados como Sofía, Punto Roma y Lanilla, garantizando durabilidad y confort en cada costura.",
            icono: "🧵"
        }
    ];

    return (
        <div className="nosotros-view">
            {/* Hero Section */}
            <section className="nosotros-hero">
                <div className="container">
                    <span className="subtitle">Nuestra Historia</span>
                    <h1>Diseñando identidad con modestia</h1>
                    <p className="hero-text">
                        En el corazón de San Carlos, en el sector de San Camilo, nace Vistiendomé. 
                        Más que una marca de ropa, somos un taller de confección propio dedicado 
                        a vestir a la mujer cristiana con honor y elegancia.
                    </p>
                </div>
            </section>

            {/* Misión y Taller */}
            <section className="nosotros-historia">
                <div className="container grid-2">
                    <div className="historia-img">
                        <img src={tallerImg} alt="Taller de confección" />
                        <div className="img-badge">Taller Propio - San Carlos</div>
                    </div>
                    <div className="historia-content">
                        <h2>El arte de la confección propia</h2>
                        <p>
                            Nuestra misión es sencilla pero profunda: <strong>Vestir a la mujer con diseños que respeten su fe 
                            y realcen su elegancia natural.</strong> A diferencia de la moda fragmentada actual, en Vistiendomé 
                            controlamos cada etapa del proceso.
                        </p>
                        <p>
                            Desde nuestro taller local, seleccionamos telas que acarician la piel y resisten el tiempo. 
                            Especialistas en trabajos para grupos como <strong>Coristas y Dorcas</strong>, entendemos 
                            la importancia de la uniformidad sin perder la exclusividad de un diseño único.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pilares */}
            <section className="nosotros-pilares">
                <div className="container">
                    <div className="pillares-grid">
                        {pilares.map((pilar, index) => (
                            <div key={index} className="pilar-card">
                                <span className="pilar-icon">{pilar.icono}</span>
                                <h3>{pilar.titulo}</h3>
                                <p>{pilar.descripcion}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Inclusividad Extrema */}
            <section className="nosotros-inclusividad">
                <div className="container">
                    <div className="inclusividad-wrapper">
                        <div className="inclusividad-text">
                            <h2>Inclusividad sin excepciones</h2>
                            <p>
                                Creemos que todas las mujeres merecen vestir con dignidad y estilo. 
                                Por ello, nos especializamos en un tallaje inclusivo real, 
                                que abarca desde la <strong>talla 12 hasta la 7XL</strong>.
                            </p>
                            <p>
                                No solo ajustamos medidas; diseñamos patrones específicos 
                                para que cada talla se sienta cómoda, segura y hermosa.
                            </p>
                        </div>
                        <div className="tallas-badge">
                            <span>Desde 12</span>
                            <span className="separator">a</span>
                            <span>7XL</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cierre */}
            <section className="nosotros-cierre">
                <div className="container">
                    <h3>Vistiendomé Chile</h3>
                    <p>Sencillez, Elegancia y Modestia en cada prenda.</p>
                </div>
            </section>
        </div>
    );
};

export default Nosotros;
