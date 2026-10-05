import React, { useEffect, useState } from 'react';
import { MapPin, Truck } from 'lucide-react';
import { get } from '../../../../lib/api/client';
import { OPCIONES_ENTREGA, esRetiro } from './entrega';

const mismo = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * Cómo recibe la clienta lo que pide. Primero el tipo de entrega, porque de
 * él depende todo lo demás: un retiro en tienda no pide transportista ni
 * dirección, así que no se muestran.
 *
 * @param datos           { entrega, transporte, region, comuna, comuna_id, direccion }
 * @param cambiar         (parcial) => void
 * @param metodosEnvio    transportistas que ofrece la tienda
 */
const CamposEntrega = ({ datos, cambiar, metodosEnvio }) => {
    const [regiones, setRegiones] = useState([]);
    const [comunas, setComunas] = useState([]);
    const retiro = esRetiro(datos.entrega);

    useEffect(() => {
        get('/api/v1/geo/regiones')
            .then(setRegiones)
            .catch(err => console.error('No se pudieron cargar las regiones:', err));
    }, []);

    // Las comunas de la región elegida. Si la comuna guardada (un borrador)
    // está entre ellas, se completa su id.
    useEffect(() => {
        const region = regiones.find(r => mismo(r.nombre, datos.region) || String(r.id) === String(datos.region));
        if (!region) { setComunas([]); return; }
        get(`/api/v1/geo/regiones/${region.id}/comunas`)
            .then(data => {
                const lista = Array.isArray(data) ? data : [];
                setComunas(lista);
                const elegida = lista.find(c => mismo(c.nombre, datos.comuna) || String(c.id) === String(datos.comuna_id));
                if (elegida && elegida.id !== datos.comuna_id) cambiar({ comuna: elegida.nombre, comuna_id: elegida.id });
            })
            .catch(err => console.error('No se pudieron cargar las comunas:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datos.region, regiones]);

    return (
        <>
            <div className="form-group">
                <label htmlFor="contacto-entrega"><MapPin size={16} /> Tipo de Entrega *</label>
                <select id="contacto-entrega" value={datos.entrega} onChange={e => cambiar({ entrega: e.target.value })}>
                    {OPCIONES_ENTREGA.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                </select>
            </div>

            {retiro ? (
                <div className="form-group">
                    <p className="contacto-aviso contacto-aviso--info">
                        📍 <strong>Retiro presencial en Tienda / Taller en San Carlos, Región de Ñuble.</strong> Te contactaremos por WhatsApp con la dirección exacta y horarios disponibles para la entrega.
                    </p>
                </div>
            ) : (
                <>
                    <div className="form-group">
                        <label htmlFor="contacto-transporte"><Truck size={16} /> Método de Envío *</label>
                        <select id="contacto-transporte" value={datos.transporte} onChange={e => cambiar({ transporte: e.target.value })}>
                            {metodosEnvio.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="form-row--dos">
                        <div className="form-group">
                            <label htmlFor="contacto-region"><MapPin size={16} /> Región</label>
                            <select
                                id="contacto-region"
                                value={datos.region}
                                onChange={e => cambiar({ region: e.target.value, comuna: '', comuna_id: '' })}
                            >
                                <option value="">Selecciona una región</option>
                                {regiones.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="contacto-comuna"><MapPin size={16} /> Comuna</label>
                            <select
                                id="contacto-comuna"
                                value={datos.comuna || ''}
                                disabled={!datos.region}
                                onChange={e => {
                                    const elegida = comunas.find(c => c.nombre === e.target.value);
                                    cambiar({ comuna: e.target.value, comuna_id: elegida ? elegida.id : '' });
                                }}
                            >
                                <option value="">Selecciona una comuna</option>
                                {comunas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    {datos.entrega === 'SUCURSAL' ? (
                        <div className="form-group">
                            <p className="contacto-aviso">
                                Retiras en una sucursal de <strong>{datos.transporte}</strong>. Coordinarás la sucursal exacta por WhatsApp según tu comuna.
                            </p>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="contacto-direccion"><MapPin size={16} /> Dirección (Opcional)</label>
                            <input
                                id="contacto-direccion"
                                type="text"
                                placeholder="Calle, número..."
                                value={datos.direccion}
                                onChange={e => cambiar({ direccion: e.target.value })}
                            />
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default CamposEntrega;
