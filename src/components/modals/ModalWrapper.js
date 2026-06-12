'use client';

import { useEffect } from 'react';

export default function ModalWrapper({ title, onClose, children }) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                {/* Content */}
                <div className="overflow-y-auto px-6 py-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
