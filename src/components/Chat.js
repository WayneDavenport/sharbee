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

        return () => {
            socket.off('initial-sync');
            socket.off('sync-response');
            socket.off('receive-message');
            socket.off('history-cleared');
        };
    }, [socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = (e) => {
        if (e) e.preventDefault();

        if (!inputMessage.trim()) return;
        
        if (!socket || !isConnected) {
            alert('Not connected. Please wait for connection.');
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

