import { useSyncExternalStore } from 'react';
import { estaActivo, suscribir } from './soloCaja';

/**
 * ¿Está este navegador en modo solo caja? Se lee con useSyncExternalStore y no
 * llamando a estaActivo() al dibujar: el React Compiler memoriza esa llamada
 * (no depende de nada que React conozca) y la pantalla no se enteraba del
 * cambio hasta recargar (reportado 2026-11-23).
 */
const useSoloCaja = () => useSyncExternalStore(suscribir, estaActivo);

export default useSoloCaja;
