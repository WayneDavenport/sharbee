'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { confirmDialog, alertDialog } from '@/lib/dialogs';
import { v4 as uuidv4 } from 'uuid';

export default function FileTransfer() {
    const { socket, isConnected, serverUrl } = useSocket();
    const { addDownload } = useDownloads();
    const fileInputRef = useRef(null);
    // Maps fileId → filename for files currently being downloaded; used by the
    // onDownloadComplete effect to clear the button even though it closes over
    // a stale `downloadingFiles` set.
    const downloadingFileNamesRef = useRef(new Map());
    const [files, setFiles] = useState([]);
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [downloadingFiles, setDownloadingFiles] = useState(new Set());
    const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
    const [showOwnFiles, setShowOwnFiles] = useState(false); // Toggle to show files user sent
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const savedName = localStorage.getItem('userName') || 'Anonymous';
        setUserName(savedName);
    }, []);

    // Global menu events: "Import Files" and "Send All"
    useEffect(() => {
        const handleImport = () => {
            fileInputRef.current?.click();
        };
        const handleSendAll = () => {
            setFiles(prev => {
                const readyFiles = prev.filter(f => f.status === 'ready');
                readyFiles.forEach(f => sendFile(f));
                return prev;
            });
        };
        window.addEventListener('sharbee:import-files', handleImport);
        window.addEventListener('sharbee:send-all', handleSendAll);
        return () => {
            window.removeEventListener('sharbee:import-files', handleImport);
            window.removeEventListener('sharbee:send-all', handleSendAll);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, isConnected]);

    // Electron streamed-download completion → fire the toast / downloads history
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI?.onDownloadComplete) return;
        window.electronAPI.onDownloadComplete((info) => {
            addDownload({ name: info.name, size: info.size, path: info.path });
            // Clear the button for whichever file this download belongs to.
            setDownloadingFiles(prev => {
                const s = new Set(prev);
                for (const [id, name] of downloadingFileNamesRef.current.entries()) {
                    if (name === info.name) {
                        downloadingFileNamesRef.current.delete(id);
                        s.delete(id);
                    }
                }
                return s;
            });
        });
        if (window.electronAPI.onDownloadFailed) {
            window.electronAPI.onDownloadFailed((info) => {
                if (info.state !== 'cancelled') {
                    alertDialog(`Download failed: ${info.name}`);
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Track pending file offers
        const pendingFiles = new Map();

        // Request current history when component mounts
        socket.emit('request-sync');

        const handleInitialSync = (data) => {
            console.log('Initial sync received:', data);
            if (data.files && data.files.length > 0) {
                setReceivedFiles(data.files.map(file => ({
                    id: file.id, name: file.fileName, sender: file.sender,
                    downloadUrl: file.downloadUrl || `/download/${file.id}`,
                    size: file.fileSize, timestamp: file.uploadedAt
                })));
            }
        };
        const handleSyncResponse = (data) => {
            console.log('Sync response received:', data);
            if (data.files && data.files.length > 0) {
                setReceivedFiles(data.files.map(file => ({
                    id: file.id, name: file.fileName, sender: file.sender,
                    downloadUrl: file.downloadUrl || `/download/${file.id}`,
                    size: file.fileSize, timestamp: file.uploadedAt
                })));
            }
        };
        const handleFileOffer = (data) => {
            console.log('Receiving file offer:', data.fileName);
            pendingFiles.set(data.id, {
                id: data.id, name: data.fileName, sender: data.sender,
                size: data.fileSize, uploadedAt: data.uploadedAt
            });
        };
        const handleUploadProgress = (data) => {
            console.log(`File ${data.id} upload progress: ${data.receivedSize} bytes`);
        };
        const handleFileReceived = (data) => {
            const fileInfo = pendingFiles.get(data.id);
            if (fileInfo) {
                setReceivedFiles(prev => [...prev, {
                    id: data.id, name: data.fileName, sender: data.sender,
                    downloadUrl: data.downloadUrl, size: fileInfo.size, timestamp: Date.now()
                }]);
                pendingFiles.delete(data.id);
            }
        };
        const handleFileError = (data) => {
            console.error('File error:', data.error);
            alertDialog(`File transfer error: ${data.error}`);
            pendingFiles.delete(data.id);
        };
        const handleHistoryCleared = () => {
            console.log('History cleared by host');
            setReceivedFiles([]);
            pendingFiles.clear();
        };

        socket.on('initial-sync', handleInitialSync);
        socket.on('sync-response', handleSyncResponse);
        socket.on('receive-file-offer', handleFileOffer);
        socket.on('file-upload-progress', handleUploadProgress);
        socket.on('file-received', handleFileReceived);
        socket.on('file-error', handleFileError);
        socket.on('history-cleared', handleHistoryCleared);

        return () => {
            socket.off('initial-sync', handleInitialSync);
            socket.off('sync-response', handleSyncResponse);
            socket.off('receive-file-offer', handleFileOffer);
            socket.off('file-upload-progress', handleUploadProgress);
            socket.off('file-received', handleFileReceived);
            socket.off('file-error', handleFileError);
            socket.off('history-cleared', handleHistoryCleared);
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
            alertDialog('Not connected to server');
            return;
        }

        const { id, file } = fileObj;
        const chunkSize = 64 * 1024; // 64KiB — efficient for socket framing
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

        try {
            // Stream the file in chunks. We read each slice straight off disk
            // (file.slice doesn't load the whole file into memory) and wait for
            // the host to acknowledge each chunk before sending the next. That
            // ack-gated loop is our backpressure — it paces the sender to the
            // host's disk write speed so neither side buffers the whole file.
            while (offset < file.size) {
                const chunk = file.slice(offset, offset + chunkSize);
                const arrayBuffer = await chunk.arrayBuffer();

                // emitWithAck resolves when the host has flushed this chunk to disk
                const res = await socket.emitWithAck('send-file-chunk', {
                    id,
                    chunk: arrayBuffer
                });

                if (res && res.ok === false) {
                    throw new Error(res.error || 'Host rejected chunk');
                }

                offset += chunkSize;
                const progress = Math.min(100, Math.round((offset / file.size) * 100));
                setUploadProgress(prev => ({ ...prev, [id]: progress }));
            }
        } catch (err) {
            console.error('File transfer failed:', err);
            setFiles(prev => prev.map(f =>
                f.id === id ? { ...f, status: 'ready' } : f
            ));
            alertDialog(`Transfer failed: ${err.message || 'connection lost'}`);
            return;
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
        const fileToRemove = files.find(f => f.id === id);
        
        // If file was sent, allow it to be resent instead of removing
        if (fileToRemove && fileToRemove.status === 'sent') {
            setFiles(prev => prev.map(f =>
                f.id === id ? { ...f, status: 'ready' } : f
            ));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[id];
                return newProgress;
            });
        } else {
            // For unsent files, remove them
            setFiles(prev => prev.filter(f => f.id !== id));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[id];
                return newProgress;
            });
        }
    };

    const downloadFile = (file) => {
        if (downloadingFiles.has(file.id)) return;

        const downloadUrl = serverUrl + file.downloadUrl;
        const isElectron = typeof window !== 'undefined' && window.electronAPI?.downloadFile;

        // Disable the button immediately to prevent double-clicks.
        setDownloadingFiles(prev => new Set(prev).add(file.id));
        downloadingFileNamesRef.current.set(file.id, file.name);

        const clearDownloading = () => {
            downloadingFileNamesRef.current.delete(file.id);
            setDownloadingFiles(prev => {
                const s = new Set(prev);
                s.delete(file.id);
                return s;
            });
        };

        try {
            if (isElectron) {
                // Electron: stream to the Downloads folder via the native download
                // manager. Completion is reported via the 'download-complete' IPC
                // event (handled in the effect below, which also fires the toast).
                // The effect clears the button via downloadingFileNamesRef.
                // 10 s fallback in case the event never fires.
                window.electronAPI.downloadFile(downloadUrl);
                setTimeout(clearDownloading, 10000);
            } else {
                // Browser guests: a direct anchor streams the file natively.
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                addDownload({ name: file.name, size: file.size });
                setTimeout(clearDownloading, 2000);
            }
        } catch (error) {
            console.error('Download error:', error);
            clearDownloading();
            alertDialog('Failed to download file. Please try again.');
        }
    };

    const removeReceivedFile = async (fileId) => {
        if (await confirmDialog('Remove this file from the queue?')) {
            setReceivedFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    const clearSentFiles = async () => {
        const sentCount = files.filter(f => f.status === 'sent').length;
        if (sentCount === 0) return;

        if (await confirmDialog(`Clear ${sentCount} sent file(s) from the list?`)) {
            setFiles(prev => prev.filter(f => f.status !== 'sent'));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Large File Warning Banner */}
            {showLargeFileWarning && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
                    <span className="text-lg">⏳</span>
                    <p>
                        <strong>Large file detected!</strong> Files over 1MB may take 30-60 seconds to prepare for download. Please wait for the download to start.
                    </p>
                </div>
            )}

            {/* Upload Area */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Send Files
                    </h2>
                    {files.some(f => f.status === 'sent') && (
                        <button
                            onClick={clearSentFiles}
                            className="text-xs px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                            Clear Sent ({files.filter(f => f.status === 'sent').length})
                        </button>
                    )}
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        id="fileInput"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    <div className="flex items-center justify-center gap-4">
                        <svg className="w-8 h-8 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Drag and drop files here
                        </p>
                        <label
                            htmlFor="fileInput"
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shrink-0"
                        >
                            Browse
                        </label>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mt-4 space-y-2 pr-2" style={{ maxHeight: '30vh', overflowY: 'scroll' }}>
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
                                        title={fileObj.status === 'sent' ? 'Click to reset and resend' : 'Remove from queue'}
                                    >
                                        {fileObj.status === 'sent' ? '↻' : '✕'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Received Files */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Received Files
                    </h2>
                    {receivedFiles.some(f => f.sender === userName) && (
                        <button
                            onClick={() => setShowOwnFiles(!showOwnFiles)}
                            className="text-xs px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                            {showOwnFiles ? 'Hide' : 'Show'} My Files ({receivedFiles.filter(f => f.sender === userName).length})
                        </button>
                    )}
                </div>

                {(() => {
                    const filteredFiles = showOwnFiles 
                        ? receivedFiles 
                        : receivedFiles.filter(file => file.sender !== userName);
                    
                    return filteredFiles.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                            <p>No files received yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2 pr-2" style={{ maxHeight: '30vh', overflowY: 'scroll' }}>
                            {filteredFiles.map((file) => (
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
                                        disabled={downloadingFiles.has(file.id)}
                                        className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {downloadingFiles.has(file.id) ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Starting…</span>
                                            </>
                                        ) : (
                                            'Download'
                                        )}
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
                    );
                })()}
            </div>
        </div>
    );
}

