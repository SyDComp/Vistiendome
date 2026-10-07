import { describe, it, expect } from 'vitest';
import { armarSolicitud } from '../armarSolicitud';

const datos = (extra = {}) => ({
    rut: '17.896.543-5', nombre: 'Ana María Pérez', email: '', whatsapp: '+56966205071',
    entrega: 'DOMICILIO', transporte: 'STARKEN', region: 'Región de Ñuble', comuna: 'Quirihue', comuna_id: 120,
    direccion: 'Calle 678', mensaje: 'quiero esos', tipoGrupo: 'Coristas', cantidad: '', evento: '',
    ...extra,
});

const prenda = { nombre: 'Tapado Magdalena Verano', productoId: 12, config: { TALLA: 'L', COLOR: 'Coral' }, propuestos: { MANGAS: 'Corta' }, cantidad: 1 };

describe('armarSolicitud', () => {
    it('las prendas elegidas salen en el mensaje, con lo propuesto marcado', () => {
        const { mensaje } = armarSolicitud({ tipo: 'individual', datos: datos(), prendas: [prenda] });
        expect(mensaje).toContain('Tapado Magdalena Verano');
        expect(mensaje).toContain('*TALLA:* L');
        expect(mensaje).toContain('*MANGAS:* Corta (a confirmar)');
    });

    it('retiro en tienda: sin transportista ni direccion, y el servidor lo recibe como RETIRO', () => {
        const { mensaje, pedido } = armarSolicitud({ tipo: 'individual', datos: datos({ entrega: 'RETIRO' }), prendas: [] });
        expect(pedido).toMatchObject({ modo_entrega: 'RETIRO', tipo_despacho: null, transporte: null, region: null, comuna: null, direccion: null });
        expect(mensaje).toContain('*Despacho:* RETIRO EN EL LOCAL');
        expect(mensaje).not.toContain('Quirihue');
    });

    it('a sucursal es un despacho, sin la direccion de la clienta', () => {
        const { pedido } = armarSolicitud({ tipo: 'individual', datos: datos({ entrega: 'SUCURSAL' }), prendas: [] });
        expect(pedido).toMatchObject({ modo_entrega: 'DESPACHO', tipo_despacho: 'SUCURSAL', transporte: 'STARKEN', direccion: null, comuna: 'Quirihue' });
    });

    it('el pedido lleva las prendas y, si es grupal, los datos del grupo', () => {
        const { pedido } = armarSolicitud({ tipo: 'grupo', datos: datos({ cantidad: '20' }), prendas: [prenda] });
        expect(pedido.origen).toBe('CONTACTO_GRUPAL');
        expect(pedido.cantidad_aprox).toBe(20);
        expect(pedido.items[0]).toMatchObject({ nombre_custom: 'Tapado Magdalena Verano', config_propuesta: { MANGAS: 'Corta' } });
        // De qué producto es, y sin precio: lo cotiza la tienda, no la clienta.
        expect(pedido.items[0]).toMatchObject({ producto_id: 12, precio_unitario_estimado: null });
        expect(pedido).toMatchObject({ nombres: 'Ana', apellidos: 'María Pérez' });
    });
});
