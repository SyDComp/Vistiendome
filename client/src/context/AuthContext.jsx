import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const currentUser = authService.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                }
            } catch (error) {
                console.error("Error initializing auth:", error);
            } finally {
                setLoading(false);
            }
        };

        const checkTokenExpiration = () => {
            // Optional: Check if token is expired periodically
        };

        initAuth();
    }, []);

    useEffect(() => {
        let heartbeatInterval;
        if (user) {
            // Check in with backend immediately on load if session is restored
            authService.heartbeat();

            // Ping heartbeat every 2 minutes (120000 ms)
            heartbeatInterval = setInterval(() => {
                authService.heartbeat();
            }, 120000);
        }

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user]);

    const login = async (email, password) => {
        const response = await authService.login(email, password);
        setUser(response.user);
        return response;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        isAuthenticated: !!user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
