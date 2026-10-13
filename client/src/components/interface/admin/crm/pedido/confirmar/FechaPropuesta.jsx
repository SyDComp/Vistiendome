import React from 'react';
import { hoyIso, textoPlazo } from '../../../../../../utils/fechaComprometida';

/**
 * La fecha comprometida al confirmar: viene propuesta por el plazo habitual
 * (Ajustes del negocio) y se puede cambiar. Si la clienta dijo una fecha de
 * evento, se muestra al lado: es texto libre ("Aniversario en noviembre") y el
 * sistema no la puede leer como fecha.
 */
const FechaPropuesta = ({ fecha, propuesta, fechaEvento, onCambiar, disabled }) => (
    <div className="cfp-nota">
        <label htmlFor="cfp-fecha">¿Para cuándo estará listo? (fecha comprometida)</label>
        <input id="cfp-fecha" type="date" className="sp-select cfp-fecha" value={fecha || ''} min={hoyIso()}
            onChange={e => onCambiar(e.target.value || null)} disabled={disabled} />
        {propuesta?.plazo_dias != null && (
            <span className="cfp-ayuda">Plazo habitual: {textoPlazo(propuesta.plazo_dias, propuesta.plazo_por)}.</span>
        )}
        {fechaEvento && <span className="cfp-ayuda cfp-ayuda--evento">La clienta dijo: «{fechaEvento}».</span>}
    </div>
);

export default FechaPropuesta;
