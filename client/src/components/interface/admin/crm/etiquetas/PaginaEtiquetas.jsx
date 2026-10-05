import React from 'react';
import { variablesDePagina } from './formatosEtiqueta';
import './PaginaEtiquetas.css';

/**
 * Una página con sus medidas reales en milímetros y las casillas del formato.
 * Es la misma en la vista previa y en la impresión.
 */
const PaginaEtiquetas = ({ geometria, children }) => (
    <div className="et-pagina" style={variablesDePagina(geometria)}>
        {children}
    </div>
);

export default PaginaEtiquetas;
