import { NOMBRE_TIENDA } from '../../../../../constants/marca';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { escapar } from '../../../../../utils/impresion';
import { imprimirEnMarco } from '../../../../../utils/imprimirEnMarco';
import papel from '../impresion/papel58.impresion.css?raw';
import estilos from './cierre.impresion.css?raw';
import { fechaLarga, hora } from './fechas';

/**
 * El cierre de caja en el papel de la térmica: el efectivo que debería haber
 * en el cajón, lo cobrado por medio, las ventas de la caja y lo anulado
 * después. Qué dice lo decide el servidor (core/caja/cierre.py).
 */

const fila = (izq, der, clase = '') =>
    `<div class="fila ${clase}"><span>${escapar(izq)}</span><span>${escapar(der)}</span></div>`;

// El cajón: con cuánto partió, cuánto debería haber y, si se contó, la diferencia.
const cajon = (c, a) => {
    if (!a || a.fondo_inicial === null) {
        return c.efectivo_en_cajon !== null
            ? `<div class="cajon"><span>Efectivo del día</span>${escapar(formatCurrency(c.efectivo_en_cajon))}</div><div class="detalle">Sin fondo anotado: no se sabe cuánto debería haber.</div><hr>`
            : '';
    }
    const diferencia = a.diferencia === null ? '' : (a.diferencia === 0 ? 'Cuadra'
        : a.diferencia > 0 ? `Sobran ${formatCurrency(a.diferencia)}` : `Faltan ${formatCurrency(-a.diferencia)}`);
    return `${fila('Fondo inicial', formatCurrency(a.fondo_inicial))}
    ${fila('Efectivo del día', formatCurrency(a.efectivo_del_dia || 0))}
    <div class="cajon"><span>Debería haber</span>${escapar(formatCurrency(a.deberia))}</div>
    ${a.contado !== null ? fila('Contado', formatCurrency(a.contado)) + fila('Diferencia', diferencia, 'total') + fila('Se deja para mañana', formatCurrency(a.deja)) : ''}
    ${a.nota ? `<div class="detalle">${escapar(a.nota)}</div>` : ''}<hr>`;
};

export const htmlCierre = (c, ahora = new Date(), a = null) => `
<div class="ticket">
    <div class="centro">
        <div class="tienda">${escapar(NOMBRE_TIENDA)}</div>
        <div class="titulo">Cierre de caja</div>
        <div>${escapar(fechaLarga(c.fecha))}</div>
        <div class="detalle">Impreso el ${escapar(ahora.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23', timeZone: 'America/Santiago' }))}</div>
    </div>
    <hr>
    ${cajon(c, a)}
    <div class="seccion">Cobrado por medio</div>
    ${c.por_medio.length ? c.por_medio.map(m => fila(`${m.medio} (${m.pagos})`, formatCurrency(m.neto))
        + (m.devuelto ? `<div class="detalle">${escapar(`  cobrado ${formatCurrency(m.cobrado)}, devuelto ${formatCurrency(m.devuelto)}`)}</div>` : '')).join('')
        : '<div class="detalle">Sin pagos este día.</div>'}
    ${fila('TOTAL', formatCurrency(c.total_neto), 'total')}
    ${c.con_saldo_a_favor ? fila('Pagado con saldo a favor', formatCurrency(c.con_saldo_a_favor)) : ''}
    <hr>
    <div class="seccion">Ventas de la caja (${c.ventas_caja.length})</div>
    ${c.ventas_caja.map(v => fila(`N° ${v.numero ?? '—'}  ${hora(v.hora)}${v.estado !== 'DESPACHADA' ? ' (deshecha)' : ''}`, formatCurrency(v.total))).join('')
        || '<div class="detalle">Ninguna.</div>'}
    ${c.anulados_despues.length ? `<hr><div class="seccion">Anulado después</div>${c.anulados_despues.map(a =>
        fila(`N° ${a.numero ?? '—'} ${a.medio}`, formatCurrency(a.monto))).join('')}
        <div class="detalle">Contaron en el cierre impreso ese día; hoy ya no cuentan.</div>` : ''}
</div>`;

export const imprimirCierre = (cierre, arqueo = null) => imprimirEnMarco({
    titulo: `Cierre de caja ${cierre.fecha}`,
    cuerpo: htmlCierre(cierre, new Date(), arqueo && arqueo.fecha === cierre.fecha ? arqueo : null),
    estilos: [papel, estilos],
});
