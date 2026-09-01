import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

// Live WebSocket Server Endpoint URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://zeraworld.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  connect(token) {
    // There is no Socket.IO server running on the current PHP-only hosting —
    // realtime is deferred pending a third-party push/realtime service. Attempting
    // to connect here just spams the console and retries forever for nothing.
    return;

    // eslint-disable-next-line no-unreachable
    if (this.socket && this.socket.connected) return;

    try {
      this.socket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('⚡ [Ishkhwaz Socket] Connected to Real-time WebSocket Server:', this.socket.id);
        this.isConnected = true;
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('⚠️ [Ishkhwaz Socket] Disconnected from WebSocket Server:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.warn('⚠️ [Ishkhwaz Socket] Connection notice:', error.message);
      });

      // Bind dynamic listeners
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });

    } catch (e) {
      console.warn('Could not connect Socket.io engine', e);
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected yet, queueing message:', event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
