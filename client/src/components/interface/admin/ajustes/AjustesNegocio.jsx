import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import useAjustesNegocio from '../../../../hooks/useAjustesNegocio';
import EditorOpciones from './EditorOpciones';
import EditorPlazos from './EditorPlazos';
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

    const guardarPlazos = async (plazos) => {
        await guardar('plazos_pedido', plazos);
        toast.success('Plazos guardados');
    };

    const guardarMedios = async (lista) => {
        await guardar('medios_pago', lista);
        toast.success('Medios de pago guardados');
    };

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
                <section className="aj-tarjeta" aria-labelledby="aj-plazos-titulo">
                    <h3 id="aj-plazos-titulo" className="aj-titulo">Plazo habitual de un pedido</h3>
                    <p className="aj-explicacion">
                        En cuántos días hábiles (lunes a viernes) suele estar listo un pedido. Al
                        confirmarlo, la fecha comprometida se propone con esto, y se puede cambiar.
                        Los feriados no se descuentan: si cae uno, se ajusta la fecha a mano.
                    </p>
                    <EditorPlazos plazos={ajustes.plazos_pedido || {}} onGuardar={guardarPlazos} />
                </section>
            )}

            {!cargando && !error && ajustes && (
                <section className="aj-tarjeta" aria-labelledby="aj-medios-titulo">
                    <h3 id="aj-medios-titulo" className="aj-titulo">Medios de pago</h3>
                    <p className="aj-explicacion">
                        Cómo se puede pagar un pedido. Aparecen al registrar un pago
                        (Cotizaciones › detalle del pedido › Pagos).
                    </p>
                    <EditorOpciones
                        id="medios"
                        opciones={ajustes.medios_pago || []}
                        onGuardar={guardarMedios}
                        aviso="Quitar o renombrar un medio no cambia los pagos ya registrados: siguen diciendo cómo se pagó."
                    />
                </section>
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
