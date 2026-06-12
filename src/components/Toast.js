'use client';

import { useEffect } from 'react';
import { useDownloads } from '@/contexts/DownloadContext';

const AUTO_DISMISS_MS = 5000;

function formatSize(bytes) {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function ToastItem({ toast }) {
    const { dismissToast } = useDownloads();
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

    useEffect(() => {
        const timer = setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [toast.id, dismissToast]);

    const openFolder = () => {
        if (isElectron && window.electronAPI?.openDownloadsFolder) {
            window.electronAPI.openDownloadsFolder();
        }
    };

    return (
        <div className="flex items-start gap-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-4 min-w-[280px] max-w-xs animate-in">
            <span className="text-green-500 text-xl shrink-0">✅</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Download complete</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">{toast.name}</p>
                {toast.size && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">{formatSize(toast.size)}</p>
                )}
                {isElectron && (
                    <button
                        onClick={openFolder}
                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        📂 Open Downloads Folder
                    </button>
                )}
            </div>
            <button
                onClick={() => dismissToast(toast.id)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg leading-none shrink-0"
            >
                ✕
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts } = useDownloads();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}
