import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const DURA_MS = 1800;

/**
 * "Agregado" con su visto, encima de la venta, y se va solo. Uno a la vez: el
 * siguiente reemplaza al anterior. Con los avisos generales del panel se
 * apilaban al escanear varias prendas seguidas y tapaban el cobro.
 *
 * @param agregado  {nombre, vez}: `vez` cambia en cada prenda, aunque se repita el nombre.
 */
const AvisoAgregado = ({ agregado }) => {
    const [visible, setVisible] = useState(null);

    useEffect(() => {
        if (!agregado) return undefined;
        setVisible(agregado);
        const t = setTimeout(() => setVisible(null), DURA_MS);
        return () => clearTimeout(t);
    }, [agregado]);

    if (!visible) return null;
    return (
        <div key={visible.vez} className="cj-agregado" role="status">
            <CheckCircle2 size={22} aria-hidden="true" />
            <span><strong>Agregado</strong> {visible.nombre}</span>
        </div>
    );
};

export default AvisoAgregado;
