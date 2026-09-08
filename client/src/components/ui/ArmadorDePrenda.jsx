import React, { useState, useMemo } from 'react';
import { Plus, X, Sliders } from 'lucide-react';

/**
 * Armar una pieza que NO está en el catálogo, igual que se arma una variante.
 *
 * LA REGLA
 * Se elige, no se escribe. Las características son las MISMAS del catálogo y no
 * se pueden inventar nuevas: si el catálogo tiene TALLA, COLOR y CUELLO, eso es
 * lo que hay. Lo que sí se puede es proponer un VALOR nuevo dentro de una
 * característica que ya existe —un color que todavía no está cargado—, porque
 * un encargo especial es justamente eso.
 *
 * POR QUÉ TAN POCO TEXTO LIBRE
 * Antes esto eran dos prompt() —nombre y precio— y la pieza entraba como texto
 * suelto, sin talla ni color: llegaba a la orden de corte sin nada con que
 * confeccionarla. Y cada quien escribía "azul", "Azul", "AZUL MARINO": tres
 * cosas distintas para el sistema, la misma tela en el taller.
 *
 * Ahora la prenda sale de una lista y cada característica de un desplegable.
 * Escribir queda como excepción marcada, no como la forma normal de trabajar.
 */

const OTRO = '__OTRO__';

// El mismo armador se usa en dos lados y NO lo lee la misma persona: en la web
// es la clienta pidiendo su prenda, en el panel es el taller armando el pedido.
// Decirle a quien aprueba que "revisaremos su propuesta" no tiene sentido.
//
// El servidor decide SI el valor sirve; cómo se le cuenta eso a cada uno es
// decision de la pantalla, que es la unica que sabe quien esta mirando.
const TEXTOS_POR_PUBLICO = {
    publico: {
        ok: 'Lo tendremos en cuenta: revisaremos esta opción antes de confirmar tu pedido.',
    },
    panel: {
        ok: 'Es una opción nueva: queda registrada como propuesta para aprobarla después.',
    },
};

const ArmadorDePrenda = ({ atributos = {}, productos = [], mostrarPrecio = true, textoBoton = "Agregar al pedido", contexto = 'publico', onAgregar, onCancelar }) => {
    const [prenda, setPrenda] = useState('');
    const [prendaLibre, setPrendaLibre] = useState('');
    const [precio, setPrecio] = useState('');
    const [config, setConfig] = useState({});
    // Qué características están en modo "valor nuevo", y qué se escribió en cada una.
    const [propuestos, setPropuestos] = useState({});
    // Qué dijo el servidor de cada valor propuesto: si es una grosería, si se
    // parece a uno que ya existe, o si está bien. Se pregunta al salir del
    // campo, no en cada tecla.
    const [revisiones, setRevisiones] = useState({});
    // Características que la prenda no trae y el cliente decidió sumarle.
    // Puede agregar cualquiera que EXISTA en el sistema; lo que no puede es
    // inventar una nueva.
    const [agregadas, setAgregadas] = useState([]);
    // Características de la prenda que el cliente decidió NO precisar. Un
    // encargo especial puede ignorar el largo del modelo original.
    const [quitadas, setQuitadas] = useState([]);
    // Búsqueda para sumar una característica. Un desplegable plano sirve con
    // seis; con doscientas es inservible, y el catálogo crece.
    const [buscando, setBuscando] = useState('');
    const [abriendoSelector, setAbriendoSelector] = useState(false);

    const etiqueta = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' };
    const campo = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' };
    const campoNuevo = { ...campo, border: '1px solid #c026d3', background: '#fdf4ff', marginTop: '6px' };

    const nombreFinal = (prenda === OTRO ? prendaLibre : prenda).trim();

    const elegir = (clave, valor) => {
        if (valor === OTRO) {
            setPropuestos(p => ({ ...p, [clave]: '' }));
            setConfig(c => { const n = { ...c }; delete n[clave]; return n; });
            return;
        }
        setPropuestos(p => { const n = { ...p }; delete n[clave]; return n; });
        setConfig(c => {
            const n = { ...c };
            if (valor) n[clave] = valor; else delete n[clave];
            return n;
        });
    };

    // Lo escribe cualquiera desde internet, así que se revisa antes de dejarlo
    // entrar: una grosería no llega a la bandeja de nadie, y un tipeo se le
    // pregunta a quien escribió en vez de corregirlo por él.
    const revisar = async (clave, valor) => {
        const limpio = (valor || '').trim();
        if (!limpio) { setRevisiones(r => { const n = { ...r }; delete n[clave]; return n; }); return; }
        try {
            const res = await fetch('/api/v1/propuestas/revisar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caracteristica: clave, valor: limpio }),
            });
            if (!res.ok) return;
            const r = await res.json();
            setRevisiones(prev => ({ ...prev, [clave]: r }));
            // Lo ofensivo no se guarda: se saca de la selección en el acto.
            if (r.veredicto === 'ofensivo') {
                setConfig(cfg => { const n = { ...cfg }; delete n[clave]; return n; });
            }
        } catch { /* sin red se deja pasar: el servidor revisa igual al guardar */ }
    };

    const escribirPropuesto = (clave, texto) => {
        setPropuestos(p => ({ ...p, [clave]: texto }));
        setRevisiones(r => { const n = { ...r }; delete n[clave]; return n; });
        setConfig(c => {
            const n = { ...c };
            const limpio = texto.trim();
            if (limpio) n[clave] = limpio; else delete n[clave];
            return n;
        });
    };

    const aceptarSugerencia = (clave, valor) => {
        setPropuestos(p => { const n = { ...p }; delete n[clave]; return n; });
        setRevisiones(r => { const n = { ...r }; delete n[clave]; return n; });
        setConfig(c => ({ ...c, [clave]: valor }));
    };

    // Las características son LAS DE ESA PRENDA, no las del catálogo entero.
    //
    // Un Vestido Noemi tiene LARGO; un Tapado no. Mostrar las siete del
    // catálogo obligaba a la clienta a ignorar las que no vienen al caso, y
    // dejaba elegir un largo para una prenda que no lo tiene.
    //
    // Se derivan de las variantes del producto: el producto ya sabe qué
    // características tiene, no hay que preguntárselo a nadie.
    const atributosDeLaPrenda = useMemo(() => {
        if (!prenda) return {};
        // Prenda que no existe en el catálogo: no hay de dónde derivarlas, y
        // volcarlas TODAS de golpe es peor que no mostrar ninguna — obliga a
        // recorrer una lista entera para encontrar las dos que interesan.
        // Se empieza en blanco y se agregan las que hagan falta.
        if (prenda === OTRO) return {};

        const producto = productos.find(x => x.name === prenda);
        if (!producto) return atributos;

        const porClave = {};
        (producto.variants || []).forEach(v => {
            Object.entries(v.config || {}).forEach(([k, val]) => {
                if (!val) return;
                if (!porClave[k]) porClave[k] = new Set();
                porClave[k].add(String(val));
            });
        });
        return Object.fromEntries(Object.entries(porClave).map(([k, set]) => [k, [...set]]));
    }, [prenda, productos, atributos]);

    // Lo que se ve: las de la prenda, más las que el cliente sumó.
    //
    // Una prenda trae sus características, pero un encargo especial puede
    // necesitar otra que el catálogo tiene y ese producto no usa — pedir un
    // tapado con un LARGO distinto, por ejemplo. Eso se permite; crear una
    // característica que no existe, no.
    const visibles = useMemo(() => {
        const base = { ...atributosDeLaPrenda };
        agregadas.forEach(k => { if (!base[k]) base[k] = atributos[k] || []; });
        quitadas.forEach(k => { delete base[k]; });
        return base;
    }, [atributosDeLaPrenda, agregadas, quitadas, atributos]);

    const quitar = (clave) => {
        setQuitadas(q => [...q, clave]);
        setAgregadas(a => a.filter(k => k !== clave));
        setConfig(c => { const n = { ...c }; delete n[clave]; return n; });
        setPropuestos(p => { const n = { ...p }; delete n[clave]; return n; });
        setRevisiones(r => { const n = { ...r }; delete n[clave]; return n; });
    };

    const claves = Object.keys(visibles);
    // Las que existen en el sistema y todavía no están puestas.
    const disponiblesParaAgregar = Object.keys(atributos).filter(k => !claves.includes(k));
    const deLaPrenda = Object.keys(atributosDeLaPrenda);
    const totalCaracteristicas = Object.keys(atributos).length;
    // Todas las del sistema, filtradas por lo que se escriba. El cliente marca
    // y desmarca; lo que no puede es crear una que no exista.
    const listaSelector = useMemo(() => {
        const q = buscando.trim().toLowerCase();
        const todas = Object.keys(atributos);
        return q ? todas.filter(k => k.toLowerCase().includes(q)) : todas;
    }, [buscando, atributos]);

    const agregar_caracteristica = (k) => {
        setQuitadas(q => q.filter(x => x !== k));
        setAgregadas(a => (a.includes(k) ? a : [...a, k]));
    };
    // Con una grosería sin corregir no se agrega nada.
    const hayBloqueo = Object.values(revisiones).some(r => r?.veredicto === 'ofensivo');

    const agregar = () => {
        if (!nombreFinal) return;
        // Lo propuesto se informa aparte: para el taller no es lo mismo un color
        // del catálogo —que se corta con tela que hay— que uno que hay que
        // conseguir antes de prometer una fecha.
        const propuestosLimpios = {};
        Object.keys(propuestos).forEach(clave => {
            const v = (propuestos[clave] || '').trim();
            if (v) propuestosLimpios[clave] = v;
        });

        onAgregar({
            nombre: nombreFinal,
            precio: parseFloat(precio) || 0,
            // Sólo lo elegido. Una característica en blanco no se guarda:
            // "sin especificar" y "no aplica" no son lo mismo para quien corta.
            config,
            propuestos: Object.keys(propuestosLimpios).length ? propuestosLimpios : null,
        });
    };

    return (
        <div style={{ border: '1px solid #f0abfc', background: '#fdf4ff', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ fontSize: '13px', color: '#86198f' }}>Pieza personalizada</strong>
                <button type="button" onClick={onCancelar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    <X size={16} />
                </button>
            </div>
            <p style={{ fontSize: '11.5px', color: '#86198f', margin: '0 0 12px', opacity: 0.85 }}>
                Se arma igual que una variante del catálogo. Si algo no está en la lista,
                se puede proponer con Otro.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={etiqueta}>Prenda *</label>
                    <select style={campo} value={prenda} onChange={e => {
                        // Lo elegido era de la prenda anterior: un largo de vestido no
                        // significa nada en un tapado.
                        setPrenda(e.target.value);
                        setConfig({});
                        setPropuestos({});
                        setRevisiones({});
                        setAgregadas([]);
                        setQuitadas([]);
                        setBuscando('');
                    }}>
                        <option value="">— elige la prenda —</option>
                        {productos.map(p => <option key={p.id ?? p.name} value={p.name}>{p.name}</option>)}
                        <option value={OTRO}>Otra (escribirla)</option>
                    </select>
                    {prenda === OTRO && (
                        <input
                            style={campoNuevo} value={prendaLibre} onChange={e => setPrendaLibre(e.target.value)}
                            placeholder="Ej: Vestido de novia a medida" autoFocus
                        />
                    )}
                </div>

                {/* El precio lo pone quien vende, no quien pide: en la web este
                    campo no existe. */}
                {mostrarPrecio && (
                    <div>
                        <label style={etiqueta}>Precio unitario ($)</label>
                        <input type="number" min="0" style={campo} value={precio}
                            onChange={e => setPrecio(e.target.value)} placeholder="25000" />
                    </div>
                )}

                {claves.map(clave => {
                    const enModoNuevo = clave in propuestos;
                    return (
                        <div key={clave}>
                            <label style={{ ...etiqueta, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{clave}</span>
                                {/* Se puede quitar: si el encargo no necesita precisar
                                    esta característica, no tiene por qué ocupar espacio
                                    ni obligar a elegir. Vuelve con «agregar». */}
                                <button type="button" onClick={() => quitar(clave)}
                                    title={`Quitar ${clave}`}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                             color: '#94a3b8', display: 'flex' }}>
                                    <X size={13} />
                                </button>
                            </label>
                            <select
                                style={campo}
                                value={enModoNuevo ? OTRO : (config[clave] || '')}
                                onChange={e => elegir(clave, e.target.value)}
                            >
                                <option value="">— sin especificar —</option>
                                {(visibles[clave] || []).map(v => <option key={v} value={v}>{v}</option>)}
                                <option value={OTRO}>Otro (proponer)</option>
                            </select>
                            {enModoNuevo && (
                                <>
                                    <input
                                        style={{
                                            ...campoNuevo,
                                            borderColor: revisiones[clave]?.veredicto === 'ofensivo' ? '#dc2626' : campoNuevo.border,
                                        }}
                                        value={propuestos[clave]}
                                        onChange={e => escribirPropuesto(clave, e.target.value)}
                                        onBlur={e => revisar(clave, e.target.value)}
                                        placeholder={`${clave} que necesitas`}
                                        autoFocus
                                    />
                                    {revisiones[clave] && (
                                        <p style={{
                                            margin: '5px 0 0', fontSize: '11.5px', lineHeight: 1.35,
                                            color: revisiones[clave].veredicto === 'ofensivo' ? '#dc2626'
                                                 : revisiones[clave].veredicto === 'ok' ? '#15803d' : '#a16207',
                                        }}>
                                            {TEXTOS_POR_PUBLICO[contexto]?.[revisiones[clave].veredicto]
                                                || revisiones[clave].mensaje}
                                            {revisiones[clave].sugerencia && (
                                                <button type="button"
                                                    onClick={() => aceptarSugerencia(clave, revisiones[clave].sugerencia)}
                                                    style={{ marginLeft: '6px', background: 'none', border: 'none', padding: 0,
                                                             color: '#8f0653', fontWeight: '700', fontSize: '11.5px',
                                                             textDecoration: 'underline', cursor: 'pointer' }}>
                                                    usar «{revisiones[clave].sugerencia}»
                                                </button>
                                            )}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {prenda && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #e9d5ff' }}>
                    <button type="button" onClick={() => setAbriendoSelector(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%',
                                 justifyContent: 'center', padding: '10px', borderRadius: '10px',
                                 border: '1.5px solid #c026d3', background: '#fff', color: '#86198f',
                                 fontWeight: '800', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Sliders size={15} />
                        Seleccionar características
                        <span style={{ fontWeight: 600, opacity: .75 }}>({claves.length} de {totalCaracteristicas})</span>
                    </button>

                    {abriendoSelector && (
                        <div style={{ marginTop: '10px', border: '1px solid #e9d5ff', borderRadius: '10px', background: '#fff', padding: '10px' }}>
                            {/* Buscador sólo cuando hay tantas que recorrerlas cansa.
                                Con seis, estorba. */}
                            {totalCaracteristicas > 8 && (
                                <input
                                    style={{ ...campo, marginBottom: '8px' }}
                                    value={buscando}
                                    onChange={e => setBuscando(e.target.value)}
                                    placeholder="Buscar característica…"
                                />
                            )}

                            <div style={{ maxHeight: '210px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {listaSelector.map(k => {
                                    const puesta = claves.includes(k);
                                    return (
                                        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '9px',
                                                                padding: '7px 8px', borderRadius: '8px', cursor: 'pointer',
                                                                background: puesta ? '#fdf4ff' : 'transparent', fontSize: '13px' }}>
                                            <input
                                                type="checkbox"
                                                checked={puesta}
                                                onChange={() => (puesta ? quitar(k) : agregar_caracteristica(k))}
                                                style={{ accentColor: '#8f0653', width: '15px', height: '15px' }}
                                            />
                                            <span style={{ color: '#1e1b4b', fontWeight: puesta ? 700 : 500 }}>{k}</span>
                                            {deLaPrenda.includes(k) && (
                                                <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: '#94a3b8' }}>
                                                    de esta prenda
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                                {!listaSelector.length && (
                                    <span style={{ fontSize: '12px', color: '#94a3b8', padding: '6px' }}>
                                        No hay ninguna con ese nombre.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {prenda && !claves.length && (
                <p style={{ fontSize: '12px', color: '#a16207', margin: '10px 0 0' }}>
                    Esta prenda no tiene características cargadas. Se puede pedir igual,
                    pero llegará al taller sin talla ni color.
                </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <button type="button" onClick={onCancelar}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>
                    Cancelar
                </button>
                <button type="button" onClick={agregar} disabled={!nombreFinal || hayBloqueo}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                             background: (nombreFinal && !hayBloqueo) ? '#8f0653' : '#e2e8f0',
                             color: (nombreFinal && !hayBloqueo) ? '#fff' : '#94a3b8',
                             fontWeight: '700', fontSize: '13px',
                             cursor: (nombreFinal && !hayBloqueo) ? 'pointer' : 'not-allowed' }}>
                    <Plus size={14} /> {textoBoton}
                </button>
            </div>
        </div>
    );
};

export default ArmadorDePrenda;
