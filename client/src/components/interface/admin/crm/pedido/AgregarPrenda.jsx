import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNotification } from '../../../../../context/NotificationContext';
import { agregarPrenda } from '../../../../../lib/api/endpoints';
import useCatalogoParaArmar from '../../../../../hooks/useCatalogoParaArmar';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import ArmadorDePrenda from '../../../../ui/ArmadorDePrenda';

/**
 * "+ Agregar prenda" a un pedido que se está conversando: lo acordado por
 * WhatsApp entra a ESTE pedido, no a uno nuevo.
 *
 * Se arma igual que en una cotización nueva (mismo armador, misma regla en el
 * servidor): si lo elegido coincide con una variante, es esa variante.
 */
const AgregarPrenda = ({ pedidoId, onAgregada }) => {
    const { toast } = useNotification();
    const [abierto, setAbierto] = useState(false);
    const [cantidad, setCantidad] = useState('1');
    const [enviando, setEnviando] = useState(false);
    const { productos, atributos } = useCatalogoParaArmar(abierto);

    const n = parseInt(cantidad, 10);
    const cantidadValida = Number.isInteger(n) && n >= 1;

    const agregar = async ({ nombre, productoId, precio, config, propuestos }) => {
        if (!cantidadValida) {
            toast.error('Indica cuántas son (1 o más).');
            return;
        }
        setEnviando(true);
        try {
            await agregarPrenda(pedidoId, {
                producto_id: productoId,
                nombre_custom: nombre,
                cantidad: n,
                precio_unitario_estimado: precio,
                config_custom: config,
                config_propuesta: propuestos,
            });
            toast.success(`Agregado: ${n}× ${nombre}`);
            setAbierto(false);
            setCantidad('1');
            onAgregada?.();
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo agregar la prenda'));
        } finally {
            setEnviando(false);
        }
    };

    if (!abierto) {
        return (
            <button type="button" className="sp-boton sp-boton--con-icono" onClick={() => setAbierto(true)}>
                <Plus size={14} /> Agregar prenda
            </button>
        );
    }

    return (
        <div className="sp-agregar" aria-busy={enviando}>
            <label className="sp-agregar-cantidad">
                Cantidad
                <input type="number" min="1" step="1" className="sp-select" value={cantidad}
                    onChange={e => setCantidad(e.target.value)} disabled={enviando} />
            </label>
            <ArmadorDePrenda
                contexto="panel"
                enmarcado
                atributos={atributos}
                productos={productos}
                textoBoton="Agregar al pedido"
                onAgregar={agregar}
                onCancelar={() => setAbierto(false)}
            />
        </div>
    );
};

export default AgregarPrenda;
