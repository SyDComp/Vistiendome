import { formatCurrency } from '../../../../../utils/cartUtils';
import { escapar, imprimirDocumento } from '../../../../../utils/impresion';
import estilos from './comprobante.impresion.css?raw';

/**
 * El comprobante en papel térmico de 58 mm (POS-5890F). Este archivo arma el
 * HTML; qué dice lo decide utils/comprobante.js, cómo se ve está en
 * `comprobante.impresion.css`, y abrir la ventana e imprimir lo hace
 * utils/impresion.js. En el PC de la caja, Chrome abre con
 * `--kiosk-printing`: imprime directo en la impresora predeterminada, sin
 * preguntar.
 */

const fecha = (d) => d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const fila = (izq, der, clase = '') =>
    `<div class="fila ${clase}"><span>${escapar(izq)}</span><span>${escapar(der)}</span></div>`;

const prenda = (l) => `
    <div class="prenda">
        <div class="nombre">${escapar(l.nombre)}</div>
        ${l.detalle ? `<div class="detalle">${escapar(l.detalle)}</div>` : ''}
        ${fila(`${l.cantidad} x ${formatCurrency(l.precio)}`, formatCurrency(l.subtotal))}
        ${l.sinCambio ? '<div class="marca">Sin cambio (hecha a medida)</div>' : ''}
    </div>`;

export const htmlComprobante = (c) => `
<div class="comprobante">
    <div class="centro">
        <div class="tienda">${escapar(c.tienda.nombre)}</div>
        ${c.tienda.direccion ? `<div>${escapar(c.tienda.direccion)}</div>` : ''}
        ${c.tienda.telefono ? `<div>Tel. ${escapar(c.tienda.telefono)}</div>` : ''}
        <div class="titulo">Comprobante de venta</div>
        <div class="aviso">No válido como boleta</div>
    </div>
    <hr>
    ${fila(`N° ${c.numero}`, fecha(c.fecha))}
    ${c.reimpreso ? `<div class="detalle">Copia impresa el ${escapar(fecha(c.reimpreso))}</div>` : ''}
    <hr>
    ${c.lineas.map(prenda).join('')}
    <hr>
    ${fila('TOTAL', formatCurrency(c.total), 'total')}
    ${c.pagos.map(p => fila(p.medio, formatCurrency(p.monto))).join('')}
    ${c.devoluciones.map(d => fila(d.texto, formatCurrency(d.monto))).join('')}
    ${c.vuelto ? fila('Recibido en efectivo', formatCurrency(c.vuelto.recibido)) + fila('Vuelto', formatCurrency(c.vuelto.vuelto)) : ''}
    ${c.politica.length ? `<hr><div class="politica"><div class="nombre">Cambios</div>${c.politica.map(f => `<p>${escapar(f)}</p>`).join('')}</div>` : ''}
    <hr>
    <div class="centro">Gracias por tu compra</div>
</div>`;

/** @returns {boolean} false si el navegador bloqueó la ventana */
export const imprimirComprobante = (comprobante) => imprimirDocumento({
    titulo: `Comprobante N° ${comprobante.numero}`,
    cuerpo: htmlComprobante(comprobante),
    estilos,
});
