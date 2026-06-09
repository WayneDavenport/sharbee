'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { v4 as uuidv4 } from 'uuid';

export default function FileTransfer() {
    const { socket, isConnected, serverUrl } = useSocket();
    const [files, setFiles] = useState([]);
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});

    useEffect(() => {
        if (!socket) return;

        // Track pending file offers
        const pendingFiles = new Map();

        // Request current history when component mounts
        socket.emit('request-sync');

        // Handle initial sync (full history)
        socket.on('initial-sync', (data) => {
            console.log('Initial sync received:', data);
            if (data.files && data.files.length > 0) {
                const initialFiles = data.files.map(file => ({
                    id: file.id,
                    name: file.fileName,
                    sender: file.sender,
                    downloadUrl: file.downloadUrl || `/download/${file.id}`,
                    size: file.fileSize,
                    timestamp: file.uploadedAt
                }));
                setReceivedFiles(initialFiles);
            }
        });

        // Handle sync response (when requesting fresh state)
        socket.on('sync-response', (data) => {
            console.log('Sync response received:', data);
            if (data.files && data.files.length > 0) {
                const syncedFiles = data.files.map(file => ({
                    id: file.id,
                    name: file.fileName,
                    sender: file.sender,
                    downloadUrl: file.downloadUrl || `/download/${file.id}`,
                    size: file.fileSize,
                    timestamp: file.uploadedAt
                }));
                setReceivedFiles(syncedFiles);
            }
        });

        socket.on('receive-file-offer', (data) => {
            console.log('Receiving file offer:', data.fileName);
            pendingFiles.set(data.id, {
                id: data.id,
                name: data.fileName,
                sender: data.sender,
                size: data.fileSize,
                uploadedAt: data.uploadedAt
            });
        });

        socket.on('file-upload-progress', (data) => {
            // Optional: Show upload progress for other users
            console.log(`File ${data.id} upload progress: ${data.receivedSize} bytes`);
        });

        socket.on('file-received', (data) => {
            const fileInfo = pendingFiles.get(data.id);
            if (fileInfo) {
                setReceivedFiles(prev => [...prev, {
                    id: data.id,
                    name: data.fileName,
                    sender: data.sender,
                    downloadUrl: data.downloadUrl,
                    size: fileInfo.size,
                    timestamp: Date.now()
                }]);

                pendingFiles.delete(data.id);
            }
        });

        socket.on('file-error', (data) => {
            console.error('File error:', data.error);
            alert(`File transfer error: ${data.error}`);
            pendingFiles.delete(data.id);
        });

        socket.on('history-cleared', () => {
            console.log('History cleared by host');
            setReceivedFiles([]);
            pendingFiles.clear();
        });

        return () => {
            socket.off('initial-sync');
            socket.off('sync-response');
            socket.off('receive-file-offer');
            socket.off('file-upload-progress');
            socket.off('file-received');
            socket.off('file-error');
            socket.off('history-cleared');
        };
    }, [socket]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        handleFiles(droppedFiles);
    }, []);

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files);
        handleFiles(selectedFiles);
    };

    const handleFiles = (selectedFiles) => {
        const newFiles = selectedFiles.map(file => ({
            id: uuidv4(),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'ready'
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const sendFile = async (fileObj) => {
        if (!socket || !isConnected) {
            alert('Not connected to server');
            return;
        }

        const { id, file } = fileObj;
        const chunkSize = 64 * 1024; // 64KB chunks
        let offset = 0;

        // Update status
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status: 'sending' } : f
        ));

        // Send file metadata
        socket.emit('send-file-offer', {
            id,
            sender: localStorage.getItem('userName') || 'Anonymous',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            timestamp: Date.now()
        });

        // Read and send file in chunks
        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            const arrayBuffer = await chunk.arrayBuffer();

            socket.emit('send-file-chunk', {
                id,
                chunk: arrayBuffer
            });

            offset += chunkSize;
            const progress = Math.min(100, Math.round((offset / file.size) * 100));
            setUploadProgress(prev => ({ ...prev, [id]: progress }));
        }

        // Notify completion
        socket.emit('file-transfer-complete', {
            id,
            fileName: file.name,
            sender: localStorage.getItem('userName') || 'Anonymous'
        });

        // Update status
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status: 'sent' } : f
        ));
        setUploadProgress(prev => ({ ...prev, [id]: 100 }));
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[id];
            return newProgress;
        });
    };

    const downloadFile = async (file) => {
        try {
            // Use the server-provided download URL
            const downloadUrl = serverUrl + file.downloadUrl;
            
            // Fetch the file as a blob
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up blob URL after a delay
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download file. Please try again.');
        }
    };

    const removeReceivedFile = (fileId) => {
        if (confirm('Remove this file from the queue?')) {
            setReceivedFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Upload Area */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-50">
                    Send Files
                </h2>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                >
                    <input
                        type="file"
                        id="fileInput"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                            Drag and drop files here
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">or</p>
                        <label
                            htmlFor="fileInput"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                            Browse Files
                        </label>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mt-4 space-y-2 pr-2" style={{ maxHeight: '16rem', overflowY: 'auto' }}>
                        {files.map((fileObj) => (
                            <div
                                key={fileObj.id}
                                className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                        {fileObj.name}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {formatFileSize(fileObj.size)}
                                    </p>
                                    {fileObj.status === 'sending' && (
                                        <div className="mt-1 w-full bg-zinc-300 dark:bg-zinc-700 rounded-full h-1.5">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                style={{ width: `${uploadProgress[fileObj.id] || 0}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    {fileObj.status === 'ready' && (
                                        <button
                                            onClick={() => sendFile(fileObj)}
                                            disabled={!isConnected}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Send
                                        </button>
                                    )}
                                    {fileObj.status === 'sent' && (
                                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Sent</span>
                                    )}
                                    {fileObj.status === 'sending' && (
                                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                            {uploadProgress[fileObj.id]}%
                                        </span>
                                    )}
                                    <button
                                        onClick={() => removeFile(fileObj.id)}
                                        className="text-zinc-500 hover:text-red-600 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Received Files */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-50">
                    Received Files
                </h2>

                {receivedFiles.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                        <p>No files received yet</p>
                    </div>
                ) : (
                    <div className="space-y-2 pr-2" style={{ maxHeight: '18rem', overflowY: 'auto' }}>
                        {receivedFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        From: {file.sender} • {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => downloadFile(file)}
                                        className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    >
                                        Download
                                    </button>
                                    <button
                                        onClick={() => removeReceivedFile(file.id)}
                                        className="text-zinc-500 hover:text-red-600 transition-colors p-1"
                                        title="Remove from queue"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

