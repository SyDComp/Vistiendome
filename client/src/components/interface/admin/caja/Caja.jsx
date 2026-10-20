import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LogoVistiendome from '../../../ui/LogoVistiendome';
import { useNotification } from '../../../../context/NotificationContext';
import { buscarPorCodigo, disponibleParaVenta, registrarVenta } from '../../../../lib/api/endpoints';
import useAjustesNegocio from '../../../../hooks/useAjustesNegocio';
import usePagosVenta from '../../../../hooks/usePagosVenta';
import { agregarALaVenta, buscarDisponible } from '../../../../utils/caja';
import { mensajeDeError } from '../../../../utils/errorServidor';
import { paraServidor, pesos, restante, sePuedeVender, totalVenta } from '../../../../utils/ventaLocal';
import { loginQueVuelve } from '../../../../utils/volverTrasLogin';
import CobroCaja from './CobroCaja';
import LectorCaja from './LectorCaja';
import LineasCaja from './LineasCaja';
import VentaHecha from './VentaHecha';
import useImprimirComprobante from './comprobante/useImprimirComprobante';
import '../crm/pedido/pedido.css';
import '../crm/venta/venta.css';
import './caja.css';

const RUTA = '/admin/caja';
const EFECTIVO = 'Efectivo';

/** Si el foco está en un campo donde se escribe: ahí la tecla es de ese campo, no de la pistola. */
const escribiendo = (el) => el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);

/**
 * La caja del local, a pantalla completa (se abre desde un acceso directo en
 * el escritorio del PC de la tienda). Se escanea la etiqueta, se cobra y sale
 * el comprobante. Es la misma venta en el local de Cotizaciones (crea el
 * pedido, lo cobra, lo confirma por bodega y lo entrega de una vez: ver
 * core/pedidos/venta_rapida.py), con la pistola y la impresora térmica.
 *
 * Teclas: F2 vuelve a la pistola, F9 cobra, Esc vacía la venta (o empieza la
 * siguiente, si ya se cobró).
 */
const Caja = () => {
    const navigate = useNavigate();
    const { toast, confirm } = useNotification();
    const { ajustes } = useAjustesNegocio();
    const imprimir = useImprimirComprobante();
    const medios = useMemo(() => ajustes?.medios_pago || [], [ajustes]);
    const lector = useRef(null);

    const [disponibles, setDisponibles] = useState([]);
    const [lineas, setLineas] = useState([]);
    const [sinDatos, setSinDatos] = useState(true);
    const [clienta, setClienta] = useState({});
    const [recibido, setRecibido] = useState('');
    const [aviso, setAviso] = useState(null);       // {tipo: 'ok'|'error', texto}
    const [enviando, setEnviando] = useState(false);
    const [hecha, setHecha] = useState(null);       // {pedido, vuelto}
    const [imprimiendo, setImprimiendo] = useState(false);

    const total = totalVenta(lineas);
    const { pagos, cambiarPagos, reiniciar } = usePagosVenta(total, medios);
    const puedeCobrar = sePuedeVender(lineas, pagos) && (sinDatos || Boolean((clienta.rut || '').trim()));

    const aLaPistola = useCallback(() => lector.current?.focus(), []);

    // Sin sesión, a iniciarla, y de vuelta aquí.
    useEffect(() => {
        if (!localStorage.getItem('admin_token')) navigate(loginQueVuelve(RUTA), { replace: true });
    }, [navigate]);

    // Lo libre para buscar escribiendo. La pistola no depende de esto: cada
    // código se consulta al servidor en el momento.
    const cargarDisponibles = useCallback(() => {
        disponibleParaVenta().then(d => setDisponibles(d || [])).catch(() => setDisponibles([]));
    }, []);
    useEffect(() => { cargarDisponibles(); }, [cargarDisponibles]);

    // Dos lecturas seguidas pueden responder antes de que se pinte la primera:
    // la segunda tiene que sumar sobre lo que dejó la primera, no sobre lo pintado.
    const lineasAlDia = useRef(lineas);
    lineasAlDia.current = lineas;
    const agregar = useCallback((d) => {
        const { lineas: nuevas, aviso: problema } = agregarALaVenta(lineasAlDia.current, d);
        lineasAlDia.current = nuevas;
        setLineas(nuevas);
        setAviso(problema ? { tipo: 'error', texto: problema } : { tipo: 'ok', texto: `${d.nombre}: agregado` });
        aLaPistola();
    }, [aLaPistola]);

    const porCodigo = useCallback(async (codigo) => {
        try {
            agregar(await buscarPorCodigo(codigo));
        } catch (err) {
            // No es un código: quizás es un nombre. Si calza con una sola cosa, es esa.
            const calzan = err?.status === 404 ? buscarDisponible(disponibles, codigo, 2) : [];
            if (calzan.length === 1) return agregar(calzan[0]);
            setAviso({ tipo: 'error', texto: mensajeDeError(err?.message, `No se encontró ${codigo}`) });
        }
    }, [agregar, disponibles]);

    const nuevaVenta = useCallback(() => {
        setLineas([]);
        setSinDatos(true);
        setClienta({});
        setRecibido('');
        setAviso(null);
        setHecha(null);
        reiniciar();
        setTimeout(aLaPistola, 0);
    }, [reiniciar, aLaPistola]);

    const imprimirComprobante = useCallback(async (pedido, opciones) => {
        setImprimiendo(true);
        try {
            if (!await imprimir(pedido, opciones)) toast.error('El navegador no dejó abrir el comprobante: reimprímelo.');
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo imprimir el comprobante: reimprímelo.'));
        } finally {
            setImprimiendo(false);
        }
    }, [imprimir, toast]);

    const cobrar = useCallback(async () => {
        if (!puedeCobrar || enviando) return;
        setEnviando(true);
        try {
            const pedido = await registrarVenta(paraServidor({ clienta: sinDatos ? null : clienta, lineas, pagos }));
            const efectivo = pagos.filter(p => p.medio === EFECTIVO).reduce((t, p) => t + pesos(p.monto), 0);
            const conCuanto = pesos(recibido);
            setHecha({ pedido, vuelto: conCuanto > efectivo ? conCuanto - efectivo : 0 });
            cargarDisponibles();
            await imprimirComprobante(pedido, { recibido: conCuanto });
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo registrar la venta'));
        } finally {
            setEnviando(false);
        }
    }, [puedeCobrar, enviando, sinDatos, clienta, lineas, pagos, recibido, cargarDisponibles, imprimirComprobante, toast]);

    // Una sola pregunta a la vez, aunque se aprete Esc de nuevo.
    const preguntando = useRef(false);
    const vaciar = useCallback(async () => {
        if (!lineas.length) return aLaPistola();
        if (preguntando.current) return;
        preguntando.current = true;
        try {
            if (await confirm('¿Vaciar la venta? Se quitan todas las prendas.', { si: 'Vaciar', no: 'Seguir con la venta' })) {
                nuevaVenta();
            }
        } finally {
            preguntando.current = false;
        }
    }, [lineas.length, confirm, nuevaVenta, aLaPistola]);

    // Las teclas de la caja, y la pistola llegue donde llegue el foco: si
    // nadie está escribiendo en un campo, lo que se teclea va al lector.
    useEffect(() => {
        const teclas = (e) => {
            if (e.key === 'F2') { e.preventDefault(); return aLaPistola(); }
            if (e.key === 'F9') { e.preventDefault(); return hecha ? null : cobrar(); }
            if (e.key === 'Escape') { e.preventDefault(); return hecha ? nuevaVenta() : vaciar(); }
            if (!hecha && !escribiendo(document.activeElement) && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                aLaPistola();
            }
        };
        window.addEventListener('keydown', teclas);
        return () => window.removeEventListener('keydown', teclas);
    }, [aLaPistola, cobrar, vaciar, nuevaVenta, hecha]);

    return (
        <div className="cj-pantalla">
            <header className="cj-cabecera">
                <div className="cj-marca">
                    <LogoVistiendome tamano="1.3rem" />
                    <span>Caja</span>
                </div>
                <span className="cj-ayuda"><kbd>F2</kbd> pistola · <kbd>F9</kbd> cobrar · <kbd>Esc</kbd> vaciar</span>
                <button type="button" className="sp-boton" onClick={() => navigate('/admin/dashboard/crm/cotizaciones')}>
                    <ArrowLeft size={16} /> Panel
                </button>
            </header>

            {hecha ? (
                <VentaHecha pedido={hecha.pedido} vuelto={hecha.vuelto} imprimiendo={imprimiendo} onNueva={nuevaVenta}
                    onReimprimir={() => imprimirComprobante(hecha.pedido, { recibido: pesos(recibido) })} />
            ) : (
                <main className="cj-cuerpo">
                    <section className="cj-venta" aria-label="Venta">
                        <LectorCaja ref={lector} disponibles={disponibles} onCodigo={porCodigo} onElegido={agregar}
                            disabled={enviando} />
                        {aviso && (
                            <p className={`cj-aviso cj-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
                                {aviso.texto}
                            </p>
                        )}
                        <LineasCaja lineas={lineas} onCambiar={setLineas} onListo={aLaPistola} disabled={enviando} />
                    </section>
                    <CobroCaja total={total} sinDatos={sinDatos} clienta={clienta} onSinDatos={setSinDatos} onClienta={setClienta}
                        pagos={pagos} medios={medios} falta={restante(lineas, pagos)} onPagos={cambiarPagos}
                        recibido={recibido} onRecibido={setRecibido} puedeCobrar={puedeCobrar} onCobrar={cobrar}
                        enviando={enviando} />
                </main>
            )}
        </div>
    );
};

export default Caja;
