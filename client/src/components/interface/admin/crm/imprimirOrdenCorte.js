import { agrupar, nombreDeProducto, describirPedidos } from '../../../../utils/prendas';
import { imprimirDocumento } from '../../../../utils/impresion';
// La hoja vive en un .css de verdad y se trae como texto: asi el editor la
// entiende, y una comilla invertida en un comentario deja de romper la
// compilacion.
import estilos from './imprimirOrdenCorte.impresion.css?raw';

/**
 * El papel que se lleva a la mesa de corte.
 *
 * Este archivo arma el HTML y nada mas: como se ve la hoja esta en
 * `imprimirOrdenCorte.impresion.css`, y abrir la ventana e imprimir lo hace
 * `utils/impresion.js`.
 *
 * Mismo agrupado que la pantalla (`agrupar`), y las dos vistas: por modelo para
 * cortar, por clienta para entregar. La planilla de papel usa la segunda; lo
 * que agrega ésta es que las columnas salen de los datos (así no se pierde la
 * quinta característica de un producto) y que cada grupo trae su total, en vez
 * de contar filas a mano.
 */

const escapar = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const origenDe = (i) => i.para_stock
    ? 'Stock'
    : `Pedido N° ${i.pedido_numero ?? '—'}${i.cliente ? ' · ' + i.cliente : ''}`;

// Dos filas en blanco por modelo: en el taller se anota a mano sobre la hoja
// (una talla que se cambió, una prenda que se agregó). El papel actual las
// tiene y se usan.
const FILAS_EN_BLANCO = 2;

const tablaDe = ({ titulo, columnas, filas, unidades, pedidos, conColumnaProducto }) => {
    // Agrupado por clienta ya se sabe para quién es: la columna "Para" sobra y
    // ese ancho lo necesita "Producto", que es lo que distingue las filas.
    const colProducto = conColumnaProducto ? '<th class="ancha">Producto</th>' : '';
    const colDestino = conColumnaProducto ? '' : '<th class="ancha">Para</th>';
    // Siempre son las mismas: casilla + (producto O para) + características + cantidad.
    const celdasPorFila = columnas.length + 3;

    const encabezados = columnas.map(c => `<th>${escapar(c)}</th>`).join('');
    const cuerpo = filas.map(i => `
        <tr>
            <td class="check"></td>
            ${conColumnaProducto ? `<td class="producto">${escapar(nombreDeProducto(i))}</td>` : ''}
            ${columnas.map(c => `<td>${escapar(i.config?.[c] || '—')}</td>`).join('')}
            <td class="cant">${escapar(i.cantidad)}</td>
            ${conColumnaProducto ? '' : `<td class="origen">${escapar(origenDe(i))}</td>`}
        </tr>`).join('');
    const blancas = Array.from({ length: FILAS_EN_BLANCO }, () => `
        <tr class="blanca">${'<td></td>'.repeat(celdasPorFila)}</tr>`).join('');

    return `
    <section class="modelo">
        <div class="modelo-cab">
            <div class="modelo-titulo">
                <h2>${escapar(titulo)}</h2>
                ${conColumnaProducto && pedidos.length ? `<span class="pedidos">${escapar(describirPedidos(pedidos))}</span>` : ''}
            </div>
            <span>${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}</span>
        </div>
        <table>
            <thead><tr><th class="check"></th>${colProducto}${encabezados}<th class="cant">Cant.</th>${colDestino}</tr></thead>
            <tbody>${cuerpo}${blancas}</tbody>
        </table>
    </section>`;
};

export const imprimirOrdenCorte = (orden, etiquetaEstado, columnasPermitidas = null, por = 'producto') => {
    // Las columnas son las que la clienta eligió en cada característica
    // ("Sale en la orden de corte"). Si todavía no se sabe, salen todas: una
    // columna de más molesta, una hoja sin la talla manda a cortar mal.
    const grupos = agrupar(orden.items || [], { por, permitidas: columnasPermitidas });
    const porCliente = por === 'cliente';
    const fecha = new Date(orden.created_at).toLocaleDateString('es-CL');

    const cuerpo = `
<div class="cab">
    <h1>Orden de Corte N° ${escapar(orden.numero)}</h1>
    <div class="meta">${escapar(etiquetaEstado)} · ${grupos.length} ${porCliente ? (grupos.length === 1 ? 'clienta' : 'clientas') : (grupos.length === 1 ? 'modelo' : 'modelos')} · ${escapar(orden.total_unidades)} unidades · ${escapar(fecha)}</div>
    <div class="meta">${porCliente ? 'Agrupada por clienta — para armar y entregar' : 'Agrupada por modelo — para cortar'}</div>
</div>
${orden.notas ? `<div class="notas"><b>Notas</b>${escapar(orden.notas)}</div>` : ''}
${grupos.map(tablaDe).join('')}
<div class="total"><span>Total a cortar</span><span>${escapar(orden.total_unidades)} unidades</span></div>`;

    return imprimirDocumento({
        titulo: `Orden de Corte N° ${escapar(orden.numero)}`,
        cuerpo,
        estilos,
    });
};
