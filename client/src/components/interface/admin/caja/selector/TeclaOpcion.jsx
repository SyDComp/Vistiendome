import React from 'react';
import { teclaDe } from '../../../../../utils/filtrosCaja';

/** La tecla que elige esta opción de la página: 1 a 9, y 0 la décima. */
const TeclaOpcion = ({ indice }) => {
    const tecla = teclaDe(indice);
    return tecla ? <kbd className="cj-sel-tecla">{tecla}</kbd> : null;
};

export default TeclaOpcion;
