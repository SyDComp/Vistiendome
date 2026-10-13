import React, { useState } from 'react';
import useAjustesNegocio from '../../../../../../hooks/useAjustesNegocio';
import { formatCurrency } from '../../../../../../utils/cartUtils';
import RegistrarPago from '../pagos/RegistrarPago';

/**
 * El abono mínimo al confirmar: cuánto se pide, cuánto se pagó y cuánto falta.
 * El pago se puede registrar acá mismo. Si falta, se puede confirmar igual con
 * una nota (la pide la ventana).
 */
const AbonoConfirmacion = ({ pedidoId, abono, onPagado, disabled }) => {
    const { ajustes } = useAjustesNegocio();
    const [registrando, setRegistrando] = useState(false);
    if (!abono) return null;

    const por = abono.por === 'taller' ? 'algo va al taller' : 'todo sale de bodega';
    return (
        <div className="cfp-nota">
            <span>Abono mínimo: {formatCurrency(abono.minimo)} ({abono.porcentaje}%, {por})</span>
            <span className={abono.falta > 0 ? 'cfp-ayuda cfp-ayuda--falta' : 'cfp-ayuda'}>
                Pagado: {formatCurrency(abono.pagado)}
                {abono.falta > 0 ? ` · Falta ${formatCurrency(abono.falta)}` : ' · Abono cubierto'}
            </span>
            {abono.falta > 0 && !registrando && (
                <div>
                    <button type="button" className="sp-boton" onClick={() => setRegistrando(true)} disabled={disabled}>
                        Registrar pago
                    </button>
                </div>
            )}
            {registrando && (
                <RegistrarPago pedidoId={pedidoId} medios={ajustes?.medios_pago || []} sugerido={abono.falta}
                    onRegistrado={() => { setRegistrando(false); onPagado(); }}
                    onCancelar={() => setRegistrando(false)} />
            )}
        </div>
    );
};

export default AbonoConfirmacion;
