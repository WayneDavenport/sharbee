'use client';

import { useState, useEffect } from 'react';

export default function UpdateBadge() {
    const [updateInfo, setUpdateInfo] = useState(null); // null = no update, object = ready
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI?.onUpdateReady) return;

        window.electronAPI.onUpdateReady((info) => {
            console.log('[UpdateBadge] Update ready:', info?.releaseName);
            setUpdateInfo(info || {});
        });

        // Mirror main-process updater diagnostics into the DevTools console
        if (window.electronAPI.onUpdaterStatus) {
            window.electronAPI.onUpdaterStatus(({ stage, detail }) => {
                console.log(`[Updater] ${stage}`, detail ?? '');
            });
        }
    }, []);

    if (!updateInfo) return null;

    const handleApply = async () => {
        setApplying(true);
        // Short delay so the button state renders before the app quits
        setTimeout(() => {
            window.electronAPI?.applyUpdate();
        }, 150);
    };

    return (
        <div className="relative flex items-center">
            <button
                onClick={handleApply}
                disabled={applying}
                title={updateInfo.releaseName ? `Version ${updateInfo.releaseName} is ready` : 'Update ready — click to restart'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {/* Pulsing dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <span>{applying ? 'Restarting…' : 'Update ready'}</span>
            </button>
        </div>
    );
}
