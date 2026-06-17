# Sharbee — Local File Transfer & Chat

A local-first desktop app for sharing files and chatting over your Wi-Fi network. No cloud, no accounts, no internet required. Built with Electron + Next.js.

## Architecture

- **Frontend**: Next.js (Static Export) + React 19 + Tailwind CSS 4
- **Backend**: Socket.io + Express, running inside the Electron main process
- **Desktop**: Electron, packaged with Electron Forge
- **Discovery**: mDNS / Bonjour for automatic host detection on the LAN
- **Storage**: Ephemeral — chat lives in memory, files are streamed to a temp folder and deleted when the host closes. No database.

## Key Features

### Host / Guest model
- An Electron instance runs as a **host** (serving the app + Socket.io server) or a **guest** (loading the UI from another host).
- On launch the app scans ~3s for existing Sharbee hosts via mDNS. If any are found it offers **Connect as Guest** or **Start New Host**; otherwise it starts as a host automatically.
- Phones and other computers connect through a browser as **satellites** — no install needed.
- If a guest loses its host, a banner appears and after a few seconds it offers to switch into host mode so the session isn't lost.

### Streamed file transfers (multi-GB capable)
Sharbee streams files end-to-end so memory usage stays flat (~tens of MB) regardless of file size:
- **Sender** reads the file in 64 KiB slices off disk and sends each chunk only after the host acknowledges the previous one (**backpressure** — paces the sender to the host's disk speed, never floods the socket).
- **Host** writes each chunk straight to a temp file with a write stream — it never holds the whole file in RAM.
- **Receiver** downloads via the OS/native download manager (Electron) or a direct streamed link (browser) — no in-memory Blob buffering.

> Folders aren't sent directly — zip them first. The Troubleshooting modal explains this in-app.

### Full session history
- Everyone sees the complete session history (messages + files) for as long as the host is running.
- The host can wipe everything with **Clear All History**; individual received files can be removed too.

### In-app menu system
- **Top bar** with a Downloads dropdown (session download history + open folder), an auto-update badge, and a kebab (⋮) menu.
- **Kebab menu**: Change Name, Import Files, Send All, Refresh App, Troubleshooting & Tips, Contact, Legal/Disclaimer, and Exit (Electron only).
- **Contact form** posts to [Web3Forms](https://web3forms.com) (no backend needed) with a honeypot for spam.
- **Download-complete toasts** with an "Open Downloads Folder" action.

### Auto-updates
- Uses the official free [update.electronjs.org](https://update.electronjs.org) service backed by GitHub Releases.
- Checks on launch and every 2 hours; downloads in the background silently.
- When ready, a pulsing **"Update ready"** badge appears in the top bar — click to restart & apply, or it applies on next launch.
- Automatically disabled in Windows Store / Mac App Store builds (`process.windowsStore` / `process.mas`).

### Zero configuration
- Auto-detects the local IP, finds a free port if the default is taken, broadcasts via mDNS, and generates a QR code for mobile.

## Development Setup

### Prerequisites
- **Node.js 22 LTS** (recommended for Electron Forge maker compatibility)
- For MSIX/Store builds on Windows: the **Windows SDK** (the build points at an installed SDK in `forge.config.js`)

### Install & run

```bash
npm install

# Run the full Electron app in development
npm run electron:dev   # runs `electron .`

# Frontend only (Next.js dev server at http://localhost:3000)
npm run dev
```

In dev, `electron .` performs normal host detection (shows the guest/host dialog if another host is on the network).

## Building for Production

```bash
# Clean previous output, regenerate MSIX tiles, then build all installers
npm run make
```

`npm run make` runs `clean` → `gen:msix-assets` → `electron-forge make`, producing in `out/make/`:
- `squirrel.windows/x64/` — `SharbeeSetup.exe`, plus `RELEASES` + `*.nupkg` (needed for auto-update)
- `zip/win32/x64/` — portable ZIP
- `msix/x64/` — `Sharbee.msix` for Microsoft Store submission

### Other scripts
```bash
npm run build            # Next.js static export only (-> dist/)
npm run package          # Package app without installers (faster)
npm run clean            # Remove out/ (retries through OneDrive/AV locks)
npm run gen:msix-assets  # Regenerate Store tiles from assets/icons/1024x1024.png
```

> **Tip:** If your project lives in a OneDrive-synced folder, pause OneDrive during builds — it can lock the large `.nupkg`/`.msix` files mid-write (`EBUSY`).

### Publishing an update
1. Bump `"version"` in `package.json` (and `manifestVariables.packageVersion` for MSIX).
2. `npm run make`.
3. Create a GitHub Release tagged `vX.Y.Z` on the repo named in `package.json` `repository`, and upload **all three** Squirrel files: `RELEASES`, `Sharbee-X.Y.Z-full.nupkg`, and `SharbeeSetup.exe`.
4. Installed apps on an older version pick it up automatically.

### Microsoft Store (MSIX)
- `forge.config.js` builds an **unsigned** MSIX (`sign: false`) — Partner Center signs it on submission.
- `manifestVariables.publisher` / `packageIdentity` must match the values from Partner Center → Product identity.
- Targets `packageMinOSVersion: 10.0.17763.0` (Win 10 1809, the MSIX minimum the Store accepts).
- `runFullTrust` is expected for Electron apps — explain it in the submission's restricted-capabilities field.
- See `PRIVACY.md` for the privacy policy (the Store requires a hosted privacy URL).

## Project Structure

```
sharbee/
├── electron/
│   ├── main.js          # Main process: Socket.io + Express server, mDNS,
│   │                    #   streamed file I/O, auto-updater, IPC handlers
│   └── preload.js       # Secure contextBridge API
├── src/
│   ├── app/
│   │   ├── page.js      # Top bar, tabs, name entry, modals
│   │   └── layout.js    # Socket + Download context providers
│   ├── components/
│   │   ├── Chat.js              # Real-time chat (+ right-click menu)
│   │   ├── FileTransfer.js      # Streamed upload/download
│   │   ├── ConnectionInfo.js    # QR code & connection URLs
│   │   ├── NearbyHosts.js       # mDNS-discovered hosts
│   │   ├── KebabMenu.js         # ⋮ menu
│   │   ├── DownloadsDropdown.js # Session downloads
│   │   ├── UpdateBadge.js       # Auto-update indicator
│   │   ├── Toast.js             # Download-complete toasts
│   │   └── modals/              # Troubleshooting, Contact, Legal
│   ├── contexts/
│   │   ├── SocketContext.js     # Socket.io + guest-disconnect + tab badges
│   │   └── DownloadContext.js   # Session download history + toasts
│   └── lib/
│       ├── socket.js            # Socket.io client init
│       └── dialogs.js           # Native confirm/alert (avoids Electron input bug)
├── scripts/
│   ├── clean.js                 # Pre-build cleanup
│   └── gen-msix-assets.js       # Store tile generator (uses sharp)
├── assets/                      # Icons, MSIX tiles, loader gif
├── dist/                        # Next.js export output (gitignored)
├── out/                         # Build output (gitignored)
├── forge.config.js              # Electron Forge config (squirrel, zip, msix)
├── next.config.js               # distDir: 'dist'
├── PRIVACY.md                   # Privacy policy
└── package.json
```

## How It Works

### Memory state
`MemoryStateManager` in `main.js` holds ephemeral session state: connections, full message history, file metadata, and in-progress upload write streams. `clearAll()` wipes messages, deletes temp files, and aborts any in-flight uploads.

### File transfer flow
**Upload (streamed + backpressured):**
1. Sender emits a file offer (metadata).
2. Sender loops 64 KiB slices, using `socket.emitWithAck('send-file-chunk', …)` — it waits for the host's ack before sending the next chunk.
3. Host writes each chunk to a temp-file write stream and acks only once the chunk is flushed/drained.
4. On completion the host closes the stream and broadcasts the file to all peers.

**Download (streamed):**
- **Electron**: `webContents.downloadURL()` streams to the Downloads folder via the native download manager; completion fires a toast.
- **Browser**: a direct anchor link streams to disk (server sets `Content-Disposition`).

### Guest / Host
- **Host**: runs Socket.io + Express, broadcasts via mDNS, serves the static app from `dist/`.
- **Guest**: loads the UI directly from the host's URL; no local server. On disconnect it can switch to host mode.

### Native dialogs
`window.confirm()` / `alert()` break keyboard input in Electron (a Chromium quirk), so confirms/alerts route through the main process (`src/lib/dialogs.js`). Browser guests fall back to the standard dialogs.

## Configuration

```javascript
// electron/main.js
const PORT = process.env.PORT || 8888;          // auto-finds a free port if taken

// Socket.io
maxHttpBufferSize: 5 * 1024 * 1024,             // 5 MB per message

// src/components/FileTransfer.js
const chunkSize = 64 * 1024;                    // 64 KiB transfer chunks
```

## Security

1. **LAN only** — the server binds to `0.0.0.0`; use on trusted networks.
2. **No authentication** — anyone on the network can connect (by design, for trusted home/office use).
3. **Ephemeral** — all messages and files are cleared when the host closes.
4. **Context isolation** — Electron uses a preload bridge; no `nodeIntegration` in the renderer.
5. **No telemetry** — no analytics or tracking. See `PRIVACY.md`.

## Troubleshooting

### Builds
- Use **Node 22 LTS** for installer makers.
- **`dest already exists` / `EBUSY`**: pause OneDrive (or move the project out of OneDrive) and rerun — `npm run make` cleans `out/` first.
- **MSIX `pwsh.exe ENOENT`**: signing is off for Store builds (`sign: false`); for local sideload testing instead, install PowerShell 7 and set `sign: true`.
- **MSIX `WindowsKit does not exist`**: point `windowsKitPath` in `forge.config.js` at an installed SDK version.

### mDNS / connectivity
- **Android**: mDNS (`.local`) usually doesn't work — use the IP URL or QR code.
- **Windows mDNS**: needs Bonjour; **Linux**: needs `avahi-daemon`.
- Allow the app through the firewall on port 8888; ensure devices share the same network.

### Transfers
- Folders aren't supported directly — **zip them first**.
- Transfers are streamed, so large files start immediately and don't exhaust memory.

## Tech Stack

- React 19, Next.js 16, Tailwind CSS 4
- Socket.io 4.8
- Electron 34, Electron Forge 7 (squirrel, zip, msix makers)
- bonjour-service (mDNS), qrcode, uuid, sharp (tile generation)
- Web3Forms (contact form), update.electronjs.org (auto-update)

## License

Private — all rights reserved.

## Philosophy

- Local-first (no cloud dependencies)
- Database-less (ephemeral memory + temp files)
- Privacy-focused (local network only, no telemetry)
- User-friendly (zero config, QR codes, auto-detection, auto-updates)
