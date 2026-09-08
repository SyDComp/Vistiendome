import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Users } from 'lucide-react';
import { useNotification } from '../../../../context/NotificationContext';

/**
 * Lo que los clientes pidieron y todavía no existe en el catálogo.
 *
 * Ordenadas por cuántas personas piden lo mismo, no por fecha: lo que sirve
 * para decidir si vale la pena conseguir una tela nueva es cuánta gente la
 * quiere, no cuál llegó primero.
 *
 * Aprobar sube la opción al catálogo como una opción propia, indistinguible de
 * las que se crean a mano. Rechazar no borra: si vuelven a pedirla, hay que
 * poder ver que ya se dijo que no.
 */
const PropuestasView = () => {
    const { toast } = useNotification();
    const [propuestas, setPropuestas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [estado, setEstado] = useState('PENDIENTE');
    // Los datos que el cliente no podía dar (el hex de un color), por propuesta.
    const [datos, setDatos] = useState({});

    const cabeceras = useCallback(() => {
        const token = localStorage.getItem('admin_token');
        return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    }, []);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const res = await fetch(`/api/v1/propuestas/?estado=${estado}`, { headers: cabeceras() });
            setPropuestas(res.ok ? await res.json() : []);
        } catch {
            setPropuestas([]);
        } finally {
            setCargando(false);
        }
    }, [estado, cabeceras]);

    useEffect(() => { cargar(); }, [cargar]);

    const clave = (p) => `${p.attribute_id}|${p.valor_normalizado}`;

    const resolver = async (p, accion) => {
        const faltan = (p.campos_faltantes || []).filter(c => !(datos[clave(p)] || {})[c.key]);
        if (accion === 'aprobar' && faltan.length) {
            // Aprobar un color sin su código lo deja gris en toda la tienda.
            toast.error(`Completa ${faltan.map(f => f.label).join(' y ')} antes de aprobar.`, 'Falta un dato');
            return;
        }
        try {
            const res = await fetch(`/api/v1/propuestas/${accion}`, {
                method: 'POST',
                headers: cabeceras(),
                body: JSON.stringify({
                    attribute_id: p.attribute_id,
                    valor_normalizado: p.valor_normalizado,
                    datos: datos[clave(p)] || null,
                }),
            });
            if (!res.ok) {
                const { detail } = await res.json().catch(() => ({}));
                toast.error(detail || 'No se pudo completar', 'Error');
                return;
            }
            toast.success(
                accion === 'aprobar'
                    ? `«${p.valor}» ya está disponible en ${p.caracteristica}`
                    : `«${p.valor}» quedó descartada`,
            );
            cargar();
        } catch {
            toast.error('No se pudo conectar con el servidor', 'Sin conexión');
        }
    };

    const escribirDato = (p, key, valor) => {
        setDatos(d => ({ ...d, [clave(p)]: { ...(d[clave(p)] || {}), [key]: valor } }));
    };

    return (
        <div className="propuestas-view">
            <div className="prop-encabezado">
                <div>
                    <h1>Lo que piden tus clientas</h1>
                    <p>
                        Opciones que alguien pidió y todavía no tienes. Aprobar una la agrega
                        a tu catálogo como cualquier otra que crees tú.
                    </p>
                </div>
                <div className="prop-filtros">
                    {[['PENDIENTE', 'Por revisar'], ['APROBADA', 'Aprobadas'], ['RECHAZADA', 'Descartadas']].map(([v, txt]) => (
                        <button key={v} type="button"
                            className={estado === v ? 'activo' : ''}
                            onClick={() => setEstado(v)}>
                            {txt}
                        </button>
                    ))}
                </div>
            </div>

            {cargando ? (
                <p className="prop-vacio">Cargando…</p>
            ) : !propuestas.length ? (
                <p className="prop-vacio">
                    {estado === 'PENDIENTE'
                        ? 'No hay nada por revisar. Cuando una clienta pida un color o una talla que no tienes, aparecerá acá.'
                        : 'No hay nada en esta lista.'}
                </p>
            ) : (
                <ul className="prop-lista">
                    {propuestas.map(p => (
                        <li key={clave(p)}>
                            <div className="prop-fila">
                                <div className="prop-datos">
                                    <span className="prop-carac">{p.caracteristica}</span>
                                    <strong className="prop-valor">{p.valor}</strong>
                                    <span className="prop-veces">
                                        <Users size={13} /> {p.veces === 1 ? '1 clienta' : `${p.veces} clientas`}
                                    </span>
                                </div>

                                {estado === 'PENDIENTE' && (
                                    <div className="prop-acciones">
                                        <button type="button" className="prop-si" onClick={() => resolver(p, 'aprobar')}>
                                            <Check size={14} /> Agregar a mi catálogo
                                        </button>
                                        <button type="button" className="prop-no" onClick={() => resolver(p, 'rechazar')}>
                                            <X size={14} /> Descartar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Un COLOR necesita su código; un ESTAMPADO, su imagen. La
                                clienta sólo pudo escribir el nombre. */}
                            {estado === 'PENDIENTE' && (p.campos_faltantes || []).length > 0 && (
                                <div className="prop-faltantes">
                                    {p.campos_faltantes.map(campo => (
                                        <label key={campo.key}>
                                            <span>{campo.label}</span>
                                            <input
                                                type={campo.type === 'color' ? 'color' : 'text'}
                                                value={(datos[clave(p)] || {})[campo.key] || (campo.type === 'color' ? '#cccccc' : '')}
                                                onChange={e => escribirDato(p, campo.key, e.target.value)}
                                                placeholder={campo.label}
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="prop-quienes">
                                Pedida por {p.proponentes.map((q, i) => (
                                    <span key={i}>
                                        {q.nombre || 'una clienta'}
                                        {q.pedido_numero ? ` (pedido N° ${q.pedido_numero})` : ''}
                                        {i < p.proponentes.length - 1 ? ', ' : ''}
                                    </span>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <style>{`
                .propuestas-view { padding: 4px; }
                .prop-encabezado { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
                .prop-encabezado h1 { margin:0 0 4px; font-size:22px; font-weight:900; color:#1e1b4b; }
                .prop-encabezado p { margin:0; font-size:13px; color:#64748b; max-width:520px; line-height:1.5; }
                .prop-filtros { display:flex; gap:6px; flex-wrap:wrap; }
                .prop-filtros button { border:1px solid #e2e8f0; background:#fff; color:#475569; border-radius:999px; padding:7px 14px; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; }
                .prop-filtros button.activo { background:#8f0653; border-color:#8f0653; color:#fff; }

                .prop-vacio { color:#64748b; font-size:13.5px; background:#f8fafc; border:1px dashed #e2e8f0; border-radius:12px; padding:26px; text-align:center; }

                .prop-lista { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
                .prop-lista li { border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; background:#fff; }
                .prop-fila { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; }
                .prop-datos { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
                .prop-carac { font-size:10.5px; font-weight:800; letter-spacing:.6px; color:#94a3b8; text-transform:uppercase; }
                .prop-valor { font-size:15px; color:#1e1b4b; }
                .prop-veces { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:800; color:#8f0653; background:#fdf2f8; border-radius:999px; padding:3px 9px; }

                .prop-acciones { display:flex; gap:8px; }
                .prop-acciones button { display:flex; align-items:center; gap:6px; border-radius:8px; padding:8px 13px; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; border:1px solid transparent; }
                .prop-si { background:#8f0653; color:#fff; }
                .prop-no { background:#fff; color:#64748b; border-color:#e2e8f0; }

                .prop-faltantes { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px dashed #e2e8f0; }
                .prop-faltantes label { display:flex; flex-direction:column; gap:4px; font-size:11px; font-weight:700; color:#475569; }
                .prop-faltantes input { border:1px solid #cbd5e1; border-radius:8px; padding:6px 9px; font-size:13px; min-width:150px; }
                .prop-faltantes input[type=color] { padding:2px; height:34px; min-width:56px; }

                .prop-quienes { margin-top:10px; font-size:11.5px; color:#94a3b8; }
            `}</style>
        </div>
    );
};

export default PropuestasView;
