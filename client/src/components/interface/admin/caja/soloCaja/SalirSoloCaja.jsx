import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import LogoVistiendome from '../../../../ui/LogoVistiendome';
import { destinoTrasLogin } from '../../../../../utils/volverTrasLogin';
import { RUTA_CAJA } from '../rutaCaja';
import { desactivar } from './soloCaja';
import useSoloCaja from './useSoloCaja';
import { verificarClave } from './verificarClave';
import './soloCaja.css';

/**
 * Para dejar la caja y volver al panel: la contraseña de quien la abrió.
 * Sin ella, se vuelve a la caja.
 */
const SalirSoloCaja = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [clave, setClave] = useState('');
    const [error, setError] = useState(null);
    const [revisando, setRevisando] = useState(false);
    const activo = useSoloCaja();

    // Si el modo ya no está puesto, no hay nada que desbloquear.
    if (!activo && !revisando) return <Navigate to={destinoTrasLogin(search)} replace />;

    const salir = async (e) => {
        e.preventDefault();
        if (!clave) return;
        setRevisando(true);
        setError(null);
        try {
            await verificarClave(clave);
            desactivar();
            navigate(destinoTrasLogin(search), { replace: true });
        } catch (err) {
            setError(err?.status === 401 ? 'La contraseña no es correcta.' : 'No se pudo comprobar. Revisa la conexión.');
            setClave('');
        } finally {
            setRevisando(false);
        }
    };

    return (
        <main className="sc-pantalla">
            <form className="sc-tarjeta" onSubmit={salir}>
                <LogoVistiendome tamano="1.4rem" />
                <h1 className="sc-titulo"><Lock size={18} aria-hidden="true" /> Este equipo está en modo solo caja</h1>
                <p className="sc-texto">Para volver al panel, escribe la contraseña de administración.</p>
                <label className="sc-campo">Contraseña
                    <input type="password" className="sp-select" value={clave} autoFocus autoComplete="current-password"
                        onChange={e => setClave(e.target.value)} disabled={revisando} aria-invalid={Boolean(error)} />
                </label>
                {error && <p className="sc-error" role="alert">{error}</p>}
                <div className="sc-acciones">
                    <button type="button" className="sp-boton" onClick={() => navigate(RUTA_CAJA, { replace: true })} disabled={revisando}>
                        Volver a la caja
                    </button>
                    <button type="submit" className="sp-boton sp-boton--principal" disabled={revisando || !clave}>
                        {revisando ? 'Comprobando…' : 'Salir del modo caja'}
                    </button>
                </div>
            </form>
        </main>
    );
};

export default SalirSoloCaja;
