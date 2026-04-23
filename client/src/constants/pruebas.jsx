import imgNoemiAzul from '../assets/img_catalogo/VESTIDO_NOEMI/AZUL_MARINO.jpg';
import imgNoemiAzul2 from '../assets/img_catalogo/VESTIDO_NOEMI/AZUL_MARINO_2.jpg';
import imgNoemiRey from '../assets/img_catalogo/VESTIDO_NOEMI/AZUL_REY.jpg';
import imgNoemiBeige from '../assets/img_catalogo/VESTIDO_NOEMI/BEIGE.jpg';
import imgNoemiBlanco from '../assets/img_catalogo/VESTIDO_NOEMI/BLANCO.jpg';
import imgNoemiBurdeo from '../assets/img_catalogo/VESTIDO_NOEMI/BURDEO.jpg';

export const elementosColeccion = [
    {
        id: "vestido-noemi",
        nombre: 'Vestido Noemí',
        descripcion: 'Elegancia en Lycra Sofía',
        imagen: imgNoemiAzul,
        precio: '$18.990',
        vistaDestino: 'detalle',
    },
];

export const elementosCarrusel = [
    {
        id: 1,
        titulo: 'Vestido Noemí',
        subtitulo: 'Colección 2024 - Azul Marino',
        imagen: imgNoemiAzul,
        vistaDestino: 'detalle',
        productoId: '78/NOE-VES_NOE-NEGRO-REDON-BAJ_ROD-TEL_SOF-L-34'
    },
    {
        id: 2,
        titulo: 'Vestido Noemí',
        subtitulo: 'Atrévete con el Azul Rey',
        imagen: imgNoemiRey,
        vistaDestino: 'detalle',
        productoId: '78/NOE-VES_NOE-NEGRO-REDON-BAJ_ROD-TEL_SOF-L-34'
    },
    {
        id: 3,
        titulo: 'Vestido Noemí',
        subtitulo: 'Elegancia en Tonos Beige',
        imagen: imgNoemiBeige,
        vistaDestino: 'detalle',
        productoId: '78/NOE-VES_NOE-NEGRO-REDON-BAJ_ROD-TEL_SOF-L-34'
    },
    {
        id: 4,
        titulo: 'Vestido Noemí',
        subtitulo: 'Pureza y Estilo en Blanco',
        imagen: imgNoemiBlanco,
        vistaDestino: 'detalle',
        productoId: '78/NOE-VES_NOE-NEGRO-REDON-BAJ_ROD-TEL_SOF-L-34'
    },
    {
        id: 5,
        titulo: 'Vestido Noemí',
        subtitulo: 'Otoño con Burdeo',
        imagen: imgNoemiBurdeo,
        vistaDestino: 'detalle',
        productoId: '78/NOE-VES_NOE-NEGRO-REDON-BAJ_ROD-TEL_SOF-L-34'
    }
];

export const productosCatalogo = [
    {
        id: "vestido-noemi",
        nombre: "Vestido Noemí 🌿",
        categoria: "Vestidos",
        tipo: "prenda",
        descripcion: "Elegante vestido bajo rodilla confeccionado en tela Lycra Sofía. Manga 3/4 y caída impecable. Ideal para momentos especiales y congregacionales.",
        especificaciones: {
            "Tela": "Lycra Sofía",
            "Manga": "3/4",
            "Largo Base": "110cm",
            "Origen": "Fabricación Propia (San Carlos)"
        },
        atributos: [
            { 
                id: "talla", 
                etiqueta: "Talla", 
                opciones: ["12", "14", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL"] 
            },
            { 
                id: "color", 
                etiqueta: "Color", 
                opciones: ["Azul Marino", "Azul Rey", "Beige", "Blanco", "Burdeo", "Coral", "Gris", "Lila", "Mostaza", "Negro", "Palo Rosa", "Rojo Italiano", "Sandía", "Turquesa", "Uva", "Verde Agua"] 
            },
            {
                id: "largo",
                etiqueta: "Largo Extra",
                opciones: ["Estándar (110cm)", "Midi (120cm)", "Maxi (130cm)"]
            }
        ],
        // Lógica de precios agrupada (simplifica la data)
        reglasPrecio: [
            { tallas: ["12", "14"], precio: 16990 },
            { tallas: ["XS", "S", "M", "L", "XL"], precio: 18990 },
            { tallas: ["2XL", "3XL"], precio: 20990 },
            { tallas: ["4XL", "5XL"], precio: 22990 },
            { tallas: ["6XL", "7XL"], precio: 26990 }
        ],
        modificadoresPrecio: [
            { id: "largo", opcion: "Midi (120cm)", extra: 1500 },
            { id: "largo", opcion: "Maxi (130cm)", extra: 3000 }
        ],
        // Imágenes por color (ejemplos)
        galeriaPorColor: {
            "Azul Marino": [imgNoemiAzul, imgNoemiAzul2],
            "Azul Rey": [imgNoemiRey],
            "Beige": [imgNoemiBeige],
            "Blanco": [imgNoemiBlanco],
            "Burdeo": [imgNoemiBurdeo]
            // Agregar más según disponibilidad
        },
        imagenPrincipal: imgNoemiAzul
    },
    {
        id: "taza-vistiendome",
        nombre: "Taza Inspiración Cristiana",
        categoria: "Regalería",
        tipo: "accesorio",
        descripcion: "Taza de cerámica de alta calidad con diseños exclusivos que inspiran tu día a día.",
        precioBase: 4990,
        atributos: [
            { 
                id: "capacidad", 
                etiqueta: "Capacidad", 
                opciones: ["320ml (Estándar)", "450ml (Grande)"] 
            },
            {
                id: "color_asa",
                etiqueta: "Color de Asa",
                opciones: ["Blanco", "Negro", "Dorado"]
            }
        ],
        modificadoresPrecio: [
            { id: "capacidad", opcion: "450ml (Grande)", extra: 1500 }
        ],
        imagenPrincipal: "https://images.unsplash.com/photo-1514228742587-6b1558fbed20?auto=format&fit=crop&w=800&q=80",
        galeriaPorColor: {
            "default": ["https://images.unsplash.com/photo-1514228742587-6b1558fbed20?auto=format&fit=crop&w=800&q=80"]
        }
    }
];

export const navLinks = [
    { nombre: 'Catálogo', destino: 'catalogo' },
    { nombre: 'Nosotros', destino: 'nosotros' },
    { nombre: 'Contacto', destino: 'contacto' }
];

export const redesSociales = [
    { id: 1, nombre: 'Instagram', url: 'https://instagram.com', icono: '' },
    { id: 2, nombre: 'Facebook', url: 'https://facebook.com', icono: '' },
    { id: 3, nombre: 'TikTok', url: 'https://tiktok.com', icono: '' },
    { id: 4, nombre: 'WhatsApp', url: 'https://wa.me/56998756473', icono: '' },
];

export const soporteLinks = [
    { id: 1, nombre: 'Guía de Tallas', destino: 'ayuda', seccion: 'tallas' },
    { id: 2, nombre: 'Preguntas Frecuentes', destino: 'ayuda', seccion: 'faq' },
    { id: 3, nombre: 'Cambios y Devoluciones', destino: 'ayuda', seccion: 'cambios' },
    { id: 4, nombre: 'Envíos y Seguimiento', destino: 'ayuda', seccion: 'envios' },
    { id: 5, nombre: 'Cuidado de Prendas', destino: 'ayuda', seccion: 'cuidados' }
];
