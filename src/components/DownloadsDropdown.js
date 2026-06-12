'use client';

import { useState, useRef, useEffect } from 'react';
import { useDownloads } from '@/contexts/DownloadContext';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

function formatSize(bytes) {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function timeLabel(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} mins ago`;
    return `${Math.floor(mins / 60)}h ago`;
}

export default function DownloadsDropdown() {
    const { downloads, clearDownloads } = useDownloads();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const openDownloadsFolder = () => {
        if (isElectron && window.electronAPI?.openDownloadsFolder) {
            window.electronAPI.openDownloadsFolder();
        }
    };

    const count = downloads.length;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-label={`Downloads${count > 0 ? ` (${count})` : ''}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    count > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
            >
                <span>⬇</span>
                <span>Downloads{count > 0 ? ` (${count})` : ''}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-11 z-50 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Session Downloads
                        </p>
                        {count > 0 && (
                            <button
                                onClick={clearDownloads}
                                className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {count === 0 ? (
                        <div className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500 text-sm">
                            <p className="text-2xl mb-2">📭</p>
                            <p>No files downloaded yet this session</p>
                        </div>
                    ) : (
                        <div className="max-h-72 overflow-y-auto">
                            {downloads.map((dl) => (
                                <div
                                    key={dl.id}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <span className="text-green-500 text-lg shrink-0">✅</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{dl.name}</p>
                                        <p className="text-xs text-zinc-400">
                                            {dl.size ? formatSize(dl.size) : ''}{dl.size ? ' · ' : ''}{timeLabel(dl.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Open Downloads Folder — Electron only */}
                    {isElectron && (
                        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                onClick={() => { setOpen(false); openDownloadsFolder(); }}
                                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline text-center font-medium"
                            >
                                📂 Open Downloads Folder
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
