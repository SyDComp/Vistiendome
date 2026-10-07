import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';

const clave = (texto) => texto.trim().toLocaleLowerCase('es');

/**
 * Editar una lista de opciones: agregar, renombrar, ordenar y quitar.
 *
 * Los cambios se juntan en un borrador y se guardan de una vez: así una
 * edición a medias no queda guardada, y "Descartar" vuelve a lo que había.
 */
const EditorOpciones = ({ id, opciones, onGuardar, aviso }) => {
    const [borrador, setBorrador] = useState(opciones);
    const [nueva, setNueva] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { setBorrador(opciones); }, [opciones]);

    const limpias = borrador.map(o => o.trim()).filter(Boolean);
    const conteo = new Map();
    limpias.forEach(o => conteo.set(clave(o), (conteo.get(clave(o)) || 0) + 1));
    const repetidas = new Set([...conteo].filter(([, n]) => n > 1).map(([k]) => k));
    const cambio = JSON.stringify(limpias) !== JSON.stringify(opciones);
    const problema = !limpias.length
        ? 'Tiene que quedar al menos una opción.'
        : repetidas.size ? 'Hay opciones repetidas.' : null;

    const editar = (i, valor) => setBorrador(b => b.map((o, j) => (j === i ? valor : o)));
    const quitar = (i) => setBorrador(b => b.filter((_, j) => j !== i));
    const mover = (i, d) => setBorrador(b => {
        const copia = [...b];
        [copia[i], copia[i + d]] = [copia[i + d], copia[i]];
        return copia;
    });
    const agregar = (e) => {
        e.preventDefault();
        if (!nueva.trim()) return;
        setBorrador(b => [...b, nueva.trim()]);
        setNueva('');
    };

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            await onGuardar(limpias);
        } catch (err) {
            setError(err?.message || 'No se pudo guardar.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="aj-editor">
            <ul className="aj-lista">
                {borrador.map((opcion, i) => (
                    <li key={i} className="aj-opcion">
                        <input
                            className={repetidas.has(clave(opcion)) ? 'aj-campo aj-campo--error' : 'aj-campo'}
                            value={opcion}
                            onChange={e => editar(i, e.target.value)}
                            maxLength={60}
                            aria-label={`Opción ${i + 1}`}
                        />
                        <button type="button" className="aj-icono" onClick={() => mover(i, -1)} disabled={i === 0}
                            aria-label={`Subir "${opcion}"`} title="Subir"><ArrowUp size={16} /></button>
                        <button type="button" className="aj-icono" onClick={() => mover(i, 1)} disabled={i === borrador.length - 1}
                            aria-label={`Bajar "${opcion}"`} title="Bajar"><ArrowDown size={16} /></button>
                        <button type="button" className="aj-icono aj-icono--quitar" onClick={() => quitar(i)}
                            aria-label={`Quitar "${opcion}"`} title="Quitar"><Trash2 size={16} /></button>
                    </li>
                ))}
            </ul>

            <form className="aj-agregar" onSubmit={agregar}>
                <label htmlFor={`${id}-nueva`} className="aj-oculto">Nueva opción</label>
                <input id={`${id}-nueva`} className="aj-campo" value={nueva} onChange={e => setNueva(e.target.value)}
                    placeholder="Nueva opción…" maxLength={60} />
                <button type="submit" className="aj-boton" disabled={!nueva.trim()}>
                    <Plus size={16} /> Agregar
                </button>
            </form>

            {aviso && <p className="aj-nota">{aviso}</p>}
            {(problema || error) && <p className="aj-error" role="alert">{error || problema}</p>}

            <div className="aj-acciones">
                <button type="button" className="aj-boton" onClick={() => { setBorrador(opciones); setError(null); }}
                    disabled={!cambio || guardando}>
                    Descartar cambios
                </button>
                <button type="button" className="aj-boton aj-boton--principal" onClick={guardar}
                    disabled={!cambio || !!problema || guardando}>
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    );
};

export default EditorOpciones;
