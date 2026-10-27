import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useCaracteristicas from '../../../../hooks/useCaracteristicas';
import useOrdenCaracteristicas from '../../../../hooks/useOrdenCaracteristicas';
import { pesos } from '../../../../utils/ventaLocal';
import { loginQueVuelve } from '../../../../utils/volverTrasLogin';
import CabeceraCaja from './CabeceraCaja';
import CierreCaja from './cierre/CierreCaja';
import useBuscadorCaja from './datos/useBuscadorCaja';
import CobroCaja from './cobro/CobroCaja';
import VentaHecha from './cobro/VentaHecha';
import LectorCaja from './prendas/LectorCaja';
import LineasCaja from './prendas/LineasCaja';
import { PANEL_POR_OMISION, RUTA_CAJA } from './rutaCaja';
import SelectorPrendas from './selector/SelectorPrendas';
import useAtajosCaja from './teclado/useAtajosCaja';
import useModoCaja from './teclado/useModoCaja';
import usePistola from './teclado/usePistola';
import useVentaCaja from './useVentaCaja';
import '../crm/pedido/pedido.css';
import './cobro/cobro.css';
import './caja.css';

const SIN_CARACTERISTICAS = [];
const sinMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * La caja del local, a pantalla completa (se abre desde un acceso directo en
 * el escritorio del PC de la tienda). Es la venta en el local (crea el
 * pedido, lo cobra, lo confirma por bodega y lo entrega de una vez: ver
 * core/pedidos/venta_rapida.py); Cotizaciones trae un botón que lleva aquí.
 *
 * Se maneja entera con el teclado: la pistola suma directo, sin pasar por
 * ningún campo; Esc cambia entre atajos y escribir (teclado/). La venta en sí
 * vive en useVentaCaja.js.
 */
const Caja = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const v = useVentaCaja();
    const definiciones = useCaracteristicas() || SIN_CARACTERISTICAS;
    const orden = useOrdenCaracteristicas();
    const lector = useRef(null);

    const [texto, setTexto] = useState('');
    const [selector, setSelector] = useState(false);
    const [cierreAbierto, setCierreAbierto] = useState(false);
    const [marcada, setMarcada] = useState(-1);
    const [saliendo, setSaliendo] = useState(false);

    const { interpretacion, filtros, encontrado } = useBuscadorCaja(texto, definiciones, v.version);

    // Sin sesión, a iniciarla, y de vuelta aquí.
    useEffect(() => {
        if (!localStorage.getItem('admin_token')) navigate(loginQueVuelve(RUTA_CAJA), { replace: true });
    }, [navigate]);

    // La pistola suma esté donde esté el foco. Si la venta anterior ya se
    // cobró, la lectura empieza la siguiente.
    const { hecha, nuevaVenta, porCodigo } = v;
    usePistola(useCallback((codigo) => {
        if (hecha) nuevaVenta();
        porCodigo(codigo);
    }, [hecha, nuevaVenta, porCodigo]));

    const { modo, nombreCampo, alternar } = useModoCaja(lector);

    const enfocar = (selector_) => setTimeout(() => document.querySelector(selector_)?.focus(), 0);
    const linea = v.lineas[marcada];
    const cambiarCantidad = (paso) => {
        if (!linea) return;
        const cantidad = Number(linea.cantidad) + paso;
        if (cantidad < 1 || cantidad > linea.disponible || (linea.pieza_id && paso > 0)) return;
        v.cambiarLineas(v.lineas.map(l => (l === linea ? { ...l, cantidad } : l)));
    };

    useAtajosCaja({
        modo,
        alternar,
        activo: !v.hecha && !selector && !cierreAbierto,
        acciones: {
            buscar: () => lector.current?.focus(),
            elegir: () => setSelector(true),
            cierre: () => setCierreAbierto(true),
            quienCompra: () => {
                v.setSinDatos(!v.sinDatos);
                if (v.sinDatos) enfocar('[data-clienta="rut"]');
            },
            cobrar: v.cobrar,
            vaciar: v.vaciar,
            subir: () => setMarcada(m => Math.max(m - 1, 0)),
            bajar: () => setMarcada(m => Math.min(m + 1, v.lineas.length - 1)),
            sumar: () => cambiarCantidad(1),
            restar: () => cambiarCantidad(-1),
            quitar: () => {
                if (!linea) return;
                v.cambiarLineas(v.lineas.filter(l => l !== linea));
                setMarcada(m => Math.min(m, v.lineas.length - 2));
            },
            editarPrecio: () => linea && enfocar(`[data-precio="${linea.clave}"]`),
        },
    });

    // Cobrada la venta: Enter o Esc empiezan la siguiente. Enter se escucha
    // aquí y no solo en el botón: al imprimir, el foco se va al marco de
    // impresión y el botón lo pierde. Sobre otro botón (Reimprimir), Enter es de ese botón.
    useEffect(() => {
        if (!v.hecha) return undefined;
        const teclas = (e) => {
            const enOtroBoton = e.key === 'Enter' && document.activeElement instanceof HTMLButtonElement;
            if ((e.key === 'Escape' || e.key === 'Enter') && !enOtroBoton) { e.preventDefault(); nuevaVenta(); }
        };
        window.addEventListener('keydown', teclas);
        return () => window.removeEventListener('keydown', teclas);
    }, [v.hecha, nuevaVenta]);

    // Volver: la caja baja y deja ver el panel de donde se vino.
    const volverA = location.state?.volverA || PANEL_POR_OMISION;
    const volver = () => (sinMovimiento() ? navigate(volverA) : setSaliendo(true));
    const clase = `cj-pantalla${location.state?.desdePanel && !saliendo ? ' cj-pantalla--entra' : ''}${saliendo ? ' cj-pantalla--sale' : ''}`;

    return (
        <div className={clase} onAnimationEnd={() => saliendo && navigate(volverA)}>
            <CabeceraCaja modo={modo} nombreCampo={nombreCampo} onVolver={volver} />

            {v.hecha ? (
                <VentaHecha pedido={v.hecha.pedido} vuelto={v.hecha.vuelto} imprimiendo={v.imprimiendo} onNueva={nuevaVenta}
                    onReimprimir={() => v.imprimirComprobante(v.hecha.pedido, { recibido: pesos(v.hecha.recibido) })} />
            ) : (
                <main className="cj-cuerpo">
                    <section className="cj-venta" aria-label="Venta">
                        <LectorCaja ref={lector} texto={texto} onTexto={setTexto} interpretacion={interpretacion}
                            encontrado={encontrado} onElegido={v.agregar} onAbrirSelector={() => setSelector(true)}
                            onCodigo={v.porCodigo} disabled={v.enviando} />
                        {v.aviso && (
                            <p className={`cj-aviso cj-aviso--${v.aviso.tipo}`} role={v.aviso.tipo === 'error' ? 'alert' : 'status'}>
                                {v.aviso.texto}
                            </p>
                        )}
                        <LineasCaja lineas={v.lineas} marcada={modo === 'atajos' ? marcada : -1} onCambiar={v.cambiarLineas}
                            onListo={() => document.activeElement?.blur()} disabled={v.enviando} />
                    </section>
                    <CobroCaja total={v.total} sinDatos={v.sinDatos} clienta={v.clienta} onSinDatos={v.setSinDatos}
                        onClienta={v.setClienta} pagos={v.pagos} medios={v.medios} falta={v.falta} onPagos={v.cambiarPagos}
                        recibido={v.recibido} onRecibido={v.setRecibido} puedeCobrar={v.puedeCobrar} onCobrar={v.cobrar}
                        enviando={v.enviando} />
                </main>
            )}

            {cierreAbierto && <CierreCaja onCerrar={() => setCierreAbierto(false)} />}

            {selector && (
                <SelectorPrendas filtrosIniciales={filtros} definiciones={definiciones} orden={orden} version={v.version}
                    onElegido={(d) => { v.agregar(d); setTexto(''); }}
                    onCerrar={() => setSelector(false)} />
            )}
        </div>
    );
};

export default Caja;
