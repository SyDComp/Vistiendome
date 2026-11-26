import { useCallback, useMemo, useRef, useState } from 'react';
import { useNotification } from '../../../../context/NotificationContext';
import { buscarPorCodigo, registrarVenta } from '../../../../lib/api/endpoints';
import useAjustesNegocio from '../../../../hooks/useAjustesNegocio';
import usePagosVenta from '../../../../hooks/usePagosVenta';
import { agregarALaVenta } from '../../../../utils/caja';
import { mensajeDeError } from '../../../../utils/errorServidor';
import { motivoRutOpcional } from '../../../../utils/rut';
import { paraServidor, pesos, restante, sePuedeVender, totalVenta } from '../../../../utils/ventaLocal';
import useImprimirComprobante from './comprobante/useImprimirComprobante';


/**
 * La venta que se arma en la caja: las prendas, quién compra, los pagos,
 * cobrar e imprimir. Sin teclado ni pantalla: eso es de Caja.jsx. Lo libre lo
 * pregunta al servidor quien lo muestra (datos/); `version` cambia cuando lo
 * libre cambia (tras una venta), para que lo vuelvan a preguntar.
 */
export default function useVentaCaja() {
    const { toast, confirm } = useNotification();
    const { ajustes } = useAjustesNegocio();
    const imprimir = useImprimirComprobante();
    const medios = useMemo(() => ajustes?.medios_pago || [], [ajustes]);
    // El medio que da vuelto: se reconoce por su clave en el servidor, no por su nombre.
    const efectivo = ajustes?.medio_efectivo || null;

    const [version, setVersion] = useState(0);
    const [lineas, setLineas] = useState([]);
    const [sinDatos, setSinDatos] = useState(true);
    const [clienta, setClienta] = useState({});
    const [recibido, setRecibido] = useState('');
    const [aviso, setAviso] = useState(null);       // {tipo: 'ok'|'error', texto}
    const [agregado, setAgregado] = useState(null); // {nombre, vez}: la última prenda agregada
    const [enviando, setEnviando] = useState(false);
    const [hecha, setHecha] = useState(null);       // {pedido, vuelto}
    const [imprimiendo, setImprimiendo] = useState(false);

    const total = totalVenta(lineas);
    const { pagos, cambiarPagos, reiniciar } = usePagosVenta(total, medios);
    // Con sus datos, el RUT tiene que estar y cuadrar (QA 2026-11-21: no se validaba).
    const puedeCobrar = sePuedeVender(lineas, pagos)
        && (sinDatos || (Boolean((clienta.rut || '').trim()) && !motivoRutOpcional(clienta.rut)));

    // Dos lecturas seguidas pueden responder antes de que se pinte la primera:
    // la segunda tiene que sumar sobre lo que dejó la primera, no sobre lo pintado.
    const lineasAlDia = useRef(lineas);
    lineasAlDia.current = lineas;
    const cambiarLineas = useCallback((nuevas) => { lineasAlDia.current = nuevas; setLineas(nuevas); }, []);

    const agregar = useCallback((d) => {
        const { lineas: nuevas, aviso: problema } = agregarALaVenta(lineasAlDia.current, d);
        cambiarLineas(nuevas);
        // Lo agregado se avisa con un visto que aparece y se va (prendas/AvisoAgregado);
        // lo que no se pudo queda escrito, porque hay que leerlo.
        if (problema) setAviso({ tipo: 'error', texto: problema });
        else { setAviso(null); setAgregado({ nombre: d.nombre, vez: Date.now() }); }
    }, [cambiarLineas]);

    /** Lo que leyó la pistola (o un código escrito a mano). */
    const porCodigo = useCallback(async (codigo) => {
        try {
            agregar(await buscarPorCodigo(codigo));
        } catch (err) {
            setAviso({ tipo: 'error', texto: mensajeDeError(err?.message, `No se encontró ${codigo}`) });
        }
    }, [agregar]);

    const nuevaVenta = useCallback(() => {
        cambiarLineas([]);
        setSinDatos(true);
        setClienta({});
        setRecibido('');
        setAviso(null);
        setHecha(null);
        reiniciar();
    }, [cambiarLineas, reiniciar]);

    const imprimirComprobante = useCallback(async (pedido, opciones) => {
        setImprimiendo(true);
        try {
            await imprimir(pedido, opciones);
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
            const enEfectivo = pagos.filter(p => p.medio === efectivo).reduce((t, p) => t + pesos(p.monto), 0);
            const conCuanto = pesos(recibido);
            setHecha({ pedido, vuelto: conCuanto > enEfectivo ? conCuanto - enEfectivo : 0, recibido: conCuanto });
            setVersion(n => n + 1);
            await imprimirComprobante(pedido, { recibido: conCuanto });
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo registrar la venta'));
        } finally {
            setEnviando(false);
        }
    }, [puedeCobrar, enviando, sinDatos, clienta, lineas, pagos, recibido, imprimirComprobante, toast]);

    // Una sola pregunta a la vez, aunque se aprete V de nuevo.
    const preguntando = useRef(false);
    const vaciar = useCallback(async () => {
        if (!lineas.length || preguntando.current) return;
        preguntando.current = true;
        try {
            if (await confirm('¿Vaciar la venta? Se quitan todas las prendas.', { si: 'Vaciar', no: 'Seguir con la venta' })) {
                nuevaVenta();
            }
        } finally {
            preguntando.current = false;
        }
    }, [lineas.length, confirm, nuevaVenta]);

    return {
        version, medios, efectivo, lineas, cambiarLineas, agregar, porCodigo,
        sinDatos, setSinDatos, clienta, setClienta, pagos, cambiarPagos, falta: restante(lineas, pagos),
        recibido, setRecibido, total, puedeCobrar, cobrar, enviando, aviso, agregado,
        hecha, imprimiendo, imprimirComprobante, nuevaVenta, vaciar,
    };
}
