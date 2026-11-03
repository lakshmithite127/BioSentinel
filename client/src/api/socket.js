import { io } from 'socket.io-client';
import { getStoredToken, getStoredUser } from './client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      const user = getStoredUser();
      if (user && user.id) {
        socket.emit('auth:register', user);
      }
    });
  }

  return socket;
}

export function registerSocketUser(user) {
  const s = getSocket();
  if (s.connected && user && user.id) {
    s.emit('auth:register', user);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

