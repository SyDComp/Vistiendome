import React from 'react'
import ElementosColeccion from './ElementosColeccion'

const Coleccion = ({ elementosColeccion, titulo, descripcion, limite, onElementoClick }) => {
    return (
        <div className='coleccion'>
            <h2>{titulo}</h2>
            <p>{descripcion}</p>
            <ElementosColeccion
                elementos={elementosColeccion}
                limite={limite}
                onElementoClick={onElementoClick} // Pasamos el puente
            />
        </div>
    )
}

export default Coleccion