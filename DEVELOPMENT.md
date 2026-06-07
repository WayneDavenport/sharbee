# Development Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development:**
   ```bash
   npm run electron:dev
   ```

3. **Build for production:**
   ```bash
   npm run export
   npm run make
   ```

## Architecture Deep Dive

### Forward-Only Privacy Implementation

The server tracks connection timestamps and filters all broadcast content:

```javascript
// In main.js - when peer registers
const connectionTimestamp = Date.now();
memoryState.registerConnection(socket.id, data.name);

// Send only future content
socket.emit('initial-sync', {
  messages: memoryState.getMessagesAfter(connectionTimestamp),
  files: memoryState.getFilesAfter(connectionTimestamp),
  connectedAt: connectionTimestamp
});
```

This ensures privacy: late joiners never see historical content.

### Large File Optimization

Files are handled in 3 stages:

1. **Client-side chunking** (256KB):
   ```javascript
   const chunkSize = 256 * 1024;
   while (offset < file.size) {
     const chunk = file.slice(offset, offset + chunkSize);
     socket.emit('send-file-chunk', { id, chunk: await chunk.arrayBuffer() });
   }
   ```

2. **Server-side accumulation**:
   ```javascript
   memoryState.addFileChunk(fileId, Buffer.from(chunk));
   ```

3. **Disk persistence + streaming download**:
   ```javascript
   // Save to temp
   await fs.promises.writeFile(filePath, Buffer.concat(chunks));
   
   // Stream to clients
   app.get('/download/:fileId', (req, res) => {
     fs.createReadStream(filePath).pipe(res);
   });
   ```

### Memory State Structure

```javascript
{
  connections: Map<socketId, { name, connectedAt, lastSeen }>,
  messages: Array<{ id, sender, message, timestamp }>,
  files: Map<fileId, { fileName, fileSize, filePath, uploadedAt, sender }>,
  fileChunks: Map<fileId, { chunks, metadata, uploadedBy, receivedSize }>
}
```

## Testing

### Local Network Testing

1. Start the app on host machine
2. Note the IP address shown in console
3. On another device (same WiFi), open browser to `http://<ip>:3000`
4. Test file transfers and chat

### mDNS Testing

```bash
# On macOS/Linux
dns-sd -B _http._tcp

# On Windows (with Bonjour)
# Check Services: "Bonjour Service" should be running
```

### Large File Testing

Create a large test file:
```bash
# Create 100MB test file
dd if=/dev/zero of=testfile.bin bs=1M count=100
```

## Performance Optimization

### Memory Management

- Files are stored in temp directory, not RAM
- Chunks are written to disk as they arrive
- Old files are cleaned up on app restart

### Socket.io Tuning

```javascript
// In main.js
io = new Server(httpServer, {
  maxHttpBufferSize: 5 * 1024 * 1024, // 5MB per message
  pingTimeout: 60000,                   // 60s before timeout
  pingInterval: 25000                   // 25s between pings
});
```

## Debugging

### Enable Verbose Logging

In `main.js`, add:
```javascript
process.env.DEBUG = 'socket.io*';
```

### Inspect Memory State

Add endpoint in `main.js`:
```javascript
expressApp.get('/debug', (req, res) => {
  res.json({
    connections: Array.from(memoryState.connections.entries()),
    messageCount: memoryState.messages.length,
    fileCount: memoryState.files.size,
    activeTransfers: memoryState.fileChunks.size
  });
});
```

### Chrome DevTools

In development, DevTools opens automatically. In production:
```javascript
// In main.js, after createWindow()
mainWindow.webContents.openDevTools();
```

## Common Issues

### Port Already in Use

Change the port:
```bash
PORT=3001 npm run electron:dev
```

### Large File Transfer Stalls

Increase chunk size in both client and server:
- Client: `FileTransfer.js` - `chunkSize` variable
- Server: `main.js` - `CHUNK_SIZE` constant

### mDNS Not Broadcasting

Check Bonjour service installation:
```bash
# macOS (built-in)
dns-sd -R "Test" _http._tcp . 3000

# Windows - Install Bonjour Print Services
# Or iTunes (includes Bonjour)

# Linux
sudo apt install avahi-daemon
sudo systemctl status avahi-daemon
```

## Deployment Checklist

- [ ] Test on all target platforms (Windows, macOS, Linux)
- [ ] Verify mDNS works on each platform
- [ ] Test with various file sizes (1KB to 1GB)
- [ ] Test with multiple simultaneous connections
- [ ] Verify forward-only privacy works
- [ ] Check memory usage over time
- [ ] Test firewall compatibility
- [ ] Create app icons for all platforms
- [ ] Sign binaries (macOS, Windows)
- [ ] Test installer on clean systems

## Next Steps

### Potential Enhancements

1. **Encryption**: Add E2E encryption for messages and files
2. **Authentication**: Optional password protection
3. **Persistence**: Optional local storage of sent/received files
4. **Compression**: Compress files before transfer
5. **Resume**: Support resuming interrupted transfers
6. **Bandwidth**: Add bandwidth throttling options
7. **Mobile App**: React Native companion app
8. **Notifications**: Desktop notifications for new messages/files

### Mobile Companion

Use the browser version on mobile, or create a React Native app that connects as a satellite client.

## License

Private - All rights reserved
