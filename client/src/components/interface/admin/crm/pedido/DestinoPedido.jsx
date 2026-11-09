import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { useSettings } from '../../../../../context/SettingsContext';
import { cambiarDestino } from '../../../../../lib/api/endpoints';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import CamposEntrega from '../../../vistas/contacto/CamposEntrega';
import { datosDeEntrega, metodosDeEnvio } from '../../../vistas/contacto/entrega';

/** El destino del pedido como lo lee CamposEntrega. */
const datosDe = (pedido) => ({
    entrega: pedido.modo_entrega === 'RETIRO' ? 'RETIRO' : (pedido.tipo_despacho || 'DOMICILIO'),
    transporte: pedido.transporte || '',
    region: pedido.region || '',
    comuna: pedido.comuna || '',
    comuna_id: '',
    direccion: pedido.direccion || '',
});

const resumen = (pedido) => {
    if (pedido.modo_entrega === 'RETIRO') return 'Retiro en el local';
    const como = pedido.tipo_despacho === 'SUCURSAL' ? 'A sucursal' : (pedido.direccion || 'Sin dirección');
    const lugar = [pedido.comuna, pedido.region].filter(Boolean).join(', ') || 'sin comuna';
    return `${pedido.transporte || 'Sin transporte'} · ${como} · ${lugar}`;
};

/**
 * A dónde va el pedido, y corregirlo mientras no haya salido. Cada pedido
 * guarda su destino (la etiqueta sale de acá); cambiar a la clienta no lo
 * cambia. Antes no había cómo corregirlo (reportado por QA 2026-11-09).
 */
const DestinoPedido = ({ pedido, onCambio }) => {
    const { toast } = useNotification();
    const { settings } = useSettings();
    const [datos, setDatos] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const editable = !['DESPACHADA', 'CANCELADA'].includes(pedido.estado);
    const cambiar = (parcial) => setDatos(prev => ({ ...prev, ...parcial }));

    const guardar = async () => {
        setGuardando(true);
        try {
            const actualizado = await cambiarDestino(pedido.id, datosDeEntrega(datos));
            toast.success('Destino actualizado');
            setDatos(null);
            onCambio?.(actualizado);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo cambiar el destino'));
        } finally {
            setGuardando(false);
        }
    };

    if (!datos) {
        return (
            <div className="sp-canal-edicion">
                <p className="sp-prenda-nombre">{resumen(pedido)}</p>
                {editable && (
                    <div className="sp-acciones">
                        <button type="button" className="sp-boton" onClick={() => setDatos(datosDe(pedido))}>Cambiar destino</button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="sp-canal-edicion">
            <CamposEntrega datos={datos} cambiar={cambiar} metodosEnvio={metodosDeEnvio(settings)} />
            <div className="sp-acciones">
                <button type="button" className="sp-boton" onClick={() => setDatos(null)} disabled={guardando}>Cancelar</button>
                <button type="button" className="sp-boton sp-boton--principal" onClick={guardar} disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar destino'}
                </button>
            </div>
        </div>
    );
};

export default DestinoPedido;
