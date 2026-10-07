import React from 'react';
import { describirEvento, autorDe } from '../../../../../utils/historiaPedido';

const FECHA = new Intl.DateTimeFormat('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** Lo que le pasó al pedido, de lo más antiguo a lo más reciente. Solo pinta. */
const HistoriaPedido = ({ eventos, cargando, error, modoEntrega, onReintentar }) => {
    if (cargando) {
        return <p className="sp-aviso" aria-busy="true">Cargando la historia…</p>;
    }
    if (error) {
        return (
            <div className="sp-aviso sp-aviso--error" role="alert">
                <span>{error}</span>
                <button type="button" className="sp-boton" onClick={onReintentar}>Reintentar</button>
            </div>
        );
    }
    if (!eventos.length) {
        return <p className="sp-aviso">Este pedido todavía no tiene nada anotado.</p>;
    }

    return (
        <ol className="sp-historia">
            {eventos.map(ev => {
                const { texto, detalle } = describirEvento(ev, modoEntrega);
                const autor = autorDe(ev);
                const inicio = ev.tipo === 'REGISTRO_INICIADO';
                return (
                    <li key={ev.id} className={inicio ? 'sp-evento sp-evento--inicio' : 'sp-evento'}>
                        <time className="sp-cuando" dateTime={ev.ocurrido_at}>{FECHA.format(new Date(ev.ocurrido_at))}</time>
                        <p className="sp-que">{texto}</p>
                        {detalle && <p className="sp-detalle">{detalle}</p>}
                        {autor && <p className="sp-quien">{autor}</p>}
                    </li>
                );
            })}
        </ol>
    );
};

export default HistoriaPedido;
