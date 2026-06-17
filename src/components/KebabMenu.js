'use client';

import { useState, useRef, useEffect } from 'react';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

export default function KebabMenu({ onOpenTroubleshooting, onOpenContact, onOpenLegal, onChangeName }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const action = (fn) => {
        setOpen(false);
        fn();
    };

    const importFiles = () => {
        setOpen(false);
        window.dispatchEvent(new CustomEvent('sharbee:import-files'));
    };

    const sendAll = () => {
        setOpen(false);
        window.dispatchEvent(new CustomEvent('sharbee:send-all'));
    };

    const refresh = () => {
        setOpen(false);
        if (isElectron && window.electronAPI?.refreshApp) {
            window.electronAPI.refreshApp();
        } else {
            window.location.reload();
        }
    };

    const exit = () => {
        setOpen(false);
        if (isElectron && window.electronAPI?.exitApp) {
            window.electronAPI.exitApp();
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Menu"
                aria-expanded={open}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xl font-bold"
            >
                ⋮
            </button>

            {open && (
                <div className="absolute right-0 top-11 z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Actions group */}
                    <div className="px-3 pt-3 pb-1">
                        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide px-1 mb-1">Actions</p>
                        <MenuItem icon="✏️" label="Change Name" onClick={() => action(onChangeName)} />
                        <MenuItem icon="📂" label="Import Files" onClick={importFiles} />
                        <MenuItem icon="🚀" label="Send All" onClick={sendAll} />
                        <MenuItem icon="🔄" label="Refresh App" onClick={refresh} />
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 mx-3 my-1" />

                    {/* Help group */}
                    <div className="px-3 pb-1">
                        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide px-1 mb-1">Help & Info</p>
                        <MenuItem icon="🛠️" label="Troubleshooting & Tips" onClick={() => action(onOpenTroubleshooting)} />
                        <MenuItem icon="✉️" label="Contact" onClick={() => action(onOpenContact)} />
                        <MenuItem icon="📄" label="Legal / Disclaimer" onClick={() => action(onOpenLegal)} />
                    </div>

                    {/* Exit — only in Electron */}
                    {isElectron && (
                        <>
                            <div className="border-t border-zinc-100 dark:border-zinc-800 mx-3 my-1" />
                            <div className="px-3 pb-3">
                                <MenuItem icon="🚪" label="Exit" onClick={exit} danger />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function MenuItem({ icon, label, onClick, danger = false }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-left ${danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
        >
            <span>{icon}</span>
            {label}
        </button>
    );
}
