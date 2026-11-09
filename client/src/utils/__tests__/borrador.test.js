import { describe, it, expect, beforeEach } from 'vitest';
import { leerBorrador, guardarBorrador, olvidarBorrador } from '../borrador';

describe('borrador de un formulario', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('sobrevive a una recarga: vive en la pestaña, no para siempre', () => {
        guardarBorrador('contactoDraft', { mensaje: 'hola' });
        expect(sessionStorage.getItem('contactoDraft')).toBeTruthy();
        expect(localStorage.getItem('contactoDraft')).toBeNull();
        expect(leerBorrador('contactoDraft')).toEqual({ mensaje: 'hola' });
    });

    it('lo que quedó guardado de antes no vuelve, y se borra', () => {
        localStorage.setItem('contactoDraft', JSON.stringify({ mensaje: 'quiero esos' }));
        expect(leerBorrador('contactoDraft')).toBeNull();
        expect(localStorage.getItem('contactoDraft')).toBeNull();
    });

    it('al enviar se olvida', () => {
        guardarBorrador('checkoutDraft', { nombre: 'Ana' });
        olvidarBorrador('checkoutDraft');
        expect(leerBorrador('checkoutDraft')).toBeNull();
    });
});
