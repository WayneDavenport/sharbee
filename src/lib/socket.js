import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
    if (!socket) {
        // Detect if running in Electron and get server port
        const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
        const serverPort = isElectron ? (window.electronAPI?.serverPort || 8888) : undefined;
        
        console.log('[Socket Init] Environment:', {
            isElectron,
            serverPort,
            hasElectronAPI: typeof window !== 'undefined' && !!window.electronAPI,
            electronAPIKeys: typeof window !== 'undefined' && window.electronAPI ? Object.keys(window.electronAPI) : []
        });
        
        // Determine Socket.io server URL
        let socketUrl;
        if (isElectron && serverPort) {
            // In Electron, connect to localhost on the configured port
            socketUrl = `http://localhost:${serverPort}`;
        } else {
            // In browser, use current origin (dev mode or external browser)
            socketUrl = undefined; // Uses current origin by default
        }
        
        console.log('[Socket Init] Connecting to:', socketUrl || 'current origin');
        
        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        console.log('[Socket Init] Socket instance created');
    }
    return socket;
};

export const getSocket = () => {
    if (!socket) {
        return initSocket();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

