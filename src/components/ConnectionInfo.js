'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import QRCode from 'qrcode';

export default function ConnectionInfo() {
    const { isConnected, peers } = useSocket();
    const [networkInfo, setNetworkInfo] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        // Fetch network info from server
        fetch('/api/network-info')
            .then(res => res.json())
            .then(info => {
                setNetworkInfo(info);
                
                // Generate QR code with IP address (best for mobile)
                QRCode.toDataURL(info.networkUrl, { width: 300, margin: 2 })
                    .then(setQrCodeUrl)
                    .catch(console.error);
            })
            .catch(err => {
                console.error('Failed to fetch network info:', err);
                // Fallback to current URL
                const fallbackUrl = typeof window !== 'undefined' ? window.location.href : '';
                setNetworkInfo({
                    networkUrl: fallbackUrl,
                    localUrl: fallbackUrl,
                    mdnsUrl: 'http://sharbee.local:3000'
                });
                QRCode.toDataURL(fallbackUrl, { width: 300, margin: 2 })
                    .then(setQrCodeUrl)
                    .catch(console.error);
            });
    }, []);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('URL copied to clipboard!');
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Connection Status
                </h3>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    {networkInfo?.hostname && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Host: {networkInfo.hostname}
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {/* Connection URLs */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block">
                        Connection URLs:
                    </label>
                    
                    {/* IP Address - Primary for mobile */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                📱 RECOMMENDED FOR MOBILE
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={networkInfo?.networkUrl || 'Loading...'}
                                readOnly
                                className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(networkInfo?.networkUrl)}
                                disabled={!networkInfo}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Copy
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            ✅ Works on all devices (iOS, Android, Windows, Mac, Linux)
                        </p>
                    </div>

                    {/* mDNS Address */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                🖥️ EASY ADDRESS (LIMITED SUPPORT)
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={networkInfo?.mdnsUrl || 'http://sharbee.local:3000'}
                                readOnly
                                className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(networkInfo?.mdnsUrl)}
                                disabled={!networkInfo}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Copy
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            ✅ iOS, Mac, Windows (with Bonjour) • ❌ Android
                        </p>
                    </div>

                    {/* Localhost */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                💻 THIS DEVICE ONLY
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={networkInfo?.localUrl || 'http://localhost:3000'}
                                readOnly
                                className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(networkInfo?.localUrl)}
                                disabled={!networkInfo}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Copy
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Only accessible from this computer
                        </p>
                    </div>
                </div>

                {/* QR Code */}
                <div>
                    <button
                        onClick={() => setShowQR(!showQR)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                        <span>📱</span>
                        <span>{showQR ? 'Hide' : 'Show'} QR Code for Mobile</span>
                    </button>
                    {showQR && qrCodeUrl && (
                        <div className="mt-3 flex flex-col items-center">
                            <img src={qrCodeUrl} alt="QR Code" className="rounded-lg border-2 border-blue-500 dark:border-blue-400" />
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 text-center">
                                Scan with phone camera<br />
                                <span className="font-semibold">Uses IP address (works on all phones)</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Connected Peers */}
                <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                        Connected Peers: {peers.length}
                    </label>
                    {peers.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {peers.map((peer) => (
                                <div
                                    key={peer.id}
                                    className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                                >
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-sm text-zinc-900 dark:text-zinc-50">
                                        {peer.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                            No peers connected yet
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

