# Sharbee - Quick Reference

## Installation

```bash
# Clone repository
git clone <your-repo-url>
cd sharbee

# Run setup script
# Windows:
setup.bat

# macOS/Linux:
chmod +x setup.sh
./setup.sh

# Or manually:
npm install
npm run export
```

## Development Commands

```bash
# Start Next.js dev server only
npm run dev

# Start Electron with dev server (recommended)
npm run electron:dev

# Build Next.js static export
npm run export

# Build and export in one command
npm run build && npm run export
```

## Production Commands

```bash
# Start production server (standalone)
npm start

# Start Electron in production mode
npm run electron:start

# Package Electron app (no installer)
npm run package

# Create platform-specific installer
npm run make
```

## Project Structure Quick Guide

```
Key Files:
├── electron/main.js          # Main process + Socket.io server + mDNS
├── electron/preload.js       # Secure IPC bridge
├── src/app/page.js           # Main React app
├── src/components/
│   ├── Chat.js               # Chat with forward-only privacy
│   ├── FileTransfer.js       # File transfer with chunking
│   └── ConnectionInfo.js     # Connection status + QR code
├── src/contexts/SocketContext.js  # Socket.io React context
├── next.config.js            # Static export config
├── forge.config.js           # Electron Forge config
└── package.json              # Dependencies + scripts
```

## Connection URLs

When app is running:

- **Local**: `http://localhost:3000`
- **Network**: `http://<your-ip>:3000` (shown in console)
- **mDNS**: `http://sharbee.local:3000` (if supported)
- **QR Code**: Generated in UI (scan with mobile)

## Environment Variables

```bash
# Change server port (default: 3000)
PORT=3001 npm run electron:dev
```

## Architecture Quick Facts

### Forward-Only Privacy
- Clients only see content sent AFTER they connect
- Connection timestamps tracked per socket
- `initial-sync` event sends filtered content

### File Transfer Flow
1. Client chunks file (256KB per chunk)
2. Server accumulates chunks in memory
3. Server saves complete file to temp directory
4. Server broadcasts download URL
5. Clients download via Express static route

### Memory State
- All state in RAM (no database)
- Files saved to system temp directory
- Cleanup on disconnect and app restart

### Tech Stack
- **Frontend**: React 19 + Next.js 16 + Tailwind CSS 4
- **Backend**: Socket.io 4.8 + Express 4.21
- **Desktop**: Electron 34 + Electron Forge 7
- **Discovery**: bonjour-service 1.2

## Common Tasks

### Test Locally
1. `npm run electron:dev`
2. Open another browser tab to `localhost:3000`
3. Send messages/files between tabs

### Test on Network
1. `npm run electron:dev`
2. Note IP address from console
3. Open `http://<ip>:3000` on another device (same WiFi)

### Debug
```javascript
// In electron/main.js, add:
process.env.DEBUG = 'socket.io*';

// Or enable DevTools in production:
mainWindow.webContents.openDevTools();
```

### Clean Build
```bash
# Remove build artifacts
rm -rf out/ .next/ node_modules/

# Reinstall
npm install
npm run export
```

## Troubleshooting

### Port in use
```bash
PORT=3001 npm run electron:dev
```

### mDNS not working
- **Windows**: Install Bonjour (iTunes or Bonjour Print Services)
- **Linux**: `sudo apt install avahi-daemon`
- **macOS**: Built-in (should work)

### Large files fail
Increase limits in `electron/main.js`:
```javascript
const CHUNK_SIZE = 512 * 1024; // Increase from 256KB
maxHttpBufferSize: 10 * 1024 * 1024, // Increase from 5MB
```

### Build fails
```bash
# Clear cache
npm run clean  # If script exists
rm -rf .next/ out/

# Rebuild
npm run export
```

## Testing Checklist

### Basic Functionality
- [ ] App launches
- [ ] Socket connection established
- [ ] Can send/receive messages
- [ ] Can send/receive files
- [ ] QR code generated
- [ ] Network URL displayed

### Forward-Only Privacy
- [ ] Connect client A
- [ ] Send message from host
- [ ] Connect client B (should NOT see previous message)
- [ ] Send another message (both should see it)

### Large Files
- [ ] Upload 1MB file ✓
- [ ] Upload 10MB file ✓
- [ ] Upload 100MB file ✓
- [ ] Upload 1GB file ✓

### Network
- [ ] Connect via IP address
- [ ] Connect via mDNS (sharbee.local)
- [ ] Connect via QR code
- [ ] Multiple simultaneous connections

### Platform
- [ ] Windows build works
- [ ] macOS build works
- [ ] Linux build works

## Performance Benchmarks

Expected performance:
- **Messages**: <10ms latency
- **Small files** (<1MB): <1s transfer on LAN
- **Large files** (100MB): ~10-30s transfer on LAN
- **Connections**: 50+ simultaneous clients supported
- **Memory**: ~50-100MB base, +file sizes in transit

## Quick Fixes

### "Cannot find module"
```bash
rm -rf node_modules/ package-lock.json
npm install
```

### "Port already in use"
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

### "Electron failed to install"
```bash
# Use alternative mirror
npm install electron --electron-mirror=https://npmmirror.com/mirrors/electron/
```

## Resources

- **Electron Docs**: https://www.electronjs.org/docs
- **Socket.io Docs**: https://socket.io/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Electron Forge**: https://www.electronforge.io/

## Support

- Check `DEVELOPMENT.md` for detailed guides
- Check `ARCHITECTURE.md` for implementation details
- Check `README.md` for user documentation

---

**Version**: 1.0.0  
**Last Updated**: 2026-06-06
