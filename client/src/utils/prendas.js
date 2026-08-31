/**
 * Cómo se ordenan las prendas de un pedido para que las lea una costurera.
 *
 * Una sola responsabilidad: decidir la ESTRUCTURA (qué grupos, qué columnas,
 * qué filas). No pinta nada. La usan la pantalla y el documento que se imprime,
 * que son dos formas distintas de mostrar lo mismo — si cada una decidiera sus
 * columnas por su cuenta, se separarían con el primer cambio.
 *
 * El problema que resuelve: las características venían apiladas en una sola
 * celda ("CUELLO: En V · MANGAS: Larga · COLOR: Negro · TALLA: XS"). Eso obliga
 * a leer una frase por fila. En la planilla de papel que ya usa la clienta cada
 * característica tiene su columna, y se lee bajando la vista. Eso es mejor y hay
 * que conservarlo.
 *
 * Lo que el papel hace mal y acá no: sus columnas son fijas (TALLA, COLOR,
 * MANGAS, LARGO) y sirven para un tipo de prenda. Un producto con cinco
 * características no cabe, y lo que no cabe se pierde. Acá las columnas SALEN
 * DE LOS DATOS, y por eso se agrupa por producto: cada modelo trae su propio
 * juego de características, y mezclarlos en una sola tabla dejaría media tabla
 * vacía.
 */

// Sólo afecta el ORDEN EN QUE SE MUESTRAN las columnas, nunca qué características
// existen ni cómo se comportan — eso lo decide la clienta desde el panel.
// Existe porque quien lee necesita la talla siempre en el mismo lugar: si el
// orden cambia entre un producto y otro, hay que volver a leer el encabezado
// cada vez.
// Lo correcto a futuro es un campo `orden` en la característica, que Paola
// arrastre desde el panel; mientras no exista, esto es la aproximación.
const PRIMERAS = ['talla', 'color', 'estampado'];

const peso = (clave) => {
    const i = PRIMERAS.indexOf(String(clave).toLowerCase());
    return i === -1 ? PRIMERAS.length : i;
};

const ordenarColumnas = (claves) =>
    [...claves].sort((a, b) => {
        const d = peso(a) - peso(b);
        return d !== 0 ? d : a.localeCompare(b);
    });

const nombreDe = (item) =>
    item.producto || item.producto_nombre || item.sku_name || 'Sin producto';

/**
 * Agrupa las prendas por producto y calcula, para cada grupo, qué columnas
 * necesita.
 *
 * @returns {{producto: string, columnas: string[], filas: object[], unidades: number}[]}
 *          En el orden en que los productos aparecen en el pedido.
 */
export const agruparPorProducto = (items = []) => {
    const grupos = new Map();

    items.forEach(item => {
        const producto = nombreDe(item);
        if (!grupos.has(producto)) {
            grupos.set(producto, { producto, claves: new Set(), filas: [], unidades: 0 });
        }
        const grupo = grupos.get(producto);
        // Sólo se hace columna la característica que tiene valor en alguna fila:
        // una columna entera vacía es ruido para quien lee.
        Object.entries(item.config || {}).forEach(([clave, valor]) => {
            if (valor) grupo.claves.add(clave);
        });
        grupo.filas.push(item);
        grupo.unidades += Number(item.cantidad) || 0;
    });

    return [...grupos.values()].map(({ producto, claves, filas, unidades }) => ({
        producto,
        columnas: ordenarColumnas(claves),
        filas,
        unidades,
    }));
};

/** Total de unidades de todo el pedido, no de un grupo. */
export const totalUnidades = (items = []) =>
    items.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
