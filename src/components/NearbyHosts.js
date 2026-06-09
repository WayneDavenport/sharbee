'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export default function NearbyHosts() {
    const { socket, isConnected } = useSocket();
    const [discoveredHosts, setDiscoveredHosts] = useState([]);
    const [isElectronHost, setIsElectronHost] = useState(false);

    useEffect(() => {
        // Check if running in Electron (host)
        setIsElectronHost(typeof window !== 'undefined' && window.electronAPI?.isElectron);
    }, []);

    useEffect(() => {
        if (!socket || !isElectronHost) return;

        // Request initial list
        socket.emit('request-discovered-hosts');

        // Listen for discovered hosts
        socket.on('hosts-discovered', (hosts) => {
            setDiscoveredHosts(hosts);
        });

        return () => {
            socket.off('hosts-discovered');
        };
    }, [socket, isElectronHost]);

    if (!isElectronHost || discoveredHosts.length === 0) {
        return null; // Only show for Electron hosts with discovered hosts
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    🌐 Nearby Sharbee Hosts
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {discoveredHosts.length} found
                </span>
            </div>

            <div className="space-y-2">
                {discoveredHosts.map((host) => (
                    <div
                        key={host.id}
                        className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Online" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                🖥️ {host.name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {host.url}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 text-center">
                💡 These hosts are available on your network. To connect as a guest, restart the app and select "Connect as Guest" when prompted.
            </p>
        </div>
    );
}
