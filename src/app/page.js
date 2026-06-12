'use client';

import { useState, useEffect, useRef } from 'react';
import FileTransfer from '@/components/FileTransfer';
import Chat from '@/components/Chat';
import ConnectionInfo from '@/components/ConnectionInfo';
import NearbyHosts from '@/components/NearbyHosts';
import KebabMenu from '@/components/KebabMenu';
import DownloadsDropdown from '@/components/DownloadsDropdown';
import UpdateBadge from '@/components/UpdateBadge';
import ToastContainer from '@/components/Toast';
import TroubleshootingModal from '@/components/modals/TroubleshootingModal';
import ContactModal from '@/components/modals/ContactModal';
import LegalModal from '@/components/modals/LegalModal';
import { useSocket } from '@/contexts/SocketContext';
import { confirmDialog, alertDialog } from '@/lib/dialogs';

export default function Home() {
  const [activeTab, setActiveTab] = useState('files');
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const prevNameRef = useRef(''); // keeps the last known name so Cancel can restore it
  const nameInputRef = useRef(null);

  // Modal state
  const [modal, setModal] = useState(null); // 'troubleshooting' | 'contact' | 'legal' | null

  const {
    isGuestMode, hostLost, isConnected,
    newMessageCount, setNewMessageCount,
    newFileCount, setNewFileCount,
  } = useSocket();

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      prevNameRef.current = savedName;
      setUserName(savedName);
      setIsNameSet(true);
      if (typeof window !== 'undefined') {
        const { getSocket } = require('@/lib/socket');
        getSocket().emit('register-peer', { name: savedName });
      }
    }
  }, []);

  // Focus the input when the app first loads with no saved name
  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (!savedName) {
      setTimeout(() => { window.focus(); nameInputRef.current?.focus(); }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      prevNameRef.current = userName.trim();
      localStorage.setItem('userName', userName.trim());
      setIsNameSet(true);
      const { getSocket } = require('@/lib/socket');
      const socket = getSocket();
      socket.emit('register-peer', { name: userName.trim() });
    }
  };

  // Go back to the main UI without saving a new name
  const handleCancelNameChange = () => {
    // Restore to whatever was last saved (in case the user started typing)
    setUserName(prevNameRef.current || localStorage.getItem('userName') || '');
    setIsNameSet(true);
  };

  // ─── Name entry screen ─────────────────────────────────────────────────────
  if (!isNameSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-zinc-200 dark:border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600 mb-2">
              Sharbee
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Local File Transfer & Chat
            </p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {prevNameRef.current ? 'Change your name' : 'Enter your name'}
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-50"
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
            >
              Continue
            </button>
            {/* Cancel button — only shown when changing an existing name */}
            {prevNameRef.current && (
              <button
                type="button"
                onClick={handleCancelNameChange}
                className="w-full px-6 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                ← Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ─── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* ── Slim top bar ─────────────────────────────────────────────────── */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
              Sharbee
            </span>
            <span className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5">
              Welcome, {userName}
            </span>
          </div>

          {/* Right-side controls */}
          <div className="flex items-center gap-2">
            {/* Clear All History (host/Electron only) */}
            {typeof window !== 'undefined' && window.electronAPI?.isElectron && !isGuestMode && (
              <button
                onClick={async () => {
                  if (await confirmDialog('Clear ALL messages and files? This cannot be undone!')) {
                    try {
                      const response = await fetch('/api/clear-all', { method: 'POST' });
                      const data = await response.json();
                      await alertDialog(`Cleared ${data.messagesCleared} messages and ${data.filesCleared} files`);
                    } catch (error) {
                      console.error('Failed to clear history:', error);
                      await alertDialog('Failed to clear history');
                    }
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                title="Clear all session history"
              >
                🗑️ Clear
              </button>
            )}

            {/* Change name */}
            <button
              onClick={() => {
                // No confirm needed — the name form has a Cancel button, and
                // window.confirm() breaks keyboard input in Electron anyway.
                setIsNameSet(false);
                setTimeout(() => nameInputRef.current?.select(), 80);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Change display name"
            >
              ✏️ Name
            </button>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

            {/* Update badge — only visible when a download is staged and ready */}
            <UpdateBadge />

            {/* Downloads dropdown */}
            <DownloadsDropdown />

            {/* Kebab menu */}
            <KebabMenu
              onOpenTroubleshooting={() => setModal('troubleshooting')}
              onOpenContact={() => setModal('contact')}
              onOpenLegal={() => setModal('legal')}
            />
          </div>
        </div>
      </header>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Host-lost banner */}
          {isGuestMode && hostLost && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-200">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">Host disconnected</p>
                <p className="text-xs mt-0.5">
                  {isConnected
                    ? 'Reconnected successfully.'
                    : 'Attempting to reconnect… A dialog will appear shortly with your options.'}
                </p>
              </div>
              {isConnected && (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Back online</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => { setActiveTab('files'); setNewFileCount(0); }}
                    className={`flex-1 px-6 py-4 font-medium transition-colors relative ${activeTab === 'files'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    📁 Files
                    {newFileCount > 0 && activeTab !== 'files' && (
                      <span className="absolute top-2 right-2 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center text-white text-xs font-bold">
                          {newFileCount > 9 ? '9+' : newFileCount}
                        </span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { setActiveTab('chat'); setNewMessageCount(0); }}
                    className={`flex-1 px-6 py-4 font-medium transition-colors relative ${activeTab === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    💬 Chat
                    {newMessageCount > 0 && activeTab !== 'chat' && (
                      <span className="absolute top-2 right-2 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center text-white text-xs font-bold">
                          {newMessageCount > 9 ? '9+' : newMessageCount}
                        </span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Tab content */}
                <div className="p-6 h-auto md:h-[calc(100vh-16rem)]">
                  <div style={{ display: activeTab === 'files' ? 'block' : 'none' }}>
                    <FileTransfer />
                  </div>
                  <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
                    <Chat />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <ConnectionInfo />
              <NearbyHosts />
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">💡 How to use</h3>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">1.</span>
                    <span>Share the QR code or IP address with devices on the same Wi-Fi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">2.</span>
                    <span>Use the Files tab to send and receive files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">3.</span>
                    <span>Use the Chat tab to message connected peers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">4.</span>
                    <span>Zip folders before sending — Sharbee transfers individual files</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {modal === 'troubleshooting' && <TroubleshootingModal onClose={() => setModal(null)} />}
      {modal === 'contact' && <ContactModal onClose={() => setModal(null)} />}
      {modal === 'legal' && <LegalModal onClose={() => setModal(null)} />}

      {/* ── Toast notifications (download complete) ─────────────────────── */}
      <ToastContainer />
    </div>
  );
}
