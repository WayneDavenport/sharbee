'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { v4 as uuidv4 } from 'uuid';
import { alertDialog } from '@/lib/dialogs';

export default function Chat() {
    const { socket, isConnected, peers } = useSocket();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    // messagesEndRef removed - no longer needed without auto-scroll
    const [userName, setUserName] = useState('');

    useEffect(() => {
        // Load username from localStorage
        const savedName = localStorage.getItem('userName') || 'Anonymous';
        setUserName(savedName);
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Request current history when component mounts
        socket.emit('request-sync');

        const handleInitialSync = (data) => {
            console.log('Initial sync received:', data);
            if (data.messages && data.messages.length > 0) setMessages(data.messages);
        };
        const handleSyncResponse = (data) => {
            console.log('Sync response received:', data);
            if (data.messages) setMessages(data.messages);
        };
        const handleReceiveMessage = (data) => setMessages(prev => [...prev, data]);
        const handleHistoryCleared = () => { console.log('History cleared by host'); setMessages([]); };

        socket.on('initial-sync', handleInitialSync);
        socket.on('sync-response', handleSyncResponse);
        socket.on('receive-message', handleReceiveMessage);
        socket.on('history-cleared', handleHistoryCleared);

        return () => {
            socket.off('initial-sync', handleInitialSync);
            socket.off('sync-response', handleSyncResponse);
            socket.off('receive-message', handleReceiveMessage);
            socket.off('history-cleared', handleHistoryCleared);
        };
    }, [socket]);

    // Auto-scroll removed per user request - was causing entire app to scroll
    // useEffect(() => {
    //     scrollToBottom();
    // }, [messages]);

    // const scrollToBottom = () => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // };

    const sendMessage = (e) => {
        if (e) e.preventDefault();

        if (!inputMessage.trim()) return;

        if (!socket || !isConnected) {
            alertDialog('Not connected. Please wait for connection.');
            return;
        }

        const message = {
            id: uuidv4(),
            sender: userName,
            message: inputMessage.trim(),
            timestamp: Date.now()
        };

        socket.emit('send-message', message);
        setInputMessage('');
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
            <div className="mb-4 space-y-3 pr-2" style={{ minHeight: '12rem', maxHeight: 'calc(100vh - 28rem)', overflowY: 'scroll' }}>
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
                    </>
                )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex gap-2 shrink-0">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isConnected ? "Type a message..." : "Reconnecting..."}
                    className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-50"
                />
                <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

