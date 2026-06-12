'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { initSocket } from '@/lib/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [peers, setPeers] = useState([]);
    const [serverUrl, setServerUrl] = useState('');
    const [hostLost, setHostLost] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [newFileCount, setNewFileCount] = useState(0);

    const isGuestMode =
        typeof window !== 'undefined' && window.electronAPI?.mode === 'guest';

    const switchTimerRef = useRef(null);
    const switchDialogShownRef = useRef(false);

    useEffect(() => {
        const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        setServerUrl(url);

        const socketInstance = initSocket();
        setSocket(socketInstance);

        const handleConnect = () => {
            console.log('[SocketContext] Connected. ID:', socketInstance.id);
            setIsConnected(true);
            setHostLost(false);
            if (switchTimerRef.current) {
                clearTimeout(switchTimerRef.current);
                switchTimerRef.current = null;
            }
            switchDialogShownRef.current = false;
        };

        const handleDisconnect = (reason) => {
            console.log('[SocketContext] Disconnected. Reason:', reason);
            setIsConnected(false);
            if (!isGuestMode) return;
            setHostLost(true);
            if (!switchDialogShownRef.current) {
                switchDialogShownRef.current = true;
                switchTimerRef.current = setTimeout(() => {
                    switchTimerRef.current = null;
                    if (!socketInstance.connected && window.electronAPI?.switchToHostMode) {
                        window.electronAPI.switchToHostMode()
                            .then(result => console.log('[SocketContext] Switch result:', result))
                            .catch(err => console.error('[SocketContext] Switch error:', err));
                    }
                }, 6000);
            }
        };

        const handlePeersUpdated = (updatedPeers) => {
            setPeers(updatedPeers);
        };

        const handleConnectError = (error) => {
            console.error('[SocketContext] Connection error:', error.message);
        };

        // Badge counters — tracked here so they survive tab switches and
        // component remounts. page.js resets them when the user opens that tab.
        const handleNewMessage = () => setNewMessageCount(n => n + 1);
        const handleNewFile = () => setNewFileCount(n => n + 1);

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);
        socketInstance.on('peers-updated', handlePeersUpdated);
        socketInstance.on('connect_error', handleConnectError);
        socketInstance.on('receive-message', handleNewMessage);
        socketInstance.on('file-received', handleNewFile);

        if (socketInstance.connected) {
            setIsConnected(true);
        } else if (!socketInstance.active) {
            socketInstance.connect();
        }

        return () => {
            socketInstance.off('connect', handleConnect);
            socketInstance.off('disconnect', handleDisconnect);
            socketInstance.off('peers-updated', handlePeersUpdated);
            socketInstance.off('connect_error', handleConnectError);
            socketInstance.off('receive-message', handleNewMessage);
            socketInstance.off('file-received', handleNewFile);
            if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <SocketContext.Provider value={{
            socket, isConnected, peers, serverUrl, isGuestMode, hostLost,
            newMessageCount, setNewMessageCount,
            newFileCount, setNewFileCount,
        }}>
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

