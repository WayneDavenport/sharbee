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

    // Read guest mode directly from electronAPI — never changes at runtime so
    // no need for state; a plain derived value is fine.
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

            // Cancel any pending switch-to-host timer on reconnect
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

            // Show the in-app "host lost" banner immediately
            setHostLost(true);
            console.log('[SocketContext] Guest: host lost. Waiting 6s before offering switch...');

            // After 6 seconds, if still disconnected, trigger the switch dialog.
            // Socket.io only fires 'disconnect' once per connection loss (then it
            // silently retries), so we must use a timer rather than a counter.
            if (!switchDialogShownRef.current) {
                switchDialogShownRef.current = true;
                switchTimerRef.current = setTimeout(() => {
                    switchTimerRef.current = null;
                    if (!socketInstance.connected && window.electronAPI?.switchToHostMode) {
                        console.log('[SocketContext] Triggering switch-to-host dialog');
                        window.electronAPI.switchToHostMode()
                            .then(result => console.log('[SocketContext] Switch result:', result))
                            .catch(err => console.error('[SocketContext] Switch error:', err));
                    }
                }, 6000);
            }
        };

        const handlePeersUpdated = (updatedPeers) => {
            console.log('[SocketContext] Peers updated:', updatedPeers);
            setPeers(updatedPeers);
        };

        const handleConnectError = (error) => {
            console.error('[SocketContext] Connection error:', error.message);
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);
        socketInstance.on('peers-updated', handlePeersUpdated);
        socketInstance.on('connect_error', handleConnectError);

        if (socketInstance.connected) {
            console.log('[SocketContext] Already connected on mount');
            setIsConnected(true);
        } else if (!socketInstance.active) {
            console.log('[SocketContext] Socket idle on mount, reconnecting');
            socketInstance.connect();
        }

        return () => {
            socketInstance.off('connect', handleConnect);
            socketInstance.off('disconnect', handleDisconnect);
            socketInstance.off('peers-updated', handlePeersUpdated);
            socketInstance.off('connect_error', handleConnectError);
            if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <SocketContext.Provider value={{ socket, isConnected, peers, serverUrl, isGuestMode, hostLost }}>
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

