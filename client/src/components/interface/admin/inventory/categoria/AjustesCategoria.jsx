import React from 'react';
import useOpcionesAbastecimiento from '../../../../../hooks/useOpcionesAbastecimiento';
import './AjustesCategoria.css';

const SI_NO = [{ valor: 'si', texto: 'Sí, acepta personalizaciones' }, { valor: 'no', texto: 'No: solo lo que existe en el catálogo' }];
const aSelect = (v) => (v === true ? 'si' : v === false ? 'no' : '');
const deSelect = (v) => (v === 'si' ? true : v === 'no' ? false : null);

/**
 * Los dos ajustes de una categoría al crearla o editarla.
 *
 * Una subcategoría puede quedar "igual que" su padre (se ve qué vale eso). Una
 * principal no: tiene que elegir, para que no quede un valor puesto en silencio.
 *
 * `padre`: la categoría padre tal como viene de la lista (con sus valores en
 * efecto), o null si es principal.
 */
const AjustesCategoria = ({ abastecimiento, acepta, padre, onChange }) => {
    const { opciones, error } = useOpcionesAbastecimiento();

    const primeraAbast = padre
        ? { valor: '', texto: `Igual que ${padre.name} (${padre.abastecimiento_texto})`, deshabilitada: false }
        : { valor: '', texto: '— Elige —', deshabilitada: true };
    const primeraAcepta = padre
        ? { valor: '', texto: `Igual que ${padre.name} (${padre.acepta_personalizacion_efectiva ? 'Sí' : 'No'})`, deshabilitada: false }
        : { valor: '', texto: '— Elige —', deshabilitada: true };

    return (
        <div className="ajc">
            <div className="ajc-campo">
                <label htmlFor="ajc-abastecimiento" className="ajc-rotulo">
                    Cuando no hay en bodega{!padre && ' *'}
                </label>
                {error ? <p className="ajc-error" role="alert">{error}</p> : (
                    <select id="ajc-abastecimiento" className="ajc-select" value={abastecimiento || ''}
                        onChange={e => onChange({ abastecimiento: e.target.value || null })}>
                        <option value="" disabled={primeraAbast.deshabilitada}>{primeraAbast.texto}</option>
                        {opciones.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                    </select>
                )}
            </div>

            <div className="ajc-campo">
                <label htmlFor="ajc-acepta" className="ajc-rotulo">
                    ¿Acepta personalizaciones?{!padre && ' *'}
                </label>
                <select id="ajc-acepta" className="ajc-select" value={aSelect(acepta)}
                    onChange={e => onChange({ acepta_personalizacion: deSelect(e.target.value) })}>
                    <option value="" disabled={primeraAcepta.deshabilitada}>{primeraAcepta.texto}</option>
                    {SI_NO.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                </select>
                <p className="ajc-ayuda">
                    Si no acepta, en el formulario de Contacto la clienta solo elige entre lo que existe:
                    no puede proponer colores ni características nuevas.
                </p>
            </div>
        </div>
    );
};

export default AjustesCategoria;
