'use client';

import ModalWrapper from './ModalWrapper';

export default function LegalModal({ onClose }) {
    return (
        <ModalWrapper title="About & Legal" onClose={onClose}>
            {/* About */}
            <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">About Sharbee</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                    Sharbee is a local-first file transfer and chat application. It runs entirely on your local Wi-Fi
                    network with no cloud services, no accounts, and no internet required.
                </p>
                <p className="text-zinc-500 dark:text-zinc-500 mt-1 text-xs">
                    Version 1.0.0 · Built with Electron, Next.js, and Socket.io
                </p>
            </div>

            <hr className="border-zinc-200 dark:border-zinc-700" />

            {/* Privacy */}
            <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Privacy</h3>
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                    <li>All data stays on your local network. Nothing is sent to any server.</li>
                    <li>Files and messages are stored in memory only and deleted when the host app closes.</li>
                    <li>No analytics, tracking, or telemetry of any kind.</li>
                    <li>No user accounts or registration required.</li>
                </ul>
            </div>

            <hr className="border-zinc-200 dark:border-zinc-700" />

            {/* Disclaimer */}
            <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Disclaimer</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                    Sharbee is provided &quot;as is&quot; without warranty of any kind, express or implied. The authors are not
                    responsible for any loss of data, security breaches, or damages arising from use of this software.
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                    Sharbee is designed for use on trusted local networks (home, office). Do not use it on public or
                    untrusted networks. There is no authentication — anyone on your network can connect.
                </p>
            </div>

            <hr className="border-zinc-200 dark:border-zinc-700" />

            {/* License */}
            <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">License</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                    © {new Date().getFullYear()} Sharbee. All rights reserved. Private use only.
                </p>
            </div>
        </ModalWrapper>
    );
}
