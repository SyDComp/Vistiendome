/**
 * Enlaces de navegación del sitio público.
 *
 * Vivían en `constants/pruebas.jsx`, un archivo de datos de prototipo que
 * además importaba fotos del catálogo como módulos del bundle. Como importar
 * cualquier cosa de un módulo lo arrastra entero, pedir estos enlaces metía
 * 3,8 MB de imágenes muertas en el build. Son datos de navegación, no de
 * prueba: viven acá y no traen nada pesado detrás.
 */

export const navLinks = [
    { nombre: 'Catálogo', destino: 'catalogo' },
    { nombre: 'Explorador', destino: 'explorador' },
    { nombre: 'Colecciones', destino: 'colecciones' },
    { nombre: 'Nosotros', destino: 'nosotros' },
    { nombre: 'Contacto', destino: 'contacto' }
];

export const soporteLinks = [
    { id: 1, nombre: 'Guía de Tallas', destino: 'ayuda', seccion: 'tallas' },
    { id: 2, nombre: 'Preguntas Frecuentes', destino: 'ayuda', seccion: 'faq' },
    { id: 3, nombre: 'Cambios y Devoluciones', destino: 'ayuda', seccion: 'cambios' },
    { id: 4, nombre: 'Envíos y Seguimiento', destino: 'ayuda', seccion: 'envios' },
    { id: 5, nombre: 'Cuidado de Prendas', destino: 'ayuda', seccion: 'cuidados' }
];
