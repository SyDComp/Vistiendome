import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RedDeModulo from '../admin/RedDeModulo';

// Lo que pasó con las flechas de Características: el servidor respondió la
// lista sin nombres y la pantalla, al leer `char.name`, se cayó. Sin la red,
// eso dejaba el panel entero en blanco.
const PantallaQueSeCae = () => {
    const sinNombre = {};
    return <span>{sinNombre.name.toLowerCase()}</span>;
};

describe('RedDeModulo', () => {
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
    afterEach(() => vi.restoreAllMocks());

    it('si la pantalla se cae, queda el aviso con el botón para recargar', () => {
        render(<RedDeModulo><PantallaQueSeCae /></RedDeModulo>);
        expect(screen.getByRole('alert').textContent).toContain('Esta pantalla tuvo un error');
        expect(screen.getByRole('button', { name: /volver a cargar/i })).toBeTruthy();
    });

    it('si no pasa nada, muestra la pantalla tal cual', () => {
        render(<RedDeModulo><span>Inventario</span></RedDeModulo>);
        expect(screen.getByText('Inventario')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
