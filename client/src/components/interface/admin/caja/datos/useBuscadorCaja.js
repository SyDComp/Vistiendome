import { useEffect, useMemo, useState } from 'react';
import { buscarEnCaja } from '../../../../../lib/api/endpoints';
import { interpretar } from '../../../../../utils/busquedaCaja';
import { desdeInterpretacion } from '../../../../../utils/filtrosCaja';

const ESPERA = 150;            // ms sin teclear antes de preguntar al servidor
const MINIMO = 2;              // letras para empezar a buscar
const NADA = { resultados: [], total: 0 };

/**
 * El buscador de la caja: lo escrito se interpreta aquí (utils/busquedaCaja.js:
 * qué palabras son características) y el servidor busca. Se pregunta un
 * instante después de dejar de teclear, y una respuesta vieja no pisa a una nueva.
 * `version` cambia cuando cambia lo libre (tras una venta).
 */
export default function useBuscadorCaja(texto, definiciones, version) {
    const interpretacion = useMemo(() => interpretar(texto, definiciones), [texto, definiciones]);
    const filtros = useMemo(() => desdeInterpretacion(interpretacion), [interpretacion]);
    const [encontrado, setEncontrado] = useState(NADA);
    const corto = texto.trim().length < MINIMO;

    useEffect(() => {
        if (corto) return undefined;
        let vigente = true;
        const espera = setTimeout(() => {
            buscarEnCaja(filtros)
                .then(r => { if (vigente) setEncontrado(r || NADA); })
                .catch(() => { if (vigente) setEncontrado(NADA); });
        }, ESPERA);
        return () => { vigente = false; clearTimeout(espera); };
    }, [filtros, corto, version]);

    return { interpretacion, filtros, encontrado: corto ? NADA : encontrado };
}
