import React from 'react'

const ElementoColeccion = ({ tipo, nombre, descripcion, vistaDestino, onRedirigir, ...props }) => {

    // const handleClick = () => {
    //     if (vistaDestino !== null) {
    //         onRedirigir(vistaDestino);
    //     }
    // };

    // // Estilo cursor solo si es clickeable
    // const estiloLink = {
    //     cursor: vistaDestino ? 'pointer' : 'default',
    //     backgroundColor: props.fondoColor || 'transparent'
    // };

    const handleClick = () => {
        if (onRedirigir) {
            onRedirigir(vistaDestino);
        }
    };

    const estiloLink = {
        cursor: onRedirigir ? 'pointer' : 'default',
        backgroundColor: props.fondoColor || 'transparent'
    };

    return (
        <div
            className={`elementoColeccion ${tipo}`}
            onClick={handleClick}
            style={estiloLink}
        >
            {tipo !== 'post' && props.imagen ? (
                <>
                    <img src={props.imagen} alt={nombre} />
                    <div className="info-overlay">
                        <h3>{nombre}</h3>
                        {props.precio && <span className="precio">{props.precio}</span>}
                    </div>
                </>
            ) : (
                <div className="post-content">
                    <h3>{nombre}</h3>
                    <p>{descripcion}</p>
                </div>
            )}
        </div>
    );
};

export default ElementoColeccion