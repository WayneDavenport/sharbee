'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { v4 as uuidv4 } from 'uuid';

export default function Chat() {
    const { socket, isConnected, peers } = useSocket();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [userName, setUserName] = useState('');
    const [discoveredHosts, setDiscoveredHosts] = useState([]);
    const [selectedHost, setSelectedHost] = useState(null);

    useEffect(() => {
        // Load username from localStorage
        const savedName = localStorage.getItem('userName') || 'Anonymous';
        setUserName(savedName);
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Request current history when component mounts
        socket.emit('request-sync');

        // Handle initial sync (full history)
        socket.on('initial-sync', (data) => {
            console.log('Initial sync received:', data);
            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages);
            }
        });

        // Handle sync response (when requesting fresh state)
        socket.on('sync-response', (data) => {
            console.log('Sync response received:', data);
            if (data.messages) {
                setMessages(data.messages);
            }
        });

        socket.on('receive-message', (data) => {
            setMessages(prev => [...prev, data]);
        });

        socket.on('history-cleared', () => {
            console.log('History cleared by host');
            setMessages([]);
        });

        // Listen for discovered hosts (Federation)
        socket.on('hosts-discovered', (hosts) => {
            setDiscoveredHosts(hosts);
        });

        // Listen for host send results
        socket.on('host-send-result', (result) => {
            if (result.type === 'message') {
                if (result.success) {
                    alert(`✅ Message sent to ${result.hostId}!`);
                } else {
                    alert(`❌ Failed to send message: ${result.error}`);
                }
            }
        });

        return () => {
            socket.off('initial-sync');
            socket.off('sync-response');
            socket.off('receive-message');
            socket.off('history-cleared');
            socket.off('hosts-discovered');
            socket.off('host-send-result');
        };
    }, [socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = (e, targetHostId = null) => {
        if (e) e.preventDefault();

        if (!inputMessage.trim()) return;
        
        // Allow sending if either connected to own server OR if there are discovered hosts
        if (!socket || (!isConnected && discoveredHosts.length === 0)) {
            alert('Not connected. Please wait for connection or host discovery.');
            return;
        }

        const message = {
            id: uuidv4(),
            sender: userName,
            message: inputMessage.trim(),
            timestamp: Date.now()
        };

        if (targetHostId) {
            // Send to specific host
            socket.emit('send-message-to-host', { hostId: targetHostId, message });
        } else {
            // Broadcast to all
            socket.emit('send-message', message);
        }
        
        setInputMessage('');
        setSelectedHost(null);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isMyMessage = (sender) => {
        return sender === userName;
    };

    return (
        <div className="h-full flex flex-col md:overflow-hidden">
            {/* Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4 shrink-0">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Chat
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {peers.length > 0 ? `${peers.length} peer${peers.length !== 1 ? 's' : ''} connected` : 'No peers connected'}
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 mb-4 space-y-3 pr-2 min-h-[300px] md:min-h-0 md:overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-zinc-500 dark:text-zinc-400 text-center">
                            No messages yet.<br />
                            Start the conversation!
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${isMyMessage(msg.sender) ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMyMessage(msg.sender)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                                        }`}
                                >
                                    {!isMyMessage(msg.sender) && (
                                        <p className="text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                                            {msg.sender}
                                        </p>
                                    )}
                                    <p className="text-sm wrap-break-word">{msg.message}</p>
                                    <p className={`text-xs mt-1 ${isMyMessage(msg.sender)
                                        ? 'text-blue-200'
                                        : 'text-zinc-500 dark:text-zinc-500'
                                        }`}>
                                        {formatTime(msg.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="shrink-0">
                {/* Host selector (if hosts available) */}
                {discoveredHosts.length > 0 && (
                    <div className="mb-2 flex items-center gap-2">
                        <label className="text-xs text-zinc-600 dark:text-zinc-400">
                            Send to:
                        </label>
                        <select
                            value={selectedHost || ''}
                            onChange={(e) => setSelectedHost(e.target.value || null)}
                            className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-50"
                        >
                            <option value="">Everyone (broadcast)</option>
                            {discoveredHosts.map(host => (
                                <option key={host.id} value={host.id}>
                                    🖥️ {host.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <form onSubmit={(e) => sendMessage(e, selectedHost)} className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={isConnected || discoveredHosts.length > 0 ? "Type a message..." : "Connecting..."}
                        disabled={!isConnected && discoveredHosts.length === 0}
                        className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={(!isConnected && discoveredHosts.length === 0) || !inputMessage.trim()}
                        className={`px-6 py-3 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${
                            selectedHost ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                    >
                        {selectedHost ? 'Send to Host' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}

