import React from 'react';
import './SectionHeader.css';

/**
 * La cabecera de una seccion del panel: su icono, su titulo, su bajada y sus
 * botones.
 *
 * UN SOLO NOMBRE PARA CADA COSA
 * Este componente recibia `{ title, description, action }`, pero cinco
 * pantallas del CRM le pasaban `subtitle` y `icon`. Ninguno de los dos existia,
 * asi que React los descartaba sin decir nada: esas cinco pantallas llevaban
 * quien sabe cuanto sin mostrar su bajada ni su icono, y quien las escribio
 * penso que si lo hacian.
 *
 * Ahora `description` es el nombre, `subtitle` se acepta por si queda alguno
 * suelto, e `icon` se dibuja.
 *
 * `action` acepta uno o varios botones: `{ label, onClick, icon?, variant? }`,
 * donde `variant: 'outline'` da la version sobria.
 *
 * El componente NO sabe cuan ancha es la pantalla, y no tiene por que: antes
 * preguntaba el ancho a JavaScript diez veces para decidir si apilar el titulo
 * y los botones. Eso lo decide la hoja de estilos.
 */
const SectionHeader = ({ title, description, subtitle, icon: Icono, action }) => {
    const bajada = description ?? subtitle;
    const botones = Array.isArray(action) ? action : action ? [action] : [];

    return (
        <div className="admin-section-header">
            <div className="adm-titulo-cabecera-grupo">
                {Icono && (
                    <span className="adm-emblema-cabecera" aria-hidden="true">
                        <Icono size={20} />
                    </span>
                )}
                <div>
                    <h2 className="adm-titulo-seccion-cabecera">{title}</h2>
                    {bajada && <p className="adm-bajada-seccion">{bajada}</p>}
                </div>
            </div>

            {botones.length > 0 && (
                <div className="adm-acciones-cabecera">
                    {botones.map((boton, i) => (
                        <button
                            key={i}
                            onClick={boton.onClick}
                            className={`adm-boton-cabecera${
                                boton.variant === 'outline' ? ' adm-boton-cabecera--contorno' : ''
                            }`}
                        >
                            {boton.icon}
                            {boton.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SectionHeader;
