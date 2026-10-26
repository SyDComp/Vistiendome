import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';
import { cumple } from '../../../../../utils/busquedaCaja';
import { huboTeclasDespues } from '../teclado/usePistola';
import { avanzar, caracteristicasDe, opcionesDe, retroceder } from '../../../../../utils/selectorPrendas';
import OpcionesPaso from './OpcionesPaso';
import TarjetasProducto from './TarjetasProducto';
import './selector.css';

const PIEZAS = 'piezas';
const ESPERA_NUMERO = 60;

/**
 * Elegir sin escribir: el producto, y después una característica a la vez
 * hasta que queda una sola variante, que entra a la venta. Se sigue abierto
 * para la siguiente; Esc cierra. Si se había escrito algo en el buscador
 * ("vestido rojo"), parte filtrado con eso.
 *
 * Teclado: 1 a 9 eligen, las flechas mueven y Enter elige lo marcado,
 * Retroceso vuelve un paso, Esc cierra. La lógica está en utils/selectorPrendas.js.
 */
const SelectorPrendas = ({ productos, disponibles, definiciones, orden, interpretacion, onElegido, onCerrar }) => {
    const [productoId, setProductoId] = useState(null);
    const [aMano, setAMano] = useState({});
    const [marcada, setMarcada] = useState(0);
    const [agregado, setAgregado] = useState(null);

    const filtra = (d) => !interpretacion || cumple(d, interpretacion);
    const visibles = productos.filter(p => disponibles.some(d => d.producto_id === p.id && filtra(d)));
    const piezas = disponibles.filter(d => d.tipo === 'pieza' && filtra(d));

    const variantes = useMemo(
        () => disponibles.filter(d => d.tipo === 'variante' && d.producto_id === productoId),
        [disponibles, productoId],
    );
    const pasos = useMemo(() => caracteristicasDe(variantes, orden), [variantes, orden]);
    const estado = productoId && productoId !== PIEZAS ? avanzar(variantes, pasos, aMano, definiciones) : null;
    const definicionDe = (c) => definiciones.find(d => d.name.toUpperCase() === c);

    const opciones = productoId === PIEZAS
        ? piezas.map(p => ({ valor: `${p.nombre} · ${p.codigo}`, libres: 1, pieza: p }))
        : estado?.paso ? opcionesDe(variantes, estado.paso, estado.elegidas, definicionDe(estado.paso)) : [];
    const cuantas = productoId ? opciones.length : visibles.length + (piezas.length ? 1 : 0);

    const sumar = (d) => {
        onElegido(d);
        setAgregado(d.nombre);
        setProductoId(null);
        setAMano({});
        setMarcada(0);
    };

    // Lo que ya se escribió en el buscador ("rojo", "xs") se da por elegido,
    // si el producto lo tiene.
    const inicialesPara = (variantesDelProducto, pasosDelProducto) => Object.fromEntries(
        (interpretacion?.filtros || [])
            .filter(f => f.valores.length === 1 && pasosDelProducto.includes(f.caracteristica.toUpperCase()))
            .map(f => [f.caracteristica.toUpperCase(), f.valores[0]])
            .filter(([c, v]) => variantesDelProducto.some(d => Object.entries(d.config || {})
                .some(([k, val]) => k.toUpperCase() === c && val === v))),
    );

    const elegir = (i) => {
        setAgregado(null);
        setMarcada(0);
        if (!productoId) {
            if (i === visibles.length && piezas.length) return setProductoId(PIEZAS);
            const p = visibles[i];
            if (!p) return;
            const delProducto = disponibles.filter(d => d.tipo === 'variante' && d.producto_id === p.id);
            const iniciales = inicialesPara(delProducto, caracteristicasDe(delProducto, orden));
            const r = avanzar(delProducto, caracteristicasDe(delProducto, orden), iniciales, definiciones);
            if (r.variante) return sumar(r.variante);
            setProductoId(p.id);
            setAMano(iniciales);
            return;
        }
        const o = opciones[i];
        if (!o || o.libres <= 0) return;
        if (o.pieza) return sumar(o.pieza);
        const nuevas = { ...aMano, [estado.paso]: o.valor };
        const r = avanzar(variantes, pasos, nuevas, definiciones);
        if (r.variante) return sumar(r.variante);
        setAMano(nuevas);
    };

    const atras = () => {
        setMarcada(0);
        const anterior = retroceder(aMano);
        if (anterior === null) setProductoId(null);
        else setAMano(anterior);
    };

    // Va antes que las teclas de la caja (fase de captura) y no las deja
    // pasar: mientras está abierto, el teclado es del selector.
    useEffect(() => {
        const teclas = (e) => {
            const n = Number(e.key);
            let usada = true;
            if (e.key === 'Escape') onCerrar();
            else if (e.key === 'Backspace') { if (productoId) atras(); }
            else if (n >= 1 && n <= 9) {
                // Un número puede ser el comienzo de una lectura de la pistola: se
                // espera un instante y, si vinieron más teclas al tiro, no era una elección.
                const momento = e.timeStamp;
                setTimeout(() => { if (!huboTeclasDespues(momento)) elegir(n - 1); }, ESPERA_NUMERO);
            }
            else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setMarcada(m => Math.min(m + 1, cuantas - 1));
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setMarcada(m => Math.max(m - 1, 0));
            else if (e.key === 'Enter') elegir(marcada);
            else usada = false;
            if (usada) { e.preventDefault(); e.stopPropagation(); }
        };
        window.addEventListener('keydown', teclas, true);
        return () => window.removeEventListener('keydown', teclas, true);
    });

    const producto = productos.find(p => p.id === productoId);
    const titulo = !productoId ? '¿Qué prenda?' : productoId === PIEZAS ? '¿Cuál pieza?' : `${estado?.paso ?? ''}`;
    return createPortal(
        <div className="cj-sel-capa" role="dialog" aria-modal="true" aria-labelledby="cj-sel-titulo">
            <div className="cj-sel">
                <div className="cj-sel-cabecera">
                    {productoId && (
                        <button type="button" className="cj-icono" onClick={atras} aria-label="Volver un paso"><ArrowLeft size={16} /></button>
                    )}
                    <div className="cj-sel-ruta">
                        <h3 id="cj-sel-titulo">{titulo}</h3>
                        <span>
                            {[producto?.nombre ?? (productoId === PIEZAS ? 'Piezas únicas' : null),
                                ...Object.values(estado?.elegidas || {})].filter(Boolean).join(' · ')}
                        </span>
                    </div>
                    <span className="cj-ayuda"><kbd>1</kbd>–<kbd>9</kbd> elegir · <kbd>⌫</kbd> volver · <kbd>Esc</kbd> cerrar</span>
                    <button type="button" className="cj-icono" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
                </div>
                {agregado && <p className="cj-aviso cj-aviso--ok" role="status">{agregado}: agregado. Elige la siguiente o cierra con Esc.</p>}
                {!productoId && (cuantas
                    ? <TarjetasProducto productos={visibles} piezas={piezas.length} marcada={marcada} onElegir={elegir} />
                    : <p className="cj-vacio">No hay nada libre que calce con lo escrito.</p>)}
                {productoId && <OpcionesPaso opciones={opciones} marcada={marcada} onElegir={elegir} />}
            </div>
        </div>,
        document.body,
    );
};

export default SelectorPrendas;
