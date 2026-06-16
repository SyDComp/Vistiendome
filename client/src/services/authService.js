import api from './api';

export const authService = {
    /**
     * Login user with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{access_token: string, refresh_token: string, user: Object}>}
     */
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, refresh_token, user } = response.data;

        // Store tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('authChange'));

        return response.data;
    },

    /**
     * Logout current user
     */
    async logout() {
        try {
            // Tell the backend we are logging out
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('authChange'));
        }
    },

    /**
     * Send heartbeat to keep session active
     */
    async heartbeat() {
        try {
            await api.post('/auth/heartbeat');
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    },

    /**
     * Get current user from localStorage
     * @returns {Object|null}
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!localStorage.getItem('access_token');
    },

    /**
     * Accept invitation and create account
     * @param {string} token
     * @param {string} password
     * @param {string} full_name
     * @returns {Promise}
     */
    async acceptInvitation(token, password, full_name) {
        const response = await api.post('/auth/accept-invitation', {
            token,
            password,
            full_name,
        });
        return response.data;
    },
};
