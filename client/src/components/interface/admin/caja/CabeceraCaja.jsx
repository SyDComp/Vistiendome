import React from 'react';
import { ArrowDown, Keyboard, PenLine } from 'lucide-react';
import LogoVistiendome from '../../../ui/LogoVistiendome';
import { ATAJOS } from './teclado/useAtajosCaja';

/**
 * Arriba de la caja: en qué modo se está (siempre a la vista, para no escribir
 * una letra creyendo que es un atajo, ni al revés), las teclas, y volver al
 * panel (la caja baja y deja ver el panel).
 */
const CabeceraCaja = ({ modo, nombreCampo, onVolver }) => (
    <header className="cj-cabecera">
        <div className="cj-marca">
            <LogoVistiendome tamano="1.3rem" />
            <span>Caja</span>
        </div>
        <div className="cj-modo-zona">
            <span className={`cj-modo cj-modo--${modo}`} role="status">
                {modo === 'atajos'
                    ? <><Keyboard size={15} aria-hidden="true" /> Atajos</>
                    : <><PenLine size={15} aria-hidden="true" /> Escribiendo en {nombreCampo}</>}
            </span>
            <span className="cj-ayuda">
                <kbd>Esc</kbd> {modo === 'atajos' ? 'escribir' : 'atajos'}
                {modo === 'atajos' && ATAJOS.map(a => <span key={a.tecla}> · <kbd>{a.tecla}</kbd> {a.que}</span>)}
            </span>
        </div>
        <button type="button" className="cj-volver" onClick={onVolver}>
            Volver al panel <ArrowDown size={16} aria-hidden="true" />
        </button>
    </header>
);

export default CabeceraCaja;
