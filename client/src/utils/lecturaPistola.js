/**
 * Distinguir la pistola de una persona. El lector (HBA-X3) se conecta como
 * teclado: para el navegador, una lectura son teclas. Pero las escribe de
 * golpe, con milisegundos entre una y otra, y termina con Enter: ninguna
 * persona teclea así. Con eso la caja la reconoce y suma la prenda sin pasar
 * por ningún campo.
 *
 * Si al lector se le configura un prefijo (un carácter que nadie teclea, con
 * los códigos de programación de su manual), la lectura se reconoce desde ese
 * carácter, sin depender de la velocidad: ver PREFIJO_LECTOR en constants/lector.js.
 *
 * `crearDetector` recibe cada tecla con su hora y dice qué hacer con ella:
 *   'pasar'   es de una persona: sigue su camino;
 *   'tragar'  es parte de una lectura: no debe llegar a ningún campo;
 *   'leido'   terminó una lectura: `codigo` es lo leído, y `escapadas` cuántas
 *             teclas alcanzaron a pasar antes de saber que era la pistola
 *             (quien escribía en un campo tiene que deshacerlas).
 */

export const crearDetector = ({ intervaloMaximo = 35, largoMinimo = 6, seguidasParaSaber = 4, prefijo = null } = {}) => {
    let teclas = [];
    let ultima = -Infinity;
    let conPrefijo = false;
    let tragadas = 0;

    const reiniciar = () => { teclas = []; conPrefijo = false; tragadas = 0; };

    return (tecla, ahora) => {
        const seguida = ahora - ultima <= intervaloMaximo;
        ultima = ahora;

        if (prefijo && tecla === prefijo) {
            reiniciar();
            conPrefijo = true;
            return { accion: 'tragar' };
        }
        if (tecla === 'Enter') {
            const codigo = teclas.join('');
            const esLectura = conPrefijo || (seguida && teclas.length >= largoMinimo);
            const escapadas = teclas.length - tragadas;
            reiniciar();
            return esLectura && codigo ? { accion: 'leido', codigo, escapadas: conPrefijo ? 0 : escapadas } : { accion: 'pasar' };
        }
        if (tecla.length !== 1) { if (!conPrefijo) reiniciar(); return { accion: 'pasar' }; }

        if (!conPrefijo && !seguida) reiniciar();
        teclas.push(tecla);
        // Cuatro teclas seguidas a menos de 35 ms no las sostiene una mano (son
        // más de 300 palabras por minuto): desde ahí se sabe que es la pistola.
        // Con menos, una persona rápida perdería letras.
        if (conPrefijo || teclas.length >= seguidasParaSaber) { tragadas += 1; return { accion: 'tragar' }; }
        return { accion: 'pasar' };
    };
};
