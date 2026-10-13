import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Store, X } from 'lucide-react';
import { useNotification } from '../../../../../context/NotificationContext';
import { disponibleParaVenta, registrarVenta } from '../../../../../lib/api/endpoints';
import useAjustesNegocio from '../../../../../hooks/useAjustesNegocio';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import { paraServidor, restante, sePuedeVender, totalVenta } from '../../../../../utils/ventaLocal';
import ClientaVenta from './ClientaVenta';
import PagosVenta from './PagosVenta';
import PrendasVenta from './PrendasVenta';
import '../pedido/pedido.css';
import '../pedido/confirmar/confirmar.css';
import './venta.css';

/**
 * Venta rápida en el local: quién compra, qué se lleva y cómo paga, en una
 * sola pantalla. "Registrar venta" crea el pedido, lo cobra, lo confirma por
 * bodega y lo entrega de una vez: queda entero o no queda nada (ver
 * core/pedidos/venta_rapida.py en el servidor).
 */
const VentaLocal = ({ onVendida, onCerrar }) => {
    const { toast } = useNotification();
    const { ajustes } = useAjustesNegocio();
    // Memorizada: mientras cargan los ajustes, `|| []` sería una lista nueva en
    // cada render, y el efecto de abajo se repetiría sin fin.
    const medios = useMemo(() => ajustes?.medios_pago || [], [ajustes]);
    const [disponibles, setDisponibles] = useState(null);
    const [sinDatos, setSinDatos] = useState(true);
    const [clienta, setClienta] = useState({});
    const [lineas, setLineas] = useState([]);
    // `auto`: el monto sigue al total mientras nadie lo haya escrito a mano.
    const [pagos, setPagos] = useState([{ medio: '', monto: '', auto: true }]);
    const [enviando, setEnviando] = useState(false);

    // Una vez al abrir. `toast` no va en las dependencias: el contexto lo
    // recrea en cada aviso, y un error volvería a pedir la lista en bucle.
    useEffect(() => {
        disponibleParaVenta()
            .then(d => setDisponibles(d || []))
            .catch(err => { toast.error(mensajeDeError(err?.message, 'No se pudo cargar lo disponible')); setDisponibles([]); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const total = totalVenta(lineas);
    useEffect(() => {
        setPagos(prev => prev.map((p, i) => ({
            ...p,
            medio: p.medio || medios[0] || '',
            monto: i === 0 && p.auto && prev.length === 1 ? (total ? String(total) : '') : p.monto,
        })));
    }, [total, medios]);

    const cambiarPagos = (nuevos) => setPagos(nuevos.map((p, i) => ({
        ...p, auto: p.auto && pagos[i]?.monto === p.monto,
    })));

    const vender = async () => {
        setEnviando(true);
        try {
            const pedido = await registrarVenta(paraServidor({ clienta: sinDatos ? null : clienta, lineas, pagos }));
            toast.success(`Venta registrada: pedido N° ${pedido.numero}`);
            onVendida(pedido);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo registrar la venta'));
        } finally {
            setEnviando(false);
        }
    };

    const falta = restante(lineas, pagos);
    return createPortal(
        <div className="cfp-capa" role="dialog" aria-modal="true" aria-labelledby="vl-titulo">
            <div className="cfp-tarjeta vl-tarjeta">
                <div className="cfp-cabecera">
                    <div>
                        <h3 id="vl-titulo" className="cfp-titulo"><Store size={18} /> Venta en el local</h3>
                        <p className="cfp-subtitulo">
                            Lo que hay en bodega, pagado en el momento. Se registra como un pedido entregado.
                        </p>
                    </div>
                    <button type="button" className="cfp-cerrar" onClick={onCerrar} aria-label="Cerrar" disabled={enviando}>
                        <X size={18} />
                    </button>
                </div>
                <div className="cfp-cuerpo">
                    <ClientaVenta sinDatos={sinDatos} clienta={clienta} onSinDatos={setSinDatos} onCambiar={setClienta}
                        disabled={enviando} />
                    {disponibles === null
                        ? <p className="sp-aviso" aria-busy="true">Cargando lo disponible…</p>
                        : <PrendasVenta disponibles={disponibles} lineas={lineas} onCambiar={setLineas} disabled={enviando} />}
                    {lineas.length > 0 && (
                        <PagosVenta pagos={pagos} medios={medios} falta={falta} onCambiar={cambiarPagos} disabled={enviando} />
                    )}
                </div>
                <div className="cfp-pie">
                    <button type="button" className="sp-boton" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                    <button type="button" className="sp-boton sp-boton--principal" onClick={vender}
                        disabled={enviando || !sePuedeVender(lineas, pagos) || (!sinDatos && !(clienta.rut || '').trim())}>
                        {enviando ? 'Registrando…' : `Registrar venta${total ? ` · ${formatCurrency(total)}` : ''}`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VentaLocal;
