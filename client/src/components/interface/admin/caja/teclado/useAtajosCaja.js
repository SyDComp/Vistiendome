import { useEffect, useRef } from 'react';

/** Una tecla del modo atajos y lo que hace. Mayúsculas o minúsculas da igual. */
export const ATAJOS = [
    { tecla: 'B', que: 'buscar' },
    { tecla: 'Espacio', que: 'elegir con tarjetas' },
    { tecla: 'P', que: 'quién compra' },
    { tecla: '↑ ↓', que: 'prendas' },
    { tecla: '+ −', que: 'cantidad' },
    { tecla: 'C', que: 'cobrar' },
    { tecla: 'V', que: 'vaciar' },
    { tecla: 'D', que: 'cierre del día' },
];

const ACCION_DE = {
    b: 'buscar', ' ': 'elegir', p: 'quienCompra', c: 'cobrar', v: 'vaciar', d: 'cierre',
    ArrowUp: 'subir', ArrowDown: 'bajar', '+': 'sumar', '-': 'restar',
    Delete: 'quitar', Enter: 'editarPrecio',
};

/**
 * Las teclas de la caja. Esc siempre cambia de modo; las demás solo valen en
 * modo atajos (con el foco fuera de los campos). `acciones` es {nombre: fn}.
 */
export default function useAtajosCaja({ modo, alternar, acciones, activo = true }) {
    const actual = useRef({ modo, alternar, acciones, activo });
    useEffect(() => { actual.current = { modo, alternar, acciones, activo }; });

    useEffect(() => {
        const teclas = (e) => {
            const { modo: m, alternar: alt, acciones: a, activo: si } = actual.current;
            if (!si || e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key === 'Escape') { e.preventDefault(); return alt(); }
            if (m !== 'atajos') return;
            const accion = ACCION_DE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
            if (!accion || !a[accion]) return;
            // Sin esto, la letra que lleva a un campo se escribiría en él.
            e.preventDefault();
            a[accion]();
        };
        window.addEventListener('keydown', teclas);
        return () => window.removeEventListener('keydown', teclas);
    }, []);
}
