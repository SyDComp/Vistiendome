import { useCallback } from 'react';
import { NOMBRE_TIENDA } from '../../../../../constants/marca';
import { useSettings } from '../../../../../context/SettingsContext';
import { verPagos } from '../../../../../lib/api/endpoints';
import { armarComprobante } from '../../../../../utils/comprobante';
import { imprimirComprobante } from './imprimirComprobante';

/**
 * Imprimir el comprobante de un pedido entregado. Los pagos se leen del libro
 * del pedido (no de la pantalla), y los datos de la tienda, de Sitio Web ›
 * Redes y Contacto. Lanza si no se pudieron leer los pagos; devuelve false si
 * el navegador bloqueó la ventana.
 *
 * @returns {(pedido: object, opciones?: {recibido?: number, reimpreso?: boolean}) => Promise<boolean>}
 */
export default function useImprimirComprobante() {
    const { settings } = useSettings();
    return useCallback(async (pedido, { recibido = 0, reimpreso = false } = {}) => {
        const { pagos } = await verPagos(pedido.id);
        const contacto = settings.contact_info || {};
        const tienda = { nombre: NOMBRE_TIENDA, direccion: contacto.address, telefono: contacto.phone_display };
        return imprimirComprobante(armarComprobante({
            pedido, pagos, tienda, recibido, reimpreso: reimpreso ? new Date() : null,
        }));
    }, [settings]);
}
