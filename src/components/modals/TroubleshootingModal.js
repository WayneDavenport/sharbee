'use client';

import ModalWrapper from './ModalWrapper';

const tips = [
    {
        icon: '📦',
        title: 'Transferring folders',
        body: 'Sharbee transfers individual files. To send a folder, zip it first (right-click → Compress / Send to ZIP), then transfer the ZIP.',
    },
    {
        icon: '⏳',
        title: 'Large files take time to prepare',
        body: 'Files over 1 MB may take 30–60 seconds before the download dialog appears. This is normal — the file is being fetched and prepared as a blob. Do not click Download again.',
    },
    {
        icon: '📱',
        title: 'Connecting mobile devices',
        body: 'Use the QR code or the IP address URL (e.g. http://192.168.x.x:8888). Android devices do not support mDNS (.local addresses). iOS and Mac generally do.',
    },
    {
        icon: '🔍',
        title: 'Guest / Host detection',
        body: 'When Sharbee starts it scans for other hosts on your network for 3 seconds. If none are found it starts as host automatically. To force host mode, or to test without another PC, close all other Sharbee instances first.',
    },
    {
        icon: '🔥',
        title: 'Firewall blocking connections',
        body: 'If devices can\'t connect, check that Windows Defender (or your AV) allows Node.js / Sharbee through the firewall on port 8888.',
    },
    {
        icon: '🌐',
        title: 'VPN blocking connections',
        body: 'If devices can\'t connect, check that your VPN is not blocking Sharbee on port 8888.',
    },
    {
        icon: '🔄',
        title: 'Something looks broken',
        body: 'Use Menu → Refresh App to reload the UI without restarting the server. All connected peers will stay connected.',
    },
    {
        icon: '🗑️',
        title: 'Files disappear after restart',
        body: 'All files and messages are in-memory only. They are intentionally cleared when the host app closes. This is by design.',
    },
];

export default function TroubleshootingModal({ onClose }) {
    return (
        <ModalWrapper title="Troubleshooting & Tips" onClose={onClose}>
            {tips.map((tip, i) => (
                <div key={i} className="flex gap-3">
                    <span className="text-xl shrink-0">{tip.icon}</span>
                    <div>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{tip.title}</p>
                        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{tip.body}</p>
                    </div>
                </div>
            ))}
        </ModalWrapper>
    );
}
