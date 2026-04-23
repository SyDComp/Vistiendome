const ElementoCarrusel = ({ titulo, subtitulo, imagen, vistaDestino, productoId, onRedirigir }) => {
    const handleClick = () => {
        if (vistaDestino && onRedirigir) {
            onRedirigir(vistaDestino, productoId);
        }
    };

    return (
        <div className="elementoCarrusel" onClick={handleClick}>
            {/* Capa 1: Fondo Difuminado para ambiente */}
            <div className="carrusel-bg-blur">
                <img src={imagen} alt="" aria-hidden="true" />
            </div>

            {/* Capa 2: Imagen Principal Centrada (Sin recortes) */}
            <div className="carrusel-main-img">
                <img src={imagen} alt={titulo} loading="lazy" />
            </div>

            {/* Capa 3: Información Glassbox */}
            <div className="carrusel-info">
                <div className="info-glassbox">
                    <h2>{titulo}</h2>
                    <p>{subtitulo}</p>
                    {vistaDestino && <span className="carrusel-cta">Ver Más</span>}
                </div>
            </div>
        </div>
    );
};

export default ElementoCarrusel;
