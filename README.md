# Sharbee - Local File Transfer & Chat

A production-ready Electron application for secure, local-first file sharing and chat over WiFi.

## Architecture

- **Frontend**: Next.js (Static Export)
- **Backend**: Socket.io + Express (Electron Main Process)
- **Desktop**: Electron with Electron Forge
- **Discovery**: mDNS/Bonjour for automatic host detection
- **Storage**: Memory-only (ephemeral, no database)

## Key Features

### 1. Host/Guest Model
- Electron apps can run as **hosts** (serving the app) or **guests** (connecting to another host)
- On startup, the app scans for existing Sharbee hosts via mDNS
- If hosts are found, user can choose to "Connect as Guest" or "Start New Host"
- Mobile/external users connect via browser as satellites
- Automatic mDNS broadcasting for easy discovery

### 2. Full Session History
- All connected users see the complete session history (messages and files)
- History persists for the duration of the host session
- Host can clear all history with the "Clear All History" button
- Individual files can be removed from the received files queue
- History is ephemeral and cleared when the host closes

### 3. Guest Disconnection Handling
- When a guest app loses connection to its host, a warning banner appears immediately
- After 6 seconds without reconnection, a dialog offers to "Switch to Host Mode" or "Quit"
- Seamless transition from guest to host without data loss

### 4. Large File Optimization
- Memory-efficient chunked transfers (256KB chunks)
- Express static file serving for downloads
- Temporary storage in system temp directory
- Streaming download support
- Scrollable file lists with viewport-based heights

### 5. Zero Configuration
- Auto-detects local IP
- Broadcasts via mDNS with unique hostname
- QR code generation for easy mobile access (with prominent button styling)
- Automatically finds available ports if default is in use

## Development Setup

### Prerequisites
- **Node.js 22 LTS** (required for Electron Forge makers compatibility)
- npm or yarn

**Note**: Node.js 25 has compatibility issues with Electron Forge's installer makers. Use Node 22 for building production installers.

### Installation

```bash
# Install dependencies
npm install

# Run in development mode (always starts as host with --host flag)
npm run electron:dev
```

### Development Workflow

1. **Frontend Development** (Next.js only):
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:3000`

2. **Electron Development** (Full stack, always as host):
   ```bash
   npm run electron:dev
   ```
   Starts Next.js dev server and Electron with `--host` flag to skip host detection

3. **Electron Development** (Test guest/host detection):
   ```bash
   electron .
   ```
   Runs without `--host` flag, shows host selection dialog if other hosts detected

## Building for Production

### Quick Build
```bash
# Build Next.js + Create installers
npm run electron:build
```

This creates:
- `out/Sharbee-win32-x64/` - Packaged portable app
- `out/make/squirrel.windows/x64/SharbeeSetup.exe` - Windows installer
- `out/make/zip/win32/x64/Sharbee-win32-x64-<version>.zip` - Portable ZIP

### Individual Steps

```bash
# Build Next.js static export only
npm run build

# Package without creating installers (faster for testing)
npm run package

# Create installers from existing package
npm run make
```

### Platform-Specific Builds
Electron Forge creates installers for your current platform:
- **Windows**: Squirrel installer (`.exe`) and ZIP
- **macOS**: ZIP archive (DMG if configured)
- **Linux**: DEB and RPM packages (if configured)

## Project Structure

```
sharbee/
├── electron/
│   ├── main.js          # Electron main process + Socket.io server + mDNS
│   └── preload.js       # Secure IPC bridge + guest mode helpers
├── src/
│   ├── app/
│   │   └── page.js      # Main UI with host-lost banner
│   ├── components/
│   │   ├── Chat.js           # Real-time chat
│   │   ├── FileTransfer.js   # File upload/download with scroll
│   │   ├── ConnectionInfo.js # QR code & connection URLs
│   │   └── NearbyHosts.js    # mDNS discovered hosts display
│   ├── contexts/
│   │   └── SocketContext.js  # Socket.io context + guest disconnect handling
│   └── lib/
│       └── socket.js         # Socket.io client initialization
├── dist/                # Next.js static export output (gitignored)
├── out/                 # Electron build output (gitignored)
├── forge.config.js      # Electron Forge configuration
├── next.config.js       # Next.js static export config (distDir: 'dist')
└── package.json
```

## How It Works

### Memory State Management

The `MemoryStateManager` class in `main.js` handles all ephemeral state:

- **Connections**: Track peer names and connection timestamps
- **Messages**: Store all chat messages with timestamps (full history)
- **Files**: Store file metadata and temp file paths (full history)
- **Clear All**: Host can wipe all messages and files on demand

```javascript
// All connected users receive full history:
socket.emit('initial-sync', {
  messages: memoryState.getAllMessages(),
  files: memoryState.getAllFiles(),
  connectedAt: Date.now()
});
```

### File Transfer Flow

1. **Upload**:
   - Client sends file offer (metadata)
   - Client chunks file (256KB) and streams via Socket.io
   - Server accumulates chunks in memory
   - Server saves complete file to temp directory
   - Server broadcasts file to all connected peers

2. **Download**:
   - Client receives file offer with download URL
   - Files displayed in scrollable list (40vh max height)
   - Client clicks download
   - Fetch API retrieves file as blob
   - Browser triggers download via createObjectURL
   - Individual files can be removed from queue with X button

### Guest/Host Mode

#### Startup Detection
```javascript
// On app launch:
1. Scan network for existing Sharbee hosts (3 seconds)
2. If hosts found → Show dialog: "Connect as Guest" or "Start New Host"
3. If no hosts found → Start as host automatically
```

#### Guest Mode
- Loads entire UI from the remote host's server
- No local Socket.io server running
- Displays "Connected to [hostname]" in window title
- Shows host-lost banner and switch dialog on disconnection

#### Host Mode
- Runs full Socket.io + Express server
- Broadcasts via mDNS as `sharbee-[hostname].local`
- Serves static Next.js app from `dist/` folder
- Manages all connections and state

### mDNS Broadcasting

The server broadcasts its presence on the local network:
- Service name: "Sharbee on [hostname]"
- Domain: `sharbee-[hostname].local`
- Port: 8888 (auto-finds available port if in use)
- TXT records: hostname, hostId for discovery

Clients can connect via:
- `http://sharbee-[hostname].local:8888` (mDNS, limited mobile support)
- `http://<local-ip>:8888` (direct IP, works everywhere)
- QR code with IP address (generated automatically, prominent blue button)

## Configuration

### Default Port
The default port is **8888**. The app will automatically find an available port if 8888 is in use.

Edit `electron/main.js` to change:
```javascript
const PORT = process.env.PORT || 8888;
```

### Chunk Size
For file transfers (default 256KB):
```javascript
const CHUNK_SIZE = 256 * 1024;
```

### Socket.io Limits
```javascript
maxHttpBufferSize: 5 * 1024 * 1024, // 5MB per message
```

### Development Flags
- `electron . --host` - Skip host detection, always start as host (default in `npm run electron:dev`)
- `electron .` - Normal startup with host detection dialog

## Security Considerations

1. **Local Network Only**: Server binds to `0.0.0.0` but should only be accessible on LAN
2. **No Authentication**: Designed for trusted local networks (home, office)
3. **Ephemeral Storage**: All data cleared when host closes
4. **Context Isolation**: Electron uses context isolation and preload scripts
5. **Guest Mode Security**: Guests load UI from host, ensure you trust the host network

## Troubleshooting

### Build Issues
- **Node.js version**: Must use Node.js 22 LTS for production builds
- **Makers fail silently**: Upgrade to Node 22 if using Node 25+
- **Empty installers**: Check `forge.config.js` makers are uncommented

### mDNS Not Working
- **Windows**: Ensure Bonjour service is installed (comes with iTunes or install separately)
- **Linux**: Ensure `avahi-daemon` is running
- **Android**: mDNS often doesn't work, use direct IP address or QR code
- **Firewall**: Allow Node.js through firewall

### Guest Mode Issues
- **Can't connect as guest**: Ensure host is running and on same network
- **Changes not showing**: Guest loads code from host, update host's files not guest's
- **Host disconnected**: Dialog should appear after 6 seconds, offering to switch to host mode

### File Transfer Issues
- **Files not scrolling**: Updated to use 40vh max-height with overflow-y-auto
- **Large files failing**: Increase `maxHttpBufferSize` in `main.js`
- **Drag-drop too tall**: Compact horizontal layout reduces vertical space

### Connection Issues
- Check firewall rules for port 8888
- Ensure devices are on same network
- Try direct IP connection instead of mDNS
- Check Windows Defender or antivirus blocking

## Tech Stack

- **Frontend**: React 19, Next.js 16 (Turbopack), Tailwind CSS 4
- **Real-time**: Socket.io 4.8
- **Desktop**: Electron 34, Electron Forge 7
- **Discovery**: bonjour-service 1.2
- **File Handling**: Express, streaming downloads
- **QR Codes**: qrcode package
- **Utilities**: uuid for unique IDs

## UI/UX Features

- **Prominent QR Button**: Full-width blue button for easy mobile scanning
- **Scrollable File Lists**: Both send and received files have proper overflow handling
- **Host Lost Banner**: Amber warning banner appears immediately when guest loses connection
- **Individual File Removal**: X button on each received file to remove from queue
- **Compact Drag-Drop**: Horizontal layout saves vertical space
- **Connection Status**: Real-time indicator in corner with peer count

## License

Private - All rights reserved

## Contributing

This is a production sprint project. Follow the architectural philosophy:
- Local-first (no cloud dependencies)
- Database-less (ephemeral memory state)
- Privacy-focused (local network only)
- User-friendly (zero configuration, QR codes, auto-detection)
