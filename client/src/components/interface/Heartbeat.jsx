import React from 'react';
import { useWebSocket } from '../../context/WebSocketContext';


const Heartbeat = () => {
    const { isConnected } = useWebSocket();

    return (
        <div className={`heartbeat-indicator ${isConnected ? 'online' : 'offline'}`} title={isConnected ? 'Conexión en tiempo real activa' : 'Reconectando...'}>
            <div className="heart-dot"></div>
            <div className="heart-pulse"></div>
            <span className="heart-label">{isConnected ? 'Live' : 'Offline'}</span>
        </div>
    );
};

export default Heartbeat;
