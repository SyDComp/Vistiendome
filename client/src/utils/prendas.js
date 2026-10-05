/**
 * Cómo se ordenan las prendas de un pedido para que las lea una costurera.
 *
 * Una sola responsabilidad: decidir la ESTRUCTURA (qué grupos, qué columnas,
 * qué filas). No pinta nada. La usan la pantalla y el documento que se imprime,
 * que son dos formas distintas de mostrar lo mismo — si cada una decidiera sus
 * columnas por su cuenta, se separarían con el primer cambio.
 *
 * Las dos formas de agrupar, y por qué existen las dos
 * ----------------------------------------------------
 * Son dos preguntas distintas sobre los mismos datos, y la planilla de papel
 * las mezcla en una sola hoja:
 *
 *   POR MODELO   "¿qué tengo que cortar?" — se tiende la tela de un modelo y se
 *                cortan todas sus tallas juntas, sin importar de quién sean.
 *                Cada modelo trae exactamente sus características, así que la
 *                tabla queda densa.
 *
 *   POR PEDIDO   "¿qué va en cada paquete?" — lo que se arma y se despacha es
 *                un pedido, no una persona: cada uno tiene su entrega y su
 *                etiqueta. Una clienta con dos pedidos en la misma orden sale
 *                en dos grupos, y así se sabe qué prenda va en cuál. Acá el
 *                producto pasa a ser UNA COLUMNA MÁS, porque un pedido trae
 *                varios modelos distintos. El precio de esto es que las
 *                columnas son la unión de las características de todos sus
 *                modelos, así que aparecen celdas "—" donde no aplica. Es
 *                inevitable: no se puede alinear en una fila lo que no comparte
 *                el mismo juego de características.
 *
 * En papel tamaño CARTA hay unos 192 mm útiles. Cada columna que sobra se paga
 * ahí, y por eso existe la propiedad "Sale en la orden de corte": es lo que
 * permite recortar la hoja hasta que entre.
 */

// Sólo afecta el ORDEN EN QUE SE MUESTRAN las columnas, nunca qué características
// existen ni cómo se comportan — eso lo decide la clienta desde el panel.
// Existe porque quien lee necesita la talla siempre en el mismo lugar: si el
// orden cambia entre un producto y otro, hay que volver a leer el encabezado
// cada vez.
// Lo correcto a futuro es un campo `orden` en la característica, que el taller
// arrastre desde el panel; mientras no exista, esto es la aproximación.
const PRIMERAS = ['talla', 'color', 'estampado'];

const peso = (clave) => {
    const i = PRIMERAS.indexOf(String(clave).toLowerCase());
    return i === -1 ? PRIMERAS.length : i;
};

/**
 * El mismo orden en todas partes: la talla siempre en el mismo lugar, en la
 * hoja de taller y en el explorador de variantes. Si cada pantalla ordenara a
 * su manera, habría que releer el encabezado en cada una.
 */
export const ordenarCaracteristicas = (claves) =>
    [...claves].sort((a, b) => {
        const d = peso(a) - peso(b);
        return d !== 0 ? d : a.localeCompare(b);
    });

export const nombreDeProducto = (item) =>
    item.producto || item.producto_nombre || item.sku_name || 'Sin producto';

// Una línea cortada para stock no es de ningún pedido, y eso es información:
// se agrupa aparte en vez de caer en un grupo "sin nombre".
//
// La clave es el pedido y no el nombre: dos clientas pueden llamarse igual,
// y una clienta puede tener dos pedidos en la misma orden.
const grupoDePedido = (item) => {
    if (item.para_stock) return { clave: 'stock', titulo: 'Para stock', pedido: null };
    const pedido = item.pedido_numero ?? null;
    return {
        clave: `pedido-${item.cotizacion_id ?? pedido ?? 'sin-pedido'}`,
        titulo: item.cliente || 'Sin clienta',
        pedido,
    };
};

const grupoDeProducto = (item) => {
    const titulo = nombreDeProducto(item);
    return { clave: `producto-${titulo}`, titulo, pedido: null };
};

/**
 * @param items
 * @param por          'producto' (para cortar) o 'pedido' (para armar y entregar).
 * @param permitidas   `Set` con los nombres de las características que la
 *                     clienta eligió que salgan ("Sale en la orden de corte").
 *                     `null`/`undefined` = salen todas; NO es lo mismo que un
 *                     Set vacío, que significa "no quiere ninguna".
 * @returns {{clave: string, titulo: string, pedido: number|null,
 *            columnas: string[], filas: object[], unidades: number,
 *            conColumnaProducto: boolean}[]}
 *          En el orden en que aparecen.
 */
export const agrupar = (items = [], { por = 'producto', permitidas = null } = {}) => {
    const sale = (clave) => !permitidas || permitidas.has(String(clave).toUpperCase());
    const porPedido = por === 'pedido';
    const grupoDe = porPedido ? grupoDePedido : grupoDeProducto;

    const grupos = new Map();
    items.forEach(item => {
        const { clave, titulo, pedido } = grupoDe(item);
        if (!grupos.has(clave)) {
            grupos.set(clave, { clave, titulo, pedido, claves: new Set(), filas: [], unidades: 0 });
        }
        const grupo = grupos.get(clave);
        // Sólo se hace columna la característica que tiene valor en alguna fila
        // del grupo: una columna entera vacía es ruido para quien lee.
        Object.entries(item.config || {}).forEach(([caracteristica, valor]) => {
            if (valor && sale(caracteristica)) grupo.claves.add(caracteristica);
        });
        grupo.filas.push(item);
        grupo.unidades += Number(item.cantidad) || 0;
    });

    return [...grupos.values()].map(({ clave, titulo, pedido, claves, filas, unidades }) => ({
        clave,
        titulo,
        pedido,
        columnas: ordenarCaracteristicas(claves),
        filas,
        unidades,
        // Agrupado por pedido, el producto deja de ser el título del grupo y
        // pasa a ser una columna: un pedido trae varios modelos.
        conColumnaProducto: porPedido,
    }));
};

/** Total de unidades de todo el pedido, no de un grupo. */
export const totalUnidades = (items = []) =>
    items.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
