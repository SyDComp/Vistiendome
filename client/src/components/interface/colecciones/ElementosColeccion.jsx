import { useLocation, useNavigate } from 'react-router-dom';
import ElementoColeccion from './ElementoColeccion'

const ElementosColeccion = ({ elementos, limite, onElementoClick }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const elementosAMostrar = limite ? elementos.slice(0, limite) : elementos;
    
    const isModalOpen = location.pathname.includes('/producto/');

    return (
        <div className='elementosColeccion'>
            {elementosAMostrar.map((elemento) => (
                <div 
                    key={elemento.id || elemento.sku} 
                    style={{ textDecoration: 'none', color: 'inherit' }}
                >
                    <ElementoColeccion
                        {...elemento}
                        onRedirigir={null}
                        isPaused={isModalOpen}
                        onClick={(indexActual) => {
                            let targetSku = elemento.sku;
                            if (elemento.extras?.preview_carousel) {
                                const currentImgObj = elemento.extras.preview_carousel[indexActual];
                                if (currentImgObj && currentImgObj.sku) {
                                    targetSku = currentImgObj.sku;
                                }
                            }
                            const targetUrl = targetSku ? `/catalogo/producto/${elemento.slug || elemento.id}/${targetSku}` : `/catalogo/producto/${elemento.slug || elemento.id}`;
                            navigate(targetUrl, { state: { backgroundLocation: location } });
                        }}
                    />
                </div>
            ))}
        </div>
    )
}

export default ElementosColeccion