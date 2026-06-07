'use client';

import { useState, useEffect } from 'react';
import FileTransfer from '@/components/FileTransfer';
import Chat from '@/components/Chat';
import ConnectionInfo from '@/components/ConnectionInfo';
import NearbyHosts from '@/components/NearbyHosts';

export default function Home() {
  const [activeTab, setActiveTab] = useState('files');
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setIsNameSet(true);

      // Register peer with server
      if (typeof window !== 'undefined') {
        const { getSocket } = require('@/lib/socket');
        const socket = getSocket();
        socket.emit('register-peer', { name: savedName });
      }
    }
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName.trim());
      setIsNameSet(true);

      // Register peer with server
      const { getSocket } = require('@/lib/socket');
      const socket = getSocket();
      socket.emit('register-peer', { name: userName.trim() });
    }
  };

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
                Enter your name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-50"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
                Sharbee
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Welcome, <span className="font-semibold">{userName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Clear History button (host only) */}
              {typeof window !== 'undefined' && window.electronAPI?.isElectron && (
                <button
                  onClick={async () => {
                    if (confirm('Clear ALL messages and files? This cannot be undone!')) {
                      try {
                        const response = await fetch('/api/clear-all', { method: 'POST' });
                        const data = await response.json();
                        alert(`Cleared ${data.messagesCleared} messages and ${data.filesCleared} files`);
                      } catch (error) {
                        console.error('Failed to clear history:', error);
                        alert('Failed to clear history');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ Clear All History
                </button>
              )}
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to change your name?')) {
                    localStorage.removeItem('userName');
                    setIsNameSet(false);
                    setUserName('');
                  }
                }}
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                Change Name
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'files'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  📁 Files
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  💬 Chat
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6 h-auto md:h-[calc(100vh-16rem)] overflow-y-auto md:overflow-hidden">
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
            
            <NearbyHosts onSendToHost={(host) => {
              setSelectedHost(host);
              alert(`Ready to send to ${host.name}!\nYou can now select "Send to Host" in Files or Chat tabs.`);
            }} />

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                💡 How to use
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1.</span>
                  <span>Share the URL or QR code with devices on the same WiFi network</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">2.</span>
                  <span>Use the Files tab to send and receive files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3.</span>
                  <span>Use the Chat tab to communicate with connected peers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">4.</span>
                  <span>All transfers happen directly over your local network</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">NEW!</span>
                  <span>Send files/messages directly to other Sharbee hosts (Federation)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
