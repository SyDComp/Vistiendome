import React from 'react';
import { Receipt } from 'lucide-react';
import SectionHeader from '../../../../ui/admin/SectionHeader';
import CierreDelDia from './CierreDelDia';
import '../../crm/pedido/pedido.css';
import '../caja.css';
import '../selector/selector.css';

/** El cierre de caja desde el panel (Ventas y CRM › Cierre de caja). */
const CierrePanel = () => (
    <div className="adm-pila-alta">
        <SectionHeader
            title="Cierre de caja"
            description="Lo cobrado cada día por medio de pago y el efectivo que debería haber en el cajón. Se calcula del libro de pagos: el de cualquier día se puede ver o reimprimir."
            icon={Receipt}
        />
        <CierreDelDia />
    </div>
);

export default CierrePanel;
