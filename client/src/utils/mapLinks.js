// Coordenadas GPS verificadas contra la ficha real de Google Business
// "VistiendoMé Chile SPA" (2026-08-10). El texto de dirección que se muestra
// en el sitio ("Camino San Camilo Km 1,8...") NO coincide exactamente con el
// listado real de Google ("Camino San camilo Condominio el Arrayan 2,
// parcela 1") — usar el texto para geocodificar podía apuntar a un lugar
// impreciso. Las coordenadas son la fuente confiable; si el taller se muda,
// actualizar estas dos constantes.
const DEFAULT_LAT = -36.4493936;
const DEFAULT_LNG = -71.9544249;

/**
 * Arma links de Google Maps y Waze a un punto GPS preciso, usando los
 * esquemas de URL oficiales de cada app (sin API key). Por defecto apunta a
 * la ubicación verificada del taller.
 */
export const buildMapLinks = (lat = DEFAULT_LAT, lng = DEFAULT_LNG) => {
    if (lat == null || lng == null) return { googleMapsUrl: null, wazeUrl: null };
    return {
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        wazeUrl: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    };
};
