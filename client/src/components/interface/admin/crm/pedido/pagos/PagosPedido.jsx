import React, { useEffect, useState } from 'react';
import { useNotification } from '../../../../../../context/NotificationContext';
import { anularPago } from '../../../../../../lib/api/endpoints';
import useAjustesNegocio from '../../../../../../hooks/useAjustesNegocio';
import usePagosPedido from '../../../../../../hooks/usePagosPedido';
import { formatCurrency } from '../../../../../../utils/cartUtils';
import { ESTADOS_PAGO, textoSaldo } from '../../../../../../utils/pagos';
import { mensajeDeError } from '../../../../../../utils/errorServidor';
import PagoFila from './PagoFila';
import RegistrarPago from './RegistrarPago';

/**
 * Los pagos de un pedido: total, pagado y cuánto falta, la lista de pagos, y
 * registrar o anular uno. Un pago no se borra: se anula con motivo.
 *
 * `onCambio`: después de registrar o anular, para que la historia y la lista
 * de pedidos se enteren.
 */
const PagosPedido = ({ pedido, abierto = true, onCambio }) => {
    const { toast, prompt } = useNotification();
    const { datos, cargando, error, recargar, reemplazar } = usePagosPedido(pedido.id, abierto);
    const { ajustes } = useAjustesNegocio();
    const [registrando, setRegistrando] = useState(false);

    // El total cambia al cotizar o cancelar una prenda en otra sección: las
    // cuentas se vuelven a pedir para no mostrar un saldo viejo.
    const { total, por_cotizar: porCotizar } = pedido.pago || {};
    useEffect(() => { if (abierto) recargar(); }, [total, porCotizar, abierto, recargar]);

    if (cargando && !datos) return <p className="sp-aviso" aria-busy="true">Cargando los pagos…</p>;
    if (error && !datos) {
        return (
            <div className="sp-aviso sp-aviso--error" role="alert">
                <span>{error}</span>
                <button type="button" className="sp-boton" onClick={recargar}>Reintentar</button>
            </div>
        );
    }
    if (!datos) return null;

    const { cuentas, pagos } = datos;
    const estado = ESTADOS_PAGO[cuentas.estado] || { texto: cuentas.estado, tono: 'espera' };
    const saldo = textoSaldo(cuentas);
    const sePaga = pedido.estado !== 'CANCELADA';

    const alCambiar = (r) => { reemplazar(r); setRegistrando(false); onCambio?.(); };

    const anular = async (pago) => {
        const motivo = await prompt(`¿Por qué se anula el pago de ${formatCurrency(pago.monto)} (${pago.medio})? Queda en la historia.`);
        if (motivo === null || motivo === undefined) return;
        try {
            alCambiar(await anularPago(pedido.id, pago.id, motivo));
            toast.success('Pago anulado');
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo anular el pago'));
        }
    };

    return (
        <div className="sp-pagos">
            <div className="sp-pagos-resumen">
                <span>Total <strong>{formatCurrency(cuentas.total)}</strong>{cuentas.por_cotizar ? ' + por cotizar' : ''}</span>
                <span>Pagado <strong>{formatCurrency(cuentas.pagado)}</strong></span>
                <span className={`sp-pago-estado sp-pago-estado--${estado.tono}`}>{estado.texto}</span>
            </div>
            {saldo && <p className="sp-pagos-saldo">{saldo}</p>}

            {pagos.length > 0 && (
                <ul className="sp-prendas">
                    {pagos.map(p => <PagoFila key={p.id} pago={p} onAnular={anular} />)}
                </ul>
            )}

            {sePaga && !registrando && (
                <div className="sp-acciones">
                    <button type="button" className="sp-boton sp-boton--principal" onClick={() => setRegistrando(true)}>
                        Registrar pago
                    </button>
                </div>
            )}
            {registrando && (
                <RegistrarPago pedidoId={pedido.id} medios={ajustes?.medios_pago || []}
                    sugerido={cuentas.por_cotizar ? 0 : cuentas.saldo}
                    onRegistrado={alCambiar} onCancelar={() => setRegistrando(false)} />
            )}
        </div>
    );
};

export default PagosPedido;
