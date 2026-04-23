import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = () => {
        // En desarrollo usamos el puerto 8000
        const wsUrl = 'ws://localhost:8000/ws/heartbeat';
        
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
            const data = JSON.parse(event.data);
            setLastMessage(data);
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
