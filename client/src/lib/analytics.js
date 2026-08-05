// Cliente de analítica (fire-and-forget). No bloquea ni rompe la navegación si falla.
const SESSION_KEY = 'vdm_session_id';

const getSessionId = () => {
    try {
        let s = localStorage.getItem(SESSION_KEY);
        if (!s) {
            s = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(SESSION_KEY, s);
        }
        return s;
    } catch {
        return null;
    }
};

export const track = (type, payload = {}) => {
    try {
        fetch('/api/v1/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, session_id: getSessionId(), ...payload }),
            keepalive: true,
        }).catch(() => {});
    } catch {
        /* almacenamiento/red no disponible: se ignora silenciosamente */
    }
};
