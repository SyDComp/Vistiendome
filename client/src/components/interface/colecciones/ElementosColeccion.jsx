import { Link, useLocation } from 'react-router-dom';
import ElementoColeccion from './ElementoColeccion'

const ElementosColeccion = ({ elementos, limite, onElementoClick }) => {
    const location = useLocation();
    const elementosAMostrar = limite ? elementos.slice(0, limite) : elementos;

    return (
        <div className='elementosColeccion'>
            {elementosAMostrar.map((elemento) => (
                <Link 
                    key={elemento.id} 
                    to={`/producto/${elemento.slug || elemento.id}`} 
                    state={{ backgroundLocation: location }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                >
                    <ElementoColeccion
                        {...elemento}
                        onRedirigir={null}
                    />
                </Link>
            ))}
        </div>
    )
}

export default ElementosColeccion