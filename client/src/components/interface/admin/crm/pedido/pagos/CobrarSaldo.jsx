import React, { useState } from 'react';
import useAjustesNegocio from '../../../../../../hooks/useAjustesNegocio';
import { formatCurrency } from '../../../../../../utils/cartUtils';
import RegistrarPago from './RegistrarPago';

/**
 * Un pedido listo con saldo pendiente: no sale hasta pagarse entero (decisión
 * del usuario 2026-10-13). En un retiro se cobra ahí mismo, cuando la clienta
 * viene a buscarlo; en un despacho, antes de mandarlo.
 */
const CobrarSaldo = ({ pedido, onCobrado }) => {
    const { ajustes } = useAjustesNegocio();
    const [cobrando, setCobrando] = useState(false);
    const saldo = pedido.pago?.saldo || 0;
    const retiro = pedido.modo_entrega === 'RETIRO';

    return (
        <div className="sp-salida">
            <p className="sp-aviso">
                Está listo, pero falta pagar {formatCurrency(saldo)}.{' '}
                {retiro ? 'Cóbralo al entregarlo.' : 'Se paga entero antes de despacharlo.'}
            </p>
            {!cobrando && (
                <button type="button" className="sp-boton sp-boton--principal" onClick={() => setCobrando(true)}>
                    Cobrar {formatCurrency(saldo)}
                </button>
            )}
            {cobrando && (
                <RegistrarPago pedidoId={pedido.id} medios={ajustes?.medios_pago || []} sugerido={saldo}
                    onRegistrado={() => { setCobrando(false); onCobrado(); }}
                    onCancelar={() => setCobrando(false)} />
            )}
        </div>
    );
};

export default CobrarSaldo;
