import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import useAjustesNegocio from '../../../../hooks/useAjustesNegocio';
import EditorOpciones from './EditorOpciones';
import './ajustes.css';

/**
 * Ajustes del negocio: cómo trabaja la tienda.
 *
 * No se publican al sitio (a diferencia de Sitio Web › Redes y Contacto): son
 * para quien atiende el panel.
 */
const AjustesNegocio = () => {
    const { toast } = useNotification();
    const { ajustes, cargando, error, recargar, guardar } = useAjustesNegocio();

    const guardarCanales = async (lista) => {
        await guardar('canales_pedido', lista);
        toast.success('Opciones de "¿Cómo llegó?" guardadas');
    };

    return (
        <div className="adm-pila-alta">
            <SectionHeader
                title="Ajustes del negocio"
                description="Cómo trabaja la tienda. Estos ajustes no se publican en el sitio."
                icon={SlidersHorizontal}
            />

            {cargando && <p className="aj-nota" aria-busy="true">Cargando ajustes…</p>}

            {!cargando && error && (
                <div className="aj-error aj-error--bloque" role="alert">
                    <span>{error}</span>
                    <button type="button" className="aj-boton" onClick={recargar}>Reintentar</button>
                </div>
            )}

            {!cargando && !error && ajustes && (
                <section className="aj-tarjeta" aria-labelledby="aj-canales-titulo">
                    <h3 id="aj-canales-titulo" className="aj-titulo">¿Cómo llegó el pedido?</h3>
                    <p className="aj-explicacion">
                        Las opciones que aparecen al cargar un pedido en el panel
                        (Ventas y CRM › Cotizaciones › Nueva Cotización Manual). Con
                        ellas se puede saber después cuántos pedidos llegaron por cada vía.
                    </p>
                    <EditorOpciones
                        id="canales"
                        opciones={ajustes.canales_pedido || []}
                        onGuardar={guardarCanales}
                        aviso="Quitar o renombrar una opción no cambia los pedidos que ya la tienen: siguen diciendo lo que decían."
                    />
                </section>
            )}
        </div>
    );
};

export default AjustesNegocio;
