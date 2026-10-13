import React from 'react';
import { useNavigate } from 'react-router-dom';
import { textoApartado } from './apartado';

/**
 * Para qué pedidos está apartada una variante, en el orden en que se la
 * llevan: el que confirmó antes, primero. Cada pedido lleva a su detalle.
 */
const ApartadosKardex = ({ apartados = [] }) => {
    const navigate = useNavigate();
    if (!apartados.length) return null;
    return (
        <div className="logistics-apartados">
            <div className="logistics-drawer-label">Apartado para</div>
            <ul className="logistics-apartados-lista">
                {apartados.map((a, i) => (
                    <li key={`${a.pedido_id}-${i}`} className="logistics-apartados-item">
                        <button type="button" className="logistics-apartados-pedido"
                            onClick={() => navigate(`/admin/dashboard/crm/cotizaciones?pedido=${a.pedido_id}`)}>
                            N° {a.pedido_numero}{a.cliente ? ` · ${a.cliente}` : ''}
                        </button>
                        <span>{a.cantidad} u.</span>
                        <span className={a.estado === 'ESPERANDO' ? 'logistics-apartados-estado espera' : 'logistics-apartados-estado'}>
                            {textoApartado(a.estado)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ApartadosKardex;
