import React, { useState, useMemo } from 'react';
import { Plus, X, Sliders } from 'lucide-react';
import './ArmadorDePrenda.css';

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

const ArmadorDePrenda = ({ atributos = {}, productos = [], mostrarPrecio = true, textoBoton = "Agregar al pedido", contexto = 'publico', enmarcado = false, onAgregar, onCancelar }) => {
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

    const nombreFinal = (prenda === OTRO ? prendaLibre : prenda).trim();

    // Si la categoría del producto no acepta personalizaciones, en la tienda
    // la clienta solo elige entre lo que existe: sin proponer valores ni
    // agregar o quitar características. En el panel no aplica: ahí arma la
    // pieza quien decide.
    const productoElegido = prenda && prenda !== OTRO ? productos.find(x => x.name === prenda) : null;
    const soloCatalogo = contexto === 'publico' && productoElegido?.acepta_personalizacion === false;

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

        // De qué producto del catálogo es (productoElegido): con eso el servidor
        // sabe su categoría y, si lo elegido coincide exacto con una variante,
        // que ES esa variante. "Otra" no tiene producto.
        const monto = parseFloat(precio);

        onAgregar({
            nombre: nombreFinal,
            productoId: productoElegido?.id ?? null,
            // Vacío no es cero: es "por cotizar".
            precio: monto > 0 ? monto : null,
            // Sólo lo elegido. Una característica en blanco no se guarda:
            // "sin especificar" y "no aplica" no son lo mismo para quien corta.
            config,
            propuestos: Object.keys(propuestosLimpios).length ? propuestosLimpios : null,
        });
    };

    return (
        <div className={`armador${enmarcado ? ' armador--tarjeta' : ''}`}>
            <div className="armador__cabecera">
                <strong className="armador__titulo">Pieza personalizada</strong>
                <button type="button" onClick={onCancelar} className="armador__cerrar">
                    <X size={16} />
                </button>
            </div>
            <p className="armador__intro">
                {soloCatalogo
                    ? 'Este producto se pide tal como está en el catálogo: elige entre las opciones que tiene.'
                    : 'Se arma igual que una variante del catálogo. Si algo no está en la lista, se puede proponer con Otro.'}
            </p>

            <div className="armador__grilla">
                <div className="armador__ancho-total">
                    <label className="armador__etiqueta">Prenda *</label>
                    <select className="armador__campo" value={prenda} onChange={e => {
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
                            className="armador__campo armador__campo--nuevo"
                            value={prendaLibre} onChange={e => setPrendaLibre(e.target.value)}
                            placeholder="Ej: Vestido de novia a medida" autoFocus
                        />
                    )}
                </div>

                {/* El precio lo pone quien vende, no quien pide: en la web este
                    campo no existe. */}
                {mostrarPrecio && (
                    <div>
                        <label className="armador__etiqueta">Precio unitario ($)</label>
                        <input type="number" min="0" className="armador__campo" value={precio}
                            onChange={e => setPrecio(e.target.value)} placeholder="25000" />
                    </div>
                )}

                {claves.map(clave => {
                    const enModoNuevo = clave in propuestos;
                    const veredicto = revisiones[clave]?.veredicto;
                    return (
                        <div key={clave}>
                            <label className="armador__etiqueta armador__etiqueta--con-boton">
                                <span>{clave}</span>
                                {/* Se puede quitar: si el encargo no necesita precisar
                                    esta característica, no tiene por qué ocupar espacio
                                    ni obligar a elegir. Vuelve con «agregar». */}
                                {!soloCatalogo && (
                                    <button type="button" onClick={() => quitar(clave)}
                                        title={`Quitar ${clave}`} className="armador__quitar">
                                        <X size={13} />
                                    </button>
                                )}
                            </label>
                            <select
                                className="armador__campo"
                                value={enModoNuevo ? OTRO : (config[clave] || '')}
                                onChange={e => elegir(clave, e.target.value)}
                            >
                                <option value="">— sin especificar —</option>
                                {(visibles[clave] || []).map(v => <option key={v} value={v}>{v}</option>)}
                                {!soloCatalogo && <option value={OTRO}>Otro (proponer)</option>}
                            </select>
                            {enModoNuevo && (
                                <>
                                    <input
                                        className={`armador__campo armador__campo--nuevo${veredicto === 'ofensivo' ? ' armador__campo--rechazado' : ''}`}
                                        value={propuestos[clave]}
                                        onChange={e => escribirPropuesto(clave, e.target.value)}
                                        onBlur={e => revisar(clave, e.target.value)}
                                        placeholder={`${clave} que necesitas`}
                                        autoFocus
                                    />
                                    {revisiones[clave] && (
                                        <p className={`armador__aviso armador__aviso--${veredicto === 'ofensivo' ? 'ofensivo' : veredicto === 'ok' ? 'ok' : 'duda'}`}>
                                            {TEXTOS_POR_PUBLICO[contexto]?.[veredicto]
                                                || revisiones[clave].mensaje}
                                            {revisiones[clave].sugerencia && (
                                                <button type="button"
                                                    onClick={() => aceptarSugerencia(clave, revisiones[clave].sugerencia)}
                                                    className="armador__usar-sugerencia">
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

            {prenda && !soloCatalogo && (
                <div className="armador__caracteristicas">
                    <button type="button" onClick={() => setAbriendoSelector(v => !v)}
                        className="armador__boton-selector">
                        <Sliders size={15} />
                        Seleccionar características
                        <span className="armador__cuenta">({claves.length} de {totalCaracteristicas})</span>
                    </button>

                    {abriendoSelector && (
                        <div className="armador__selector">
                            {/* Buscador sólo cuando hay tantas que recorrerlas cansa.
                                Con seis, estorba. */}
                            {totalCaracteristicas > 8 && (
                                <input
                                    className="armador__campo armador__campo--buscador"
                                    value={buscando}
                                    onChange={e => setBuscando(e.target.value)}
                                    placeholder="Buscar característica…"
                                />
                            )}

                            <div className="armador__lista">
                                {listaSelector.map(k => {
                                    const puesta = claves.includes(k);
                                    return (
                                        <label key={k} className={`armador__opcion${puesta ? ' armador__opcion--puesta' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={puesta}
                                                onChange={() => (puesta ? quitar(k) : agregar_caracteristica(k))}
                                                className="armador__casilla"
                                            />
                                            <span className="armador__opcion-nombre">{k}</span>
                                            {deLaPrenda.includes(k) && (
                                                <span className="armador__origen">de esta prenda</span>
                                            )}
                                        </label>
                                    );
                                })}
                                {!listaSelector.length && (
                                    <span className="armador__vacio">No hay ninguna con ese nombre.</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {prenda && !claves.length && (
                <p className="armador__sin-caracteristicas">
                    Esta prenda no tiene características cargadas. Se puede pedir igual,
                    pero llegará al taller sin talla ni color.
                </p>
            )}

            <div className="armador__pie">
                <button type="button" onClick={onCancelar} className="armador__cancelar">
                    Cancelar
                </button>
                <button type="button" onClick={agregar} disabled={!nombreFinal || hayBloqueo}
                    className="armador__agregar">
                    <Plus size={14} /> {textoBoton}
                </button>
            </div>
        </div>
    );
};

export default ArmadorDePrenda;
