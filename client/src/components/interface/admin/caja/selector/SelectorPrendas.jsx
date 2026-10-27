import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Filter, Gem, X } from 'lucide-react';
import { alternar, cuantosFiltros, elegidasDe, paginaDe, paginasDe, posicionDe } from '../../../../../utils/filtrosCaja';
import { avanzar, caracteristicasDe, opcionesDe, retroceder } from '../../../../../utils/selectorPrendas';
import { opcionesFiltros, opcionesGrupo, opcionesPaso, opcionesPiezas } from '../../../../../utils/vistasSelector';
import useCatalogoCaja from '../datos/useCatalogoCaja';
import useVariantesProducto from '../datos/useVariantesProducto';
import { huboTeclasDespues } from '../teclado/usePistola';
import FiltrosPuestos from './FiltrosPuestos';
import OpcionesPaso from './OpcionesPaso';
import Paginador from './Paginador';
import TarjetasProducto from './TarjetasProducto';
import './selector.css';

const ESPERA_NUMERO = 60;
const PRODUCTOS = { tipo: 'productos' };

/**
 * Elegir sin escribir. Productos de a 10 (lo más vendido primero), filtros
 * con números, y al elegir un producto, una característica a la vez hasta que
 * queda una sola variante, que entra a la venta. Se sigue abierto para la
 * siguiente; Esc cierra. Parte con lo que se había escrito en el buscador.
 *
 * Teclado: 1–9 y 0 eligen, ← → cambian de página, ↑ ↓ marcan y Enter elige
 * lo marcado, F filtros, U piezas únicas, Retroceso vuelve, Esc cierra.
 * El servidor filtra y pagina (core/caja); la lógica de los pasos está en
 * utils/selectorPrendas.js y la de cada vista en utils/vistasSelector.js.
 */
const SelectorPrendas = ({ filtrosIniciales, definiciones, orden, version, onElegido, onCerrar }) => {
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [vista, setVista] = useState(PRODUCTOS);
    const [paginaProductos, setPaginaProductos] = useState(1);
    const [paginaLista, setPaginaLista] = useState(1);
    const [marcada, setMarcada] = useState(0);
    const [aMano, setAMano] = useState({});
    const [agregado, setAgregado] = useState(null);

    const { datos, error } = useCatalogoCaja(filtros, paginaProductos, version);
    const variantes = useVariantesProducto(vista.tipo === 'producto' ? vista.id : null);
    const pasos = useMemo(() => (variantes ? caracteristicasDe(variantes, orden) : []), [variantes, orden]);
    const definicionDe = (c) => definiciones.find(d => d.name.toUpperCase() === c);

    // Lo filtrado con un solo valor se da por elegido, si el producto lo tiene.
    const iniciales = useMemo(() => Object.fromEntries(Object.entries(elegidasDe(filtros))
        .filter(([c, v]) => pasos.includes(c) && (variantes || []).some(d => Object.entries(d.config || {})
            .some(([k, val]) => k.toUpperCase() === c && val === v)))), [filtros, pasos, variantes]);
    const estado = variantes ? avanzar(variantes, pasos, { ...iniciales, ...aMano }, definiciones) : null;

    const faceta = vista.tipo === 'grupo' ? datos?.facetas.find(f => f.clave === vista.clave) : null;
    const lista = {
        filtros: () => opcionesFiltros(datos?.facetas),
        grupo: () => opcionesGrupo(faceta),
        piezas: () => opcionesPiezas(datos?.piezas),
        producto: () => (estado?.variante
            ? [{ clave: 'agregar', titulo: 'Agregar a la venta', detalle: Object.values(estado.variante.config || {}).join(' / ') }]
            : opcionesPaso(estado?.paso ? opcionesDe(variantes, estado.paso, estado.elegidas, definicionDe(estado.paso)) : [])),
    }[vista.tipo]?.() || [];
    const enProductos = vista.tipo === 'productos';
    const visibles = enProductos ? (datos?.productos || []) : paginaDe(lista, paginaLista);
    const paginas = enProductos ? (datos?.paginas || 1) : paginasDe(lista);
    const pagina = enProductos ? paginaProductos : paginaLista;

    const ir = (nueva) => { setVista(nueva); setPaginaLista(1); setMarcada(0); };
    const cambiarPagina = (n) => {
        if (n < 1 || n > paginas) return;
        (enProductos ? setPaginaProductos : setPaginaLista)(n);
        setMarcada(0);
    };
    const cambiarFiltros = (nuevos) => { setFiltros(nuevos); setPaginaProductos(1); };

    const sumar = (d) => {
        onElegido(d);
        setAgregado(`${d.nombre} ${Object.values(d.config || {}).join(' / ')}`);
        setAMano({});
        ir(PRODUCTOS);
    };

    const elegir = (i) => {
        const o = visibles[i];
        if (!o) return;
        setAgregado(null);
        if (enProductos) { setAMano({}); return ir({ tipo: 'producto', id: o.id, nombre: o.nombre }); }
        if (o.apagada) return;
        if (vista.tipo === 'filtros') return ir({ tipo: 'grupo', clave: o.clave });
        if (vista.tipo === 'grupo') return cambiarFiltros(alternar(filtros, vista.clave, o.clave));
        if (vista.tipo === 'piezas') return sumar(datos.piezas.find(p => p.pieza_id === o.clave));
        if (estado?.variante) return sumar(estado.variante);
        const nuevas = { ...aMano, [estado.paso]: o.clave };
        const r = avanzar(variantes, pasos, { ...iniciales, ...nuevas }, definiciones);
        if (r.variante) return sumar(r.variante);
        setAMano(nuevas);
        setMarcada(0);
        setPaginaLista(1);
    };

    const atras = () => {
        if (vista.tipo === 'grupo') return ir({ tipo: 'filtros' });
        if (vista.tipo === 'producto') {
            const anterior = retroceder(aMano);
            if (anterior !== null) { setAMano(anterior); setMarcada(0); setPaginaLista(1); return undefined; }
        }
        return ir(PRODUCTOS);
    };

    // Va antes que las teclas de la caja (fase de captura) y no las deja
    // pasar: mientras está abierto, el teclado es del selector.
    useEffect(() => {
        const teclas = (e) => {
            const posicion = posicionDe(e.key);
            const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            let usada = true;
            if (tecla === 'Escape') onCerrar();
            else if (tecla === 'Backspace') { if (!enProductos) atras(); }
            else if (posicion !== null) {
                // Un número puede ser el comienzo de una lectura de la pistola: se
                // espera un instante y, si vinieron más teclas al tiro, no era una elección.
                const momento = e.timeStamp;
                setTimeout(() => { if (!huboTeclasDespues(momento)) elegir(posicion); }, ESPERA_NUMERO);
            }
            else if (tecla === 'ArrowRight') cambiarPagina(pagina + 1);
            else if (tecla === 'ArrowLeft') cambiarPagina(pagina - 1);
            else if (tecla === 'ArrowDown') setMarcada(m => Math.min(m + 1, visibles.length - 1));
            else if (tecla === 'ArrowUp') setMarcada(m => Math.max(m - 1, 0));
            else if (tecla === 'Enter') elegir(marcada);
            else if (tecla === 'f') ir({ tipo: 'filtros' });
            else if (tecla === 'u') { if (datos?.piezas?.length) ir({ tipo: 'piezas' }); }
            else usada = false;
            if (usada) { e.preventDefault(); e.stopPropagation(); }
        };
        window.addEventListener('keydown', teclas, true);
        return () => window.removeEventListener('keydown', teclas, true);
    });

    const titulo = {
        productos: '¿Qué prenda?', filtros: 'Filtros', grupo: faceta?.nombre, piezas: 'Piezas únicas',
        producto: estado?.variante ? '¿La agrego?' : (estado?.paso || '').toLowerCase(),
    }[vista.tipo];
    const ruta = vista.tipo === 'producto' ? [vista.nombre, ...Object.values(estado?.elegidas || {})].join(' · ') : null;
    const cuantos = cuantosFiltros(filtros);

    return createPortal(
        <div className="cj-sel-capa" role="dialog" aria-modal="true" aria-labelledby="cj-sel-titulo">
            <div className="cj-sel">
                <div className="cj-sel-cabecera">
                    {!enProductos && (
                        <button type="button" className="cj-icono" onClick={atras} aria-label="Volver un paso"><ArrowLeft size={16} /></button>
                    )}
                    <div className="cj-sel-ruta">
                        <h3 id="cj-sel-titulo">{titulo}</h3>
                        {ruta && <span>{ruta}</span>}
                    </div>
                    <button type="button" className={`cj-tarjetas${cuantos ? ' cj-tarjetas--activo' : ''}`} onClick={() => ir({ tipo: 'filtros' })}>
                        <Filter size={16} aria-hidden="true" /> Filtros{cuantos ? ` (${cuantos})` : ''} <kbd>F</kbd>
                    </button>
                    {datos?.piezas?.length > 0 && (
                        <button type="button" className="cj-tarjetas" onClick={() => ir({ tipo: 'piezas' })}>
                            <Gem size={16} aria-hidden="true" /> Piezas únicas ({datos.piezas.length}) <kbd>U</kbd>
                        </button>
                    )}
                    <button type="button" className="cj-icono" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
                </div>
                <FiltrosPuestos facetas={datos?.facetas} filtros={filtros}
                    onQuitar={(clave, valor) => cambiarFiltros(alternar(filtros, clave, valor))} />
                {agregado && <p className="cj-aviso cj-aviso--ok" role="status">{agregado}: agregado. Elige la siguiente o cierra con Esc.</p>}
                {error && <p className="cj-aviso cj-aviso--error" role="alert">{error}</p>}

                {enProductos && datos && (datos.productos.length
                    ? <TarjetasProducto productos={datos.productos} marcada={marcada} onElegir={elegir} />
                    : <p className="cj-vacio">No hay nada libre que calce con los filtros. Quita alguno con su × o con F.</p>)}
                {!enProductos && (vista.tipo !== 'producto' || variantes) && (
                    <OpcionesPaso opciones={visibles} marcada={marcada} onElegir={elegir} />
                )}
                {(!datos || (vista.tipo === 'producto' && !variantes)) && <p className="cj-vacio" aria-busy="true">Cargando…</p>}

                {paginas > 1 && (
                    <Paginador pagina={pagina} paginas={paginas} total={enProductos ? datos?.total : lista.length}
                        que={enProductos ? 'productos' : 'opciones'} onCambiar={cambiarPagina} />
                )}
                <p className="cj-ayuda cj-sel-ayuda">
                    <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> elegir · <kbd>←</kbd> <kbd>→</kbd> página · <kbd>F</kbd> filtros
                    {' · '}<kbd>⌫</kbd> volver · <kbd>Esc</kbd> cerrar
                </p>
            </div>
        </div>,
        document.body,
    );
};

export default SelectorPrendas;
