'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initSocket } from '@/lib/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [peers, setPeers] = useState([]);
    const [serverUrl, setServerUrl] = useState('');

    useEffect(() => {
        // Determine server URL based on environment
        const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        setServerUrl(url);

        const socketInstance = initSocket();
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            console.log('[SocketContext] Connected to server');
            console.log('[SocketContext] Socket ID:', socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('[SocketContext] Disconnected from server');
            setIsConnected(false);
        });

        socketInstance.on('peers-updated', (updatedPeers) => {
            console.log('[SocketContext] Peers updated:', updatedPeers);
            setPeers(updatedPeers);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('[SocketContext] Connection error:', error);
            console.error('[SocketContext] Error message:', error.message);
        });

        // Log initial connection state
        console.log('[SocketContext] Socket initialized. Connected:', socketInstance.connected);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, peers, serverUrl }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

