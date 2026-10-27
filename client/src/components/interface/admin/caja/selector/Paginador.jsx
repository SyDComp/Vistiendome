import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** En qué página se está, y ← → para cambiar. */
const Paginador = ({ pagina, paginas, total, que, onCambiar }) => (
    <div className="cj-sel-paginas">
        <button type="button" className="cj-icono" aria-label="Página anterior" disabled={pagina <= 1}
            onClick={() => onCambiar(pagina - 1)}><ChevronLeft size={16} /></button>
        <span>Página {pagina} de {paginas} · {total} {que}</span>
        <button type="button" className="cj-icono" aria-label="Página siguiente" disabled={pagina >= paginas}
            onClick={() => onCambiar(pagina + 1)}><ChevronRight size={16} /></button>
    </div>
);

export default Paginador;
