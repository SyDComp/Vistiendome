import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Si un módulo del panel se cae al dibujarse, queda este aviso en su lugar y
 * el menú sigue funcionando. Sin esto, cualquier error de una pantalla dejaba
 * el panel entero en blanco.
 *
 * No arregla nada: el error sigue en la consola para buscarlo. "Volver a
 * cargar" recarga la página, porque si lo que falló fue bajar el código de la
 * pantalla (pasa justo después de un despliegue), reintentar sin recargar
 * vuelve a fallar.
 *
 * Quien lo usa le pone `key` con la ruta: al ir a otro módulo, la red parte
 * de cero y ese módulo se dibuja normal.
 */
export default class RedDeModulo extends React.Component {
    state = { cayo: false };

    static getDerivedStateFromError() {
        return { cayo: true };
    }

    componentDidCatch(error, info) {
        console.error('Un módulo del panel se cayó:', error, info?.componentStack);
    }

    render() {
        if (!this.state.cayo) return this.props.children;
        return (
            <div className="red-modulo" role="alert">
                <AlertTriangle size={28} className="red-modulo-icono" />
                <h2 className="red-modulo-titulo">Esta pantalla tuvo un error</h2>
                <p className="red-modulo-texto">
                    Lo demás del panel sigue funcionando. Si vuelve a pasar,
                    avísanos qué estabas haciendo justo antes.
                </p>
                <button type="button" className="adm-boton-oscuro red-modulo-boton"
                    onClick={() => window.location.reload()}>
                    <RotateCw size={16} /> Volver a cargar
                </button>
            </div>
        );
    }
}
