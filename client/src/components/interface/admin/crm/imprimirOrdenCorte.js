import { agrupar, nombreDeProducto } from '../../../../utils/prendas';

/**
 * El papel que se lleva a la mesa de corte.
 *
 * Ventana y documento propios: `window.print()` desde una vista del panel
 * imprime el panel entero, barra lateral incluida.
 *
 * Mismo agrupado que la pantalla (`agrupar`), y las dos vistas: por modelo para
 * cortar, por clienta para entregar. La planilla de papel usa la segunda; lo
 * que agrega ésta es que las columnas salen de los datos (así no se pierde la
 * quinta característica de un producto) y que cada grupo trae su total, en vez
 * de contar filas a mano.
 *
 * TAMAÑO CARTA. Son 215,9 mm, y con `@page margin: 12mm` quedan 191,9 mm
 * útiles. Antes se apilaba el margen de página CON un padding del body de
 * 12 mm y la hoja usaba 171,9: se tiraba el 20% del ancho, que es justo lo que
 * hace falta cuando se agrega la columna Producto.
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

const tablaDe = ({ titulo, columnas, filas, unidades, conColumnaProducto }) => {
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
            <h2>${escapar(titulo)}</h2>
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

    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return false;

    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Orden de Corte N° ${escapar(orden.numero)}</title>
<style>
    *{box-sizing:border-box}
    /* El margen lo pone @page; un padding acá se SUMA al margen y recorta la
       hoja sin que se note. */
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:0;color:#000}
    .cab{border-bottom:3px solid #000;padding-bottom:10px;margin-bottom:16px}
    .cab h1{font-size:21px;margin:0 0 3px;letter-spacing:.3px}
    .cab .meta{font-size:12px;color:#444}
    .notas{font-size:12px;border:1px solid #000;padding:8px 10px;margin-bottom:16px}
    .notas b{text-transform:uppercase;font-size:10px;letter-spacing:.5px;display:block;margin-bottom:3px}

    /* Un modelo no se parte entre dos hojas: en la mesa de corte se trabaja
       un modelo a la vez y media tabla en la hoja siguiente se pierde. */
    .modelo{margin-bottom:20px;page-break-inside:avoid}
    .modelo-cab{display:flex;justify-content:space-between;align-items:baseline;
                border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:0}
    .modelo-cab h2{font-size:16px;margin:0;text-transform:uppercase;letter-spacing:.4px}
    .modelo-cab span{font-size:13px;font-weight:700}

    table{width:100%;border-collapse:collapse;font-size:13.5px}
    /* Las características se ajustan a su contenido y "Para" se come el resto.
       Sin esto la tabla reparte el ancho por igual y TALLA ocupa lo mismo que
       MATERIAL, con huecos en medio que cuesta seguir con la vista. */
    th,td{white-space:nowrap}
    th.ancha,td.origen{width:99%;white-space:normal}
    th{text-align:left;padding:5px 6px;font-size:11px;text-transform:uppercase;
       letter-spacing:.5px;border-bottom:1px solid #000;color:#333}
    td{padding:8px 6px;border-bottom:1px solid #ccc}
    .num{text-align:right}
    /* La cantidad centrada: es lo que se busca de un vistazo en la mesa. */
    .cant,th.cant{text-align:center;font-weight:800}
    .fuerte{font-weight:800}
    .origen{font-size:12px;color:#444}
    .producto{font-weight:700;white-space:normal}
    .check{width:26px}
    td.check:after{content:'';display:block;width:13px;height:13px;border:1.5px solid #000}
    .blanca td{height:26px}

    .total{margin-top:8px;border-top:2px solid #000;padding-top:8px;
           display:flex;justify-content:space-between;font-size:13px;font-weight:800}
    @page{size:letter;margin:12mm}
    /* En pantalla (la ventana que se abre antes de imprimir) el margen de
       @page no aplica, así que se le da uno propio. */
    @media screen{body{padding:14mm 12mm}}
</style></head><body>
<div class="cab">
    <h1>Orden de Corte N° ${escapar(orden.numero)}</h1>
    <div class="meta">${escapar(etiquetaEstado)} · ${grupos.length} ${porCliente ? (grupos.length === 1 ? 'clienta' : 'clientas') : (grupos.length === 1 ? 'modelo' : 'modelos')} · ${escapar(orden.total_unidades)} unidades · ${escapar(fecha)}</div>
    <div class="meta">${porCliente ? 'Agrupada por clienta — para armar y entregar' : 'Agrupada por modelo — para cortar'}</div>
</div>
${orden.notas ? `<div class="notas"><b>Notas</b>${escapar(orden.notas)}</div>` : ''}
${grupos.map(tablaDe).join('')}
<div class="total"><span>Total a cortar</span><span>${escapar(orden.total_unidades)} unidades</span></div>
<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400)}<\/script>
</body></html>`);
    w.document.close();
    return true;
};
