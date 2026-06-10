/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = () => {
        // Determinar protocolo ws o wss dependiendo de si es https
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // En producción usamos el host actual, en desarrollo localhost:8000
        const wsHost = import.meta.env.PROD ? window.location.host : 'localhost:8000';
        const wsUrl = `${wsProtocol}//${wsHost}/ws/heartbeat`;
        console.log('Intentando conectar WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket Conectado ✅');
            setIsConnected(true);
            // Empezar el latido (ping cada 30 segundos)
            const heartbeatInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 30000);
            ws._heartbeatInterval = heartbeatInterval;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
            } catch (err) {
                // Si no es JSON (ej: un 'pong' o mensaje de texto), lo ignoramos o manejamos como texto
                // console.debug('WebSocket mensaje recibido (no-JSON):', event.data);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket Desconectado ❌');
            setIsConnected(false);
            if (ws._heartbeatInterval) clearInterval(ws._heartbeatInterval);
            
            // Reintento de conexión exponencial simple
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 5000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            ws.close();
        };

        socketRef.current = ws;
    };

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    const sendMessage = (msg) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};
