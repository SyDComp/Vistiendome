import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Coleccion from '../colecciones/Coleccion'
import Carrusel from '../carrusel/Carrusel'
import { elementosColeccion, elementosCarrusel } from '../../../constants/pruebas'
import { getProducts, getImageUrl } from '../../../services/api'

const Inicio = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [novedades, setNovedades] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarNovedades = async () => {
            try {
                const data = await getProducts();
                // Tomamos los últimos 4 productos ingestados
                const itemsLlamativos = data.slice(0, 4).map(p => ({
                    id: p.id,
                    tipo: 'vertical',
                    nombre: p.name,
                    precio: `$${p.price.toLocaleString('es-CL')}`,
                    imagen: p.image ? getImageUrl(p.image) : null,
                    sku: p.sku,
                    raw: p
                }));
                setNovedades(itemsLlamativos);
            } catch (error) {
                console.error("Error cargando novedades:", error);
            } finally {
                setLoading(false);
            }
        };
        cargarNovedades();
    }, []);
    
    const handleAction = (destino, slug, sku) => {
        if (destino === 'detalle' && slug) {
            const url = sku ? `/producto/${slug}/${sku}` : `/producto/${slug}`;
            navigate(url, { state: { backgroundLocation: location } });
        }
    };

    return (
        <div className="inicio-view fade-in">
            <Carrusel 
                elementos={elementosCarrusel}
                intervalo={5000}
                autoplay={true}
                onElementoClick={(dest, id, sku) => handleAction(dest, id, sku)}
            />
            
            <div className="container">
                {!loading && novedades.length > 0 && (
                    <Coleccion
                        titulo="Últimas Novedades"
                        descripcion="Recién llegados a nuestra tienda."
                        elementosColeccion={novedades}
                        onElementoClick={(dest, id) => {
                            const prod = novedades.find(n => n.id === id);
                            handleAction('detalle', id, prod?.sku);
                        }}
                    />
                )}

                {/* <Coleccion
                    titulo="Colecciones Destacadas"
                    descripcion="Diseños exclusivos con tallaje inclusivo (12 a 7XL)."
                    elementosColeccion={elementosColeccion}
                    onElementoClick={(dest, id) => handleAction(dest, id)}
                /> */}
            </div>
        </div>
    )
}

export default Inicio