import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
    if (!socket) {
        // Detect if running in Electron and check mode
        const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
        const mode = isElectron ? window.electronAPI?.mode : 'host';
        const guestHostUrl = isElectron ? window.electronAPI?.guestHostUrl : null;
        const serverPort = isElectron ? (window.electronAPI?.serverPort || 8888) : undefined;
        
        console.log('[Socket Init] Environment:', {
            isElectron,
            mode,
            guestHostUrl,
            serverPort,
            hasElectronAPI: typeof window !== 'undefined' && !!window.electronAPI,
            electronAPIKeys: typeof window !== 'undefined' && window.electronAPI ? Object.keys(window.electronAPI) : []
        });
        
        // Determine Socket.io server URL
        let socketUrl;
        if (isElectron && mode === 'guest' && guestHostUrl) {
            // Guest mode - connect to the host's server
            socketUrl = guestHostUrl;
        } else if (isElectron && mode === 'host' && serverPort) {
            // Host mode - connect to our own localhost server
            socketUrl = `http://localhost:${serverPort}`;
        } else {
            // Browser - use current origin
            socketUrl = undefined; // Uses current origin by default
        }
        
        console.log('[Socket Init] Connecting to:', socketUrl || 'current origin');
        
        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
            reconnectionDelayMax: 5000
        });

        socket.on('reconnect_attempt', (attempt) => {
            console.log('[Socket] Reconnect attempt', attempt);
        });
        
        console.log('[Socket Init] Socket instance created');
    }
    return socket;
};

export const getSocket = () => {
    if (!socket) {
        return initSocket();
    }
    // Revive a singleton that was manually disconnected (won't auto-reconnect).
    if (socket.disconnected) {
        socket.connect();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

