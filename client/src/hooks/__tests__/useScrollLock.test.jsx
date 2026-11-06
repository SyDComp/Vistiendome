import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useScrollLock } from '../useScrollLock';

const Modal = ({ abierto = true }) => {
    useScrollLock(abierto);
    return null;
};

describe('useScrollLock', () => {
    beforeEach(() => {
        window.scrollY = 2300;
        window.scrollTo = vi.fn();
        window.history.pushState({}, '', '/explorador');
    });
    afterEach(cleanup);

    it('al cerrar, la página vuelve a donde estaba', () => {
        const { unmount } = render(<Modal />);
        expect(document.body.classList.contains('no-scroll')).toBe(true);
        expect(document.body.scrollTop).toBe(2300);

        unmount();
        expect(document.body.classList.contains('no-scroll')).toBe(false);
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 2300, behavior: 'instant' });
    });

    it('con dos abiertos, vuelve recién al cerrar el último', () => {
        const uno = render(<Modal />);
        const dos = render(<Modal />);
        uno.unmount();
        expect(document.body.classList.contains('no-scroll')).toBe(true);
        expect(window.scrollTo).not.toHaveBeenCalled();
        dos.unmount();
        expect(window.scrollTo).toHaveBeenCalledTimes(1);
    });

    it('si se cambió de página mientras tanto, no vuelve', () => {
        const { unmount } = render(<Modal />);
        window.history.pushState({}, '', '/contacto');
        unmount();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('arriba de todo no hay nada que restaurar', () => {
        window.scrollY = 0;
        const { unmount } = render(<Modal />);
        unmount();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
});
