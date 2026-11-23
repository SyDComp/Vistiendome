import { Navigate, useLocation } from 'react-router-dom';
import { rutaPermitida, salidaHacia } from './soloCaja';
import useSoloCaja from './useSoloCaja';

/**
 * Con el modo solo caja activo, cualquier pantalla del panel lleva a pedir la
 * contraseña. Envuelve las rutas: la pantalla bloqueada ni se dibuja, así no
 * alcanza a pedir sus datos antes de irse.
 */
const GuardiaSoloCaja = ({ children }) => {
    const { pathname, search } = useLocation();
    const activo = useSoloCaja();
    if (!activo || rutaPermitida(pathname)) return children;
    return <Navigate to={salidaHacia(pathname + search)} replace />;
};

export default GuardiaSoloCaja;
