import React from 'react';
import { ArrowDown, Keyboard, Lock, PenLine } from 'lucide-react';
import LogoVistiendome from '../../../ui/LogoVistiendome';
import { ATAJOS } from './teclado/useAtajosCaja';

/**
 * Arriba de la caja: en qué modo se está (siempre a la vista, para no escribir
 * una letra creyendo que es un atajo, ni al revés), las teclas, y volver al
 * panel (la caja baja y deja ver el panel).
 *
 * En modo solo caja no hay "Volver al panel": salir pide la contraseña
 * (soloCaja/). Fuera de ese modo, "Solo caja" lo activa en este equipo.
 */
const CabeceraCaja = ({ modo, nombreCampo, onVolver, soloCaja, onSoloCaja }) => (
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
        {soloCaja ? (
            <button type="button" className="cj-volver" onClick={onVolver}>
                <Lock size={16} aria-hidden="true" /> Salir del modo caja
            </button>
        ) : (
            <div className="cj-salidas">
                <button type="button" className="cj-volver" onClick={onSoloCaja}
                    title="Deja este equipo solo con la caja; volver al panel pedirá la contraseña">
                    <Lock size={16} aria-hidden="true" /> Solo caja
                </button>
                <button type="button" className="cj-volver" onClick={onVolver}>
                    Volver al panel <ArrowDown size={16} aria-hidden="true" />
                </button>
            </div>
        )}
    </header>
);

export default CabeceraCaja;
