import { Link } from 'react-router-dom';
import './NoEncontrada.css';

/**
 * La pagina para cuando la direccion no existe.
 *
 * Sin esto el router no encontraba nada que dibujar y dejaba la pantalla en
 * blanco: ni un mensaje, ni el menu, ni forma de volver. Pasa mas seguido de
 * lo que parece —un enlace viejo, una direccion escrita a mano, /admin en vez
 * de /admin/login— y una pantalla en blanco parece el sitio caido.
 *
 * Va dentro del layout, asi que conserva el menu y el pie: quien llega aca
 * puede seguir navegando en vez de tener que volver atras.
 */
const NoEncontrada = () => (
    <div className="no-encontrada">
        <p className="no-encontrada__codigo">404</p>
        <h1 className="no-encontrada__titulo">Esta página no existe</h1>
        <p className="no-encontrada__texto">
            Puede que el enlace esté viejo o que la dirección tenga un error de tipeo.
        </p>
        <div className="no-encontrada__acciones">
            <Link className="no-encontrada__boton" to="/">Ir a la portada</Link>
            <Link className="no-encontrada__boton no-encontrada__boton--suave" to="/catalogo">
                Ver el catálogo
            </Link>
        </div>
    </div>
);

export default NoEncontrada;
