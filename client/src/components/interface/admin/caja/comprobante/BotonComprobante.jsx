import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { useNotification } from '../../../../../context/NotificationContext';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import useImprimirComprobante from './useImprimirComprobante';

/**
 * Imprimir el comprobante de un pedido ya entregado, desde su detalle. Sale
 * marcado como copia, con la política de cambios que valía al entregarse.
 */
const BotonComprobante = ({ pedido }) => {
    const { toast } = useNotification();
    const imprimir = useImprimirComprobante();
    const [imprimiendo, setImprimiendo] = useState(false);

    const alClick = async () => {
        setImprimiendo(true);
        try {
            await imprimir(pedido, { reimpreso: true });
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo imprimir el comprobante'));
        } finally {
            setImprimiendo(false);
        }
    };

    return (
        <button type="button" className="sp-boton" onClick={alClick} disabled={imprimiendo}>
            <Printer size={15} /> {imprimiendo ? 'Imprimiendo…' : 'Imprimir comprobante'}
        </button>
    );
};

export default BotonComprobante;
