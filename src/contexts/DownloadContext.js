'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const DownloadContext = createContext(null);

export function DownloadProvider({ children }) {
    const [downloads, setDownloads] = useState([]); // session history, newest first
    const [toasts, setToasts] = useState([]);        // active toast notifications

    const addDownload = useCallback((fileInfo) => {
        const entry = {
            id: `dl-${Date.now()}-${Math.random()}`,
            name: fileInfo.name,
            size: fileInfo.size,
            timestamp: Date.now(),
        };
        setDownloads(prev => [entry, ...prev]);
        setToasts(prev => [...prev, entry]);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearDownloads = useCallback(() => {
        setDownloads([]);
    }, []);

    return (
        <DownloadContext.Provider value={{ downloads, addDownload, toasts, dismissToast, clearDownloads }}>
            {children}
        </DownloadContext.Provider>
    );
}

export const useDownloads = () => {
    const ctx = useContext(DownloadContext);
    if (!ctx) throw new Error('useDownloads must be used within DownloadProvider');
    return ctx;
};
