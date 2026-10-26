import React from 'react';

/** La tecla que elige esta opción (1 a 9). Desde la décima se elige con flechas. */
const TeclaOpcion = ({ indice }) => (indice < 9 ? <kbd className="cj-sel-tecla">{indice + 1}</kbd> : null);

export default TeclaOpcion;
