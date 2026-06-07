# Sharbee - Local File Transfer & Chat

A production-ready Electron application for secure, local-first file sharing and chat over WiFi.

## Architecture

- **Frontend**: Next.js (Static Export)
- **Backend**: Socket.io + Express (Electron Main Process)
- **Desktop**: Electron with Electron Forge
- **Discovery**: mDNS/Bonjour for `sharbee.local` broadcasting
- **Storage**: Memory-only (ephemeral, no database)

## Key Features

### 1. Host/Satellite Model
- Primary Electron app acts as Socket.io server
- Mobile/external users connect via browser
- Automatic mDNS broadcasting for easy discovery

### 2. Forward-Only Privacy
- Users only see messages and files sent AFTER they connect
- No historical data exposure to late joiners
- Connection timestamps tracked per client

### 3. Large File Optimization
- Memory-efficient chunked transfers (256KB chunks)
- Express static file serving for downloads
- Temporary storage in system temp directory
- Streaming download support

### 4. Zero Configuration
- Auto-detects local IP
- Broadcasts via mDNS as `sharbee.local`
- QR code generation for easy mobile access

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode (Next.js dev server + Electron)
npm run electron:dev
```

### Development Workflow

1. **Frontend Development** (Next.js only):
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:3000`

2. **Electron Development** (Full stack):
   ```bash
   npm run electron:dev
   ```
   Starts both Next.js and Electron

## Building for Production

### Static Export
```bash
# Build and export Next.js static files
npm run export
```
This creates the `out/` directory with static HTML/CSS/JS.

### Electron Packaging
```bash
# Package for current platform
npm run package

# Create distributable installer for current platform
npm run make
```

### Platform-Specific Builds
Electron Forge will automatically create installers for your current platform:
- **Windows**: Squirrel installer (`.exe`)
- **macOS**: ZIP archive and DMG (if configured)
- **Linux**: DEB and RPM packages

## Project Structure

```
sharbee/
├── electron/
│   ├── main.js          # Electron main process + Socket.io server
│   └── preload.js       # Secure IPC bridge
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Socket)
│   └── lib/             # Utility libraries
├── out/                 # Static export output (gitignored)
├── forge.config.js      # Electron Forge configuration
├── next.config.js       # Next.js static export config
└── package.json
```

## How It Works

### Memory State Management

The `MemoryStateManager` class in `main.js` handles all ephemeral state:

- **Connections**: Track peer names and connection timestamps
- **Messages**: Store chat messages with timestamps
- **Files**: Store file metadata and temp file paths
- **Forward-Only**: Filter content based on connection time

```javascript
// When a user connects at timestamp T
// They only receive:
messages.filter(m => m.timestamp >= T)
files.filter(f => f.uploadedAt >= T)
```

### File Transfer Flow

1. **Upload**:
   - Client sends file offer (metadata)
   - Client chunks file (256KB) and streams via Socket.io
   - Server accumulates chunks in memory
   - Server saves complete file to temp directory
   - Server broadcasts download URL

2. **Download**:
   - Client receives file offer with download URL
   - Client clicks download
   - Express streams file from temp directory
   - No file reconstruction needed on client

### mDNS Broadcasting

The server broadcasts its presence on the local network:
- Service name: "Sharbee File Transfer"
- Domain: `sharbee.local`
- Port: 3000 (configurable)

Clients can connect via:
- `http://sharbee.local:3000` (mDNS)
- `http://<local-ip>:3000` (direct IP)
- QR code (generated automatically)

## Configuration

### Environment Variables

```bash
PORT=3000  # Server port (default: 3000)
```

### Customization

**Change Server Port**:
Edit `electron/main.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

**Chunk Size** (for file transfers):
Edit `electron/main.js`:
```javascript
const CHUNK_SIZE = 256 * 1024; // 256KB
```

**Socket.io Limits**:
Edit `electron/main.js`:
```javascript
maxHttpBufferSize: 5 * 1024 * 1024, // 5MB
```

## Security Considerations

1. **Local Network Only**: Server binds to `0.0.0.0` but should only be accessible on LAN
2. **No Authentication**: Designed for trusted local networks
3. **Ephemeral Storage**: All data cleared on app close
4. **Context Isolation**: Electron uses context isolation and preload scripts

## Troubleshooting

### mDNS Not Working
- **Windows**: Ensure Bonjour service is installed (comes with iTunes or install separately)
- **Linux**: Ensure `avahi-daemon` is running
- **Firewall**: Allow Node.js through firewall

### Large Files Failing
- Increase `maxHttpBufferSize` in `main.js`
- Check available system memory
- Monitor temp directory space

### Connection Issues
- Check firewall rules for port 3000
- Ensure devices are on same network
- Try direct IP connection instead of mDNS

## Tech Stack

- **Frontend**: React 19, Next.js 16, Tailwind CSS 4
- **Real-time**: Socket.io 4.8
- **Desktop**: Electron 34, Electron Forge 7
- **Discovery**: bonjour-service 1.2
- **File Handling**: Express, multer

## License

Private - All rights reserved

## Contributing

This is a production sprint project. Follow the architectural philosophy:
- Local-first
- Database-less
- Ephemeral state
- Privacy-focused
