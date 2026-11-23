import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import AdminFormLayout, { AdminFormSubmit, AdminFormSection } from '../../../ui/admin/AdminFormLayout';
import { useNotification } from '../../../../context/NotificationContext';
import { cambiarMiClave, LARGO_MINIMO_CLAVE } from '../../../../lib/api/endpoints';
import { mensajeDeError } from '../../../../utils/errorServidor';

const VACIO = { actual: '', nueva: '', repetida: '' };

/** Lo que falta para poder guardar, o null. El servidor revisa lo mismo y además la actual. */
export const faltaParaCambiar = ({ actual, nueva, repetida }) => {
    if (!actual) return 'Escribe tu contraseña actual.';
    if (nueva.length < LARGO_MINIMO_CLAVE) return `La nueva debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
    if (nueva !== repetida) return 'La nueva y su repetición no coinciden.';
    if (nueva === actual) return 'La nueva tiene que ser distinta de la actual.';
    return null;
};

/**
 * Cambiar la propia contraseña, diciendo la actual. Así quien recibe la tienda
 * pone la suya sin que nadie más la conozca (2026-11-21).
 */
const CambiarClave = () => {
    const { toast } = useNotification();
    const [campos, setCampos] = useState(VACIO);
    const [guardando, setGuardando] = useState(false);
    const falta = faltaParaCambiar(campos);
    const escrito = campos.nueva || campos.repetida;

    const cambiar = (e) => setCampos(c => ({ ...c, [e.target.name]: e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        if (falta) return;
        setGuardando(true);
        try {
            await cambiarMiClave(campos.actual, campos.nueva);
            toast.success('Desde ahora se entra con la contraseña nueva.', 'Contraseña cambiada');
            setCampos(VACIO);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo cambiar la contraseña'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <AdminFormLayout title="Contraseña" icon={KeyRound}>
            <form onSubmit={guardar}>
                <AdminFormSection title="Cambiar contraseña"
                    description={`Escribe la actual y luego la nueva dos veces. Mínimo ${LARGO_MINIMO_CLAVE} caracteres.`}>
                    <div className="adm-separacion--seccion">
                        <Input label="Contraseña actual" type="password" name="actual" autoComplete="current-password"
                            value={campos.actual} onChange={cambiar} disabled={guardando} />
                    </div>
                    <div className="adm-fila-amplia">
                        <div className="adm-flexible">
                            <Input label="Contraseña nueva" type="password" name="nueva" autoComplete="new-password"
                                value={campos.nueva} onChange={cambiar} disabled={guardando} />
                        </div>
                        <div className="adm-flexible">
                            <Input label="Repite la nueva" type="password" name="repetida" autoComplete="new-password"
                                value={campos.repetida} onChange={cambiar} disabled={guardando} />
                        </div>
                    </div>
                    {escrito && falta && <span className="adm-pie-ayuda" role="status">{falta}</span>}
                </AdminFormSection>
                <AdminFormSubmit>
                    <Button variant="primary" type="submit" disabled={guardando || Boolean(falta)} className="adm-boton-ancho">
                        {guardando ? 'CAMBIANDO...' : 'CAMBIAR CONTRASEÑA'}
                    </Button>
                </AdminFormSubmit>
            </form>
        </AdminFormLayout>
    );
};

export default CambiarClave;
