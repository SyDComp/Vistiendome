const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const WS_URL = API_URL.replace('http', 'ws');

class WebSocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 seconds
        this.shouldReconnect = true; // Flag to control reconnection
        this.currentDeliveryId = null;
    }

    connect(deliveryId) {
        // If already connected to same delivery, don't reconnect
        if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentDeliveryId === deliveryId) {
            console.warn('WebSocket already connected to this delivery');
            return;
        }

        // Close existing connection if connecting to different delivery
        if (this.socket && this.currentDeliveryId !== deliveryId) {
            this.shouldReconnect = false;
            this.socket.close();
        }

        this.currentDeliveryId = deliveryId;
        this.shouldReconnect = true;
        const url = `${WS_URL}/ws/delivery/${deliveryId}`;
        console.log(`🔌 Connecting to WebSocket: ${url}`);

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('✅ WebSocket Connected');
            this.reconnectAttempts = 0;
            this.notifyListeners('connection', { status: 'connected' });
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.notifyListeners('location_update', data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.socket.onclose = () => {
            console.log('⚠️ WebSocket Disconnected');
            this.notifyListeners('connection', { status: 'disconnected' });

            // Only attempt reconnect if we should reconnect (not manual disconnect)
            if (this.shouldReconnect) {
                this.attemptReconnect(deliveryId);
            }
        };

        this.socket.onerror = (error) => {
            console.error('❌ WebSocket Error:', error);
        };
    }

    disconnect() {
        this.shouldReconnect = false; // Prevent reconnection
        this.reconnectAttempts = 0; // Reset attempts
        this.currentDeliveryId = null;

        if (this.socket) {
            // WebSocket might not be open yet
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                this.socket.close();
            }
            this.socket = null;
        }
    }

    sendLocation(lat, lng, status = 'in_transit') {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ lat, lng, status }));
        } else {
            console.warn('Cannot send location: WebSocket not connected');
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    attemptReconnect(deliveryId) {
        if (!this.shouldReconnect) {
            console.log('🛑 Reconnection disabled, not attempting reconnect');
            return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.connect(deliveryId), this.reconnectInterval);
        } else {
            console.error('❌ Max reconnect attempts reached');
            this.notifyListeners('error', { message: 'Connection lost' });
        }
    }
}

export const wsService = new WebSocketService();
