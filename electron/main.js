const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const Bonjour = require('bonjour-service');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ============================================
// SQUIRREL WINDOWS INSTALLER EVENTS
// ============================================
// Handle Squirrel events for Windows installer (shortcuts, updates, uninstall)
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Handle Squirrel events manually for proper shortcut creation
if (process.platform === 'win32') {
  const squirrelCommand = process.argv[1];
  
  if (squirrelCommand) {
    const handleSquirrelEvent = () => {
      const appFolder = path.resolve(process.execPath, '..');
      const rootFolder = path.resolve(appFolder, '..');
      const updateDotExe = path.resolve(rootFolder, 'Update.exe');
      const exeName = path.basename(process.execPath);

      const spawn = function(command, args) {
        let spawnedProcess;
        try {
          spawnedProcess = require('child_process').spawn(command, args, { detached: true });
        } catch (error) {
          console.error('Squirrel spawn error:', error);
        }
        return spawnedProcess;
      };

      const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
      };

      switch (squirrelCommand) {
        case '--squirrel-install':
        case '--squirrel-updated':
          // Create shortcuts on install/update
          spawnUpdate(['--createShortcut', exeName]);
          setTimeout(app.quit, 1000);
          return true;

        case '--squirrel-uninstall':
          // Remove shortcuts on uninstall
          spawnUpdate(['--removeShortcut', exeName]);
          setTimeout(app.quit, 1000);
          return true;

        case '--squirrel-obsolete':
          // App is being replaced, just quit
          app.quit();
          return true;
      }
    };

    if (handleSquirrelEvent()) {
      // Squirrel event handled, exit
      process.exit(0);
    }
  }
}

// ============================================
// CONFIGURATION
// ============================================
const PORT = process.env.PORT || 8888;
const isDev = !app.isPackaged;
const CHUNK_SIZE = 256 * 1024; // 256KB chunks for file transfers

// Auto-find available port if default is in use
async function findAvailablePort(startPort) {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port in use, try next one
        resolve(findAvailablePort(startPort + 1));
      } else {
        resolve(startPort);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(startPort);
    });
    
    server.listen(startPort, '0.0.0.0');
  });
}

// Get unique host identifier (computer name)
function getHostIdentifier() {
  return os.hostname().replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

// ============================================
// IN-MEMORY STATE MANAGEMENT
// ============================================
class MemoryStateManager {
  constructor() {
    // Store connection metadata with timestamps
    this.connections = new Map(); // socketId -> { name, connectedAt, lastSeen }
    
    // Store messages with timestamps
    this.messages = []; // [{ id, sender, message, timestamp }]
    
    // Store file metadata
    this.files = new Map(); // fileId -> { fileName, fileSize, fileType, filePath, uploadedAt, sender }
    
    // Track file chunks in transit
    this.fileChunks = new Map(); // fileId -> { chunks: [], metadata: {}, uploadedBy: socketId }
  }

  // Register a new connection
  registerConnection(socketId, name) {
    const timestamp = Date.now();
    this.connections.set(socketId, {
      name: name || 'Anonymous',
      connectedAt: timestamp,
      lastSeen: timestamp
    });
    console.log(`[MemoryState] Registered connection: ${name} (${socketId}) at ${new Date(timestamp).toISOString()}`);
  }

  // Remove connection
  removeConnection(socketId) {
    const conn = this.connections.get(socketId);
    if (conn) {
      console.log(`[MemoryState] Removed connection: ${conn.name} (${socketId})`);
      this.connections.delete(socketId);
      
      // Clean up any incomplete file transfers from this connection
      for (const [fileId, fileData] of this.fileChunks.entries()) {
        if (fileData.uploadedBy === socketId) {
          console.log(`[MemoryState] Cleaning up incomplete file transfer: ${fileId}`);
          this.fileChunks.delete(fileId);
        }
      }
    }
  }

  // Get connection timestamp
  getConnectionTimestamp(socketId) {
    const conn = this.connections.get(socketId);
    return conn ? conn.connectedAt : null;
  }

  // Add message to memory
  addMessage(message) {
    this.messages.push(message);
    console.log(`[MemoryState] Message added. Total messages: ${this.messages.length}`);
  }

  // Get all messages (no timestamp filtering)
  getAllMessages() {
    return this.messages;
  }

  // Add file metadata
  addFile(fileId, metadata) {
    this.files.set(fileId, metadata);
    console.log(`[MemoryState] File registered: ${metadata.fileName} (${fileId}). Total files: ${this.files.size}`);
  }

  // Get all files (no timestamp filtering)
  getAllFiles() {
    const files = [];
    for (const [fileId, metadata] of this.files.entries()) {
      files.push({ id: fileId, ...metadata });
    }
    return files;
  }

  // Get all active peer names
  getActivePeers() {
    const peers = [];
    for (const [socketId, conn] of this.connections.entries()) {
      peers.push({
        id: socketId,
        name: conn.name,
        connectedAt: conn.connectedAt
      });
    }
    return peers;
  }

  // Initialize file chunk collection
  initFileUpload(fileId, metadata, socketId) {
    this.fileChunks.set(fileId, {
      chunks: [],
      metadata,
      uploadedBy: socketId,
      receivedSize: 0
    });
  }

  // Add chunk to file
  addFileChunk(fileId, chunk) {
    const fileData = this.fileChunks.get(fileId);
    if (fileData) {
      fileData.chunks.push(chunk);
      fileData.receivedSize += chunk.length;
      return fileData.receivedSize;
    }
    return 0;
  }

  // Finalize file upload and save to temp directory
  async finalizeFileUpload(fileId) {
    const fileData = this.fileChunks.get(fileId);
    if (!fileData) {
      throw new Error('File data not found');
    }

    // Create temp directory for files
    const tempDir = path.join(app.getPath('temp'), 'sharbee-files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save file to disk
    const filePath = path.join(tempDir, `${fileId}-${fileData.metadata.fileName}`);
    const buffer = Buffer.concat(fileData.chunks);
    
    await fs.promises.writeFile(filePath, buffer);
    console.log(`[MemoryState] File saved to disk: ${filePath} (${buffer.length} bytes)`);

    // Store metadata with file path and download URL
    this.addFile(fileId, {
      ...fileData.metadata,
      filePath,
      actualSize: buffer.length,
      downloadUrl: `/download/${fileId}`
    });

    // Clean up chunks from memory
    this.fileChunks.delete(fileId);

    return filePath;
  }

  // Get file path for download
  getFilePath(fileId) {
    const file = this.files.get(fileId);
    return file ? file.filePath : null;
  }

  // Clear all messages and files (host only)
  clearAll() {
    const messageCount = this.messages.length;
    const fileCount = this.files.size;
    
    // Clear messages
    this.messages = [];
    
    // Delete files from disk and clear metadata
    const tempDir = path.join(app.getPath('temp'), 'sharbee-files');
    for (const [fileId, metadata] of this.files.entries()) {
      if (metadata.filePath && fs.existsSync(metadata.filePath)) {
        try {
          fs.unlinkSync(metadata.filePath);
        } catch (err) {
          console.error(`[MemoryState] Failed to delete file: ${metadata.filePath}`, err);
        }
      }
    }
    this.files.clear();
    
    // Clear in-progress chunks
    this.fileChunks.clear();
    
    console.log(`[MemoryState] Cleared ${messageCount} messages and ${fileCount} files`);
    
    return { messagesCleared: messageCount, filesCleared: fileCount };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ============================================
// MAIN ELECTRON APPLICATION
// ============================================
let mainWindow = null;
let httpServer = null;
let io = null;
let bonjourInstance = null;
let bonjourBrowser = null;
let memoryState = null;
let discoveredHosts = new Map(); // Store discovered Sharbee hosts
let appMode = 'host'; // 'host' or 'guest'
let guestHostInfo = null; // Info about the host we're connected to as guest

function createWindow() {
  // Set environment variables for preload script
  process.env.SERVER_PORT = PORT.toString();
  process.env.APP_MODE = appMode;
  if (guestHostInfo) {
    process.env.GUEST_HOST_NAME = guestHostInfo.name;
    process.env.GUEST_HOST_URL = guestHostInfo.url;
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--server-port=${PORT}`]
    },
    autoHideMenuBar: true,
    title: appMode === 'guest' ? `Sharbee - Connected to ${guestHostInfo?.name}` : 'Sharbee - Local File Transfer',
  });

  // Load the app
  if (appMode === 'guest') {
    // Guest mode - connect to the host's server
    console.log(`[Window] Loading as guest from ${guestHostInfo.url}`);
    mainWindow.loadURL(guestHostInfo.url);
  } else if (isDev) {
    // Host mode in dev - use Next.js dev server
    mainWindow.loadURL(`http://localhost:${PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    // Host mode in production - load from our Express server
    setTimeout(() => {
      const port = parseInt(process.env.ACTUAL_PORT || PORT);
      mainWindow.loadURL(`http://localhost:${port}`);
      console.log('[Electron] Loading production build from: http://localhost:' + port);
    }, 500);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startServer() {
  memoryState = new MemoryStateManager();
  
  // Create temp directory for files
  const tempDir = path.join(app.getPath('temp'), 'sharbee-files');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // In dev mode, use Next.js dev server; in production, serve static files
  if (isDev) {
    // Initialize Next.js dev server
    const next = require('next');
    const nextApp = next({ dev: true, dir: path.join(__dirname, '..') });
    const handle = nextApp.getRequestHandler();
    
    await nextApp.prepare();
    
    // Create HTTP server with Next.js handler
    httpServer = http.createServer(async (req, res) => {
      try {
        const parsedUrl = require('url').parse(req.url, true);
        
        // Handle our custom routes first
        if (req.url === '/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            status: 'ok', 
            connections: memoryState.connections.size,
            messages: memoryState.messages.length,
            files: memoryState.files.size
          }));
          return;
        }
        
        if (req.url === '/api/network-info') {
          const localIP = getLocalIP();
          const actualPort = parseInt(process.env.ACTUAL_PORT || PORT);
          const hostId = getHostIdentifier();
          const mdnsName = `sharbee-${hostId}`;
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ 
            ip: localIP,
            port: actualPort,
            hostname: os.hostname(),
            hostId: hostId,
            localUrl: `http://localhost:${actualPort}`,
            networkUrl: `http://${localIP}:${actualPort}`,
            mdnsUrl: `http://${mdnsName}.local:${actualPort}`
          }));
          return;
        }
        
        if (req.url === '/api/discovered-hosts') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(Array.from(discoveredHosts.values())));
          return;
        }
        
        if (req.url === '/api/clear-all' && req.method === 'POST') {
          const result = memoryState.clearAll();
          
          // Notify all clients to clear their local state
          io.emit('history-cleared');
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ 
            success: true,
            ...result
          }));
          return;
        }
        
        if (req.url.startsWith('/download/')) {
          const fileId = req.url.split('/download/')[1];
          const filePath = memoryState.getFilePath(fileId);
          
          if (!filePath || !fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
          }

          const fileMetadata = memoryState.files.get(fileId);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET');
          res.setHeader('Content-Type', fileMetadata.fileType || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.fileName}"`);
          res.setHeader('Content-Length', fileMetadata.actualSize);

          const readStream = fs.createReadStream(filePath);
          readStream.pipe(res);
          return;
        }
        
        // Let Next.js handle everything else
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });
  } else {
    // Production: serve static files
    const expressApp = express();
    
    expressApp.use(require('cors')());
    expressApp.use('/files', express.static(tempDir));
    
    expressApp.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connections: memoryState.connections.size,
        messages: memoryState.messages.length,
        files: memoryState.files.size
      });
    });

    expressApp.get('/api/network-info', (req, res) => {
      const localIP = getLocalIP();
      const actualPort = parseInt(process.env.ACTUAL_PORT || PORT);
      const hostId = getHostIdentifier();
      const mdnsName = `sharbee-${hostId}`;
      
      res.json({ 
        ip: localIP,
        port: actualPort,
        hostname: os.hostname(),
        hostId: hostId,
        localUrl: `http://localhost:${actualPort}`,
        networkUrl: `http://${localIP}:${actualPort}`,
        mdnsUrl: `http://${mdnsName}.local:${actualPort}`
      });
    });

    expressApp.get('/api/discovered-hosts', (req, res) => {
      res.json(Array.from(discoveredHosts.values()));
    });

    expressApp.post('/api/clear-all', (req, res) => {
      const result = memoryState.clearAll();
      
      // Notify all clients to clear their local state
      io.emit('history-cleared');
      
      res.json({ 
        success: true,
        ...result
      });
    });

    expressApp.get('/download/:fileId', (req, res) => {
      const fileId = req.params.fileId;
      const filePath = memoryState.getFilePath(fileId);
      
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileMetadata = memoryState.files.get(fileId);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Content-Type', fileMetadata.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.fileName}"`);
      res.setHeader('Content-Length', fileMetadata.actualSize);

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
    
    // Serve static Next.js export from 'dist' folder
    expressApp.use(express.static(path.join(__dirname, '../dist')));
    
    httpServer = http.createServer(expressApp);
  }

  // Initialize Socket.io
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 5 * 1024 * 1024, // 5MB max per socket message
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ============================================
  // SOCKET.IO EVENT HANDLERS
  // ============================================
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    const connectionTimestamp = Date.now();

    // Register peer with timestamp
    socket.on('register-peer', (data) => {
      // Federation connections only forward content between hosts. Don't list
      // them as visible peers — it pollutes the peer list and causes extra
      // peers-updated re-render churn on every host-to-host send.
      if (data.isPeerHost) {
        console.log(`[Socket] Federation peer connected (not listed): ${data.name}`);
        return;
      }

      memoryState.registerConnection(socket.id, data.name);
      
      // Send updated peer list to all clients
      io.emit('peers-updated', memoryState.getActivePeers());
      
      // Send ALL messages and files (no timestamp filtering)
      const allMessages = memoryState.getAllMessages();
      const allFiles = memoryState.getAllFiles();
      
      socket.emit('initial-sync', {
        messages: allMessages,
        files: allFiles,
        connectedAt: connectionTimestamp
      });

      console.log(`[Socket] Peer registered: ${data.name} - Sent ${allMessages.length} messages and ${allFiles.length} files`);
    });

    // Handle sync request (when component remounts or needs current state)
    socket.on('request-sync', () => {
      const allMessages = memoryState.getAllMessages();
      const allFiles = memoryState.getAllFiles();
      
      socket.emit('sync-response', {
        messages: allMessages,
        files: allFiles
      });
      
      console.log(`[Socket] Sync requested - Sent ${allMessages.length} messages and ${allFiles.length} files`);
    });

    // Handle chat messages
    socket.on('send-message', (data) => {
      const message = {
        id: data.id || uuidv4(),
        sender: data.sender,
        message: data.message,
        timestamp: Date.now()
      };
      
      // Store in memory
      memoryState.addMessage(message);
      
      // Broadcast to ALL clients (including sender for consistency)
      io.emit('receive-message', message);
      
      console.log(`[Socket] Message from ${message.sender}: ${message.message.substring(0, 50)}...`);
    });

    // Handle file upload initialization
    socket.on('send-file-offer', (data) => {
      const fileId = data.id || uuidv4();
      const metadata = {
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        sender: data.sender,
        uploadedAt: Date.now()
      };

      // Initialize file upload in memory
      memoryState.initFileUpload(fileId, metadata, socket.id);

      // Broadcast file offer to all clients
      io.emit('receive-file-offer', {
        id: fileId,
        ...metadata
      });

      console.log(`[Socket] File offer: ${metadata.fileName} (${metadata.fileSize} bytes) from ${metadata.sender}`);
    });

    // Handle file chunks (memory-efficient)
    socket.on('send-file-chunk', async (data) => {
      const { id: fileId, chunk } = data;
      
      try {
        const receivedSize = memoryState.addFileChunk(fileId, Buffer.from(chunk));
        
        // Broadcast progress to other clients (optional, for UI feedback)
        socket.broadcast.emit('file-upload-progress', {
          id: fileId,
          receivedSize
        });
      } catch (error) {
        console.error(`[Socket] Error processing chunk for file ${fileId}:`, error);
        socket.emit('file-error', { id: fileId, error: error.message });
      }
    });

    // Handle file transfer completion
    socket.on('file-transfer-complete', async (data) => {
      try {
        const filePath = await memoryState.finalizeFileUpload(data.id);
        
        // Notify all clients with download URL
        io.emit('file-received', {
          id: data.id,
          fileName: data.fileName,
          sender: data.sender,
          downloadUrl: `/download/${data.id}`
        });

        console.log(`[Socket] File transfer complete: ${data.fileName}`);
      } catch (error) {
        console.error(`[Socket] Error finalizing file upload:`, error);
        socket.emit('file-error', { id: data.id, error: error.message });
      }
    });

    // Request list of discovered hosts
    socket.on('request-discovered-hosts', () => {
      socket.emit('hosts-discovered', Array.from(discoveredHosts.values()));
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      memoryState.removeConnection(socket.id);
      io.emit('peers-updated', memoryState.getActivePeers());
    });
  });

  // Start server
  // Find available port (in case multiple hosts on same network)
  const availablePort = await findAvailablePort(PORT);
  
  httpServer.listen(availablePort, '0.0.0.0', () => {
    const localIP = getLocalIP();
    const hostId = getHostIdentifier();
    const mdnsName = `sharbee-${hostId}`;
    
    console.log('\n🚀 Sharbee Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💻 Host:      ${os.hostname()}`);
    console.log(`📱 Local:     http://localhost:${availablePort}`);
    console.log(`📡 Network:   http://${localIP}:${availablePort}`);
    console.log(`🌐 mDNS:      http://${mdnsName}.local:${availablePort}`);
    if (availablePort !== PORT) {
      console.log(`⚠️  Port ${PORT} in use, using ${availablePort} instead`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Update PORT variable for network-info API
    process.env.ACTUAL_PORT = availablePort.toString();

    // Start mDNS broadcasting with unique name
    startMDNS(localIP, availablePort, mdnsName);
  });
}

function startMDNS(localIP, port, mdnsName) {
  try {
    bonjourInstance = new Bonjour();
    
    // Publish this host
    bonjourInstance.publish({
      name: `Sharbee on ${os.hostname()}`,
      type: 'http',
      port: port,
      host: `${mdnsName}.local`,
      txt: {
        path: '/',
        description: 'Local file transfer and chat service',
        hostname: os.hostname(),
        hostId: getHostIdentifier()
      }
    });

    console.log(`✅ mDNS broadcasting: ${mdnsName}.local:${port}`);
    console.log(`   Visible as: "Sharbee on ${os.hostname()}"`);
    
    // Browse for other Sharbee hosts
    bonjourBrowser = bonjourInstance.find({ type: 'http' });
    
    bonjourBrowser.on('up', (service) => {
      // Only track other Sharbee hosts (not ourselves)
      if (service.name && service.name.startsWith('Sharbee on') && service.txt?.hostId !== getHostIdentifier()) {
        const hostInfo = {
          id: service.txt?.hostId || service.name,
          name: service.txt?.hostname || service.name.replace('Sharbee on ', ''),
          host: service.host,
          addresses: service.addresses,
          port: service.port,
          url: `http://${service.addresses[0]}:${service.port}`,
          lastSeen: Date.now()
        };
        
        discoveredHosts.set(hostInfo.id, hostInfo);
        console.log(`📡 Discovered host: ${hostInfo.name} at ${hostInfo.url}`);
        
        // Notify all clients about discovered hosts
        if (io) {
          io.emit('hosts-discovered', Array.from(discoveredHosts.values()));
        }
      }
    });
    
    bonjourBrowser.on('down', (service) => {
      const hostId = service.txt?.hostId;
      if (hostId && discoveredHosts.has(hostId)) {
        console.log(`📡 Host went offline: ${discoveredHosts.get(hostId).name}`);
        discoveredHosts.delete(hostId);
        
        // Notify clients
        if (io) {
          io.emit('hosts-discovered', Array.from(discoveredHosts.values()));
        }
      }
    });
    
  } catch (error) {
    console.error('⚠️  mDNS failed to start:', error.message);
    console.log('   Clients can still connect via IP address');
  }
}

function stopServer() {
  // Only stop server if we're running as host
  if (appMode !== 'host') {
    console.log('✅ Not hosting - no server to stop');
    return;
  }
  
  // Stop mDNS browser
  if (bonjourBrowser) {
    bonjourBrowser.stop();
    console.log('✅ mDNS browser stopped');
  }
  
  // Stop mDNS broadcasting
  if (bonjourInstance) {
    bonjourInstance.unpublishAll(() => {
      bonjourInstance.destroy();
      console.log('✅ mDNS broadcasting stopped');
    });
  }

  if (io) {
    io.close();
    console.log('✅ Socket.io server closed');
  }

  if (httpServer) {
    httpServer.close();
    console.log('✅ HTTP server closed');
  }
}

// ============================================
// HOST DETECTION & GUEST MODE
// ============================================
async function detectExistingHosts() {
  return new Promise((resolve) => {
    const hosts = [];
    const bonjour = new Bonjour();
    const browser = bonjour.find({ type: 'http' });
    
    console.log('[Startup] Scanning for existing Sharbee hosts...');
    
    browser.on('up', (service) => {
      if (service.name && service.name.startsWith('Sharbee on')) {
        const hostInfo = {
          id: service.txt?.hostId || service.name,
          name: service.txt?.hostname || service.name.replace('Sharbee on ', ''),
          url: `http://${service.addresses[0]}:${service.port}`,
          addresses: service.addresses,
          port: service.port
        };
        hosts.push(hostInfo);
        console.log(`[Startup] Found host: ${hostInfo.name} at ${hostInfo.url}`);
      }
    });
    
    // Wait 3 seconds for mDNS responses
    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      console.log(`[Startup] Scan complete. Found ${hosts.length} host(s)`);
      resolve(hosts);
    }, 3000);
  });
}

async function showHostSelectionDialog(hosts) {
  const hostList = hosts.map((h, i) => `${i + 1}. ${h.name} (${h.url})`).join('\n');
  
  const choice = dialog.showMessageBoxSync({
    type: 'question',
    title: 'Sharbee - Connect or Host?',
    message: `Found ${hosts.length} Sharbee host${hosts.length > 1 ? 's' : ''} on your network:`,
    detail: `${hostList}\n\nWould you like to connect as a guest or start as a new host?`,
    buttons: ['Connect as Guest', 'Start New Host', 'Cancel'],
    defaultId: 0,
    cancelId: 2
  });
  
  if (choice === 2) {
    // User cancelled
    app.quit();
    return null;
  }
  
  if (choice === 0) {
    // Connect as guest
    if (hosts.length === 1) {
      return { mode: 'guest', host: hosts[0] };
    }
    
    // Multiple hosts - let user choose
    const hostChoice = dialog.showMessageBoxSync({
      type: 'question',
      title: 'Select Host',
      message: 'Which host would you like to connect to?',
      detail: hostList,
      buttons: hosts.map(h => h.name),
      defaultId: 0
    });
    
    return { mode: 'guest', host: hosts[hostChoice] };
  }
  
  // Start as new host
  return { mode: 'host', host: null };
}

// ============================================
// IPC HANDLERS
// ============================================
// Native dialogs — window.confirm()/alert() break keyboard input in Electron
// (Chromium bug: character keys stop working after a JS-blocking dialog closes)
ipcMain.handle('show-confirm', async (event, { message, title = 'Sharbee' }) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['OK', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title,
    message,
  });
  return result.response === 0;
});

ipcMain.handle('show-alert', async (event, { message, title = 'Sharbee' }) => {
  await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['OK'],
    title,
    message,
  });
});

ipcMain.handle('open-downloads-folder', async () => {
  const downloadsPath = app.getPath('downloads');
  await shell.openPath(downloadsPath);
  return { success: true, path: downloadsPath };
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  await shell.openPath(folderPath);
  return { success: true };
});

ipcMain.handle('exit-app', () => {
  app.quit();
});

ipcMain.handle('refresh-app', () => {
  if (mainWindow) mainWindow.reload();
});

ipcMain.handle('switch-to-host-mode', async () => {
  console.log('[IPC] Received request to switch to host mode');
  
  // Show confirmation dialog
  const choice = dialog.showMessageBoxSync({
    type: 'question',
    title: 'Host Disconnected',
    message: 'The host you were connected to is no longer available.',
    detail: 'Would you like to switch to host mode and start your own Sharbee server?',
    buttons: ['Switch to Host Mode', 'Quit'],
    defaultId: 0,
    cancelId: 1
  });
  
  if (choice === 1) {
    // User chose to quit
    app.quit();
    return { success: false, action: 'quit' };
  }
  
  // Switch to host mode
  console.log('[IPC] Switching from guest to host mode...');
  appMode = 'host';
  guestHostInfo = null;
  
  // Start the server
  await startServer();
  
  // Update environment variables
  process.env.APP_MODE = 'host';
  delete process.env.GUEST_HOST_NAME;
  delete process.env.GUEST_HOST_URL;
  
  // Reload the window to the local server
  if (mainWindow) {
    const port = parseInt(process.env.ACTUAL_PORT || PORT);
    mainWindow.setTitle('Sharbee - Local File Transfer');
    mainWindow.loadURL(`http://localhost:${port}`);
    console.log(`[IPC] Switched to host mode, loading from localhost:${port}`);
  }
  
  return { success: true, action: 'switched' };
});

// ============================================
// APP LIFECYCLE
// ============================================
app.whenReady().then(async () => {
  // Allow forcing host mode via command line flag (e.g. for development/testing)
  const forceHost = process.argv.includes('--host');
  
  if (!forceHost) {
    // Detect existing hosts on startup
    const hosts = await detectExistingHosts();
    
    if (hosts.length > 0) {
      // Found hosts - ask user what to do
      const choice = await showHostSelectionDialog(hosts);
      
      if (!choice) {
        // User cancelled
        return;
      }
      
      appMode = choice.mode;
      guestHostInfo = choice.host;
    }
  } else {
    console.log('[Startup] --host flag detected, skipping host scan');
  }
  
  console.log(`[Startup] Starting in ${appMode} mode`);
  
  if (appMode === 'host') {
    // Start as host (normal mode)
    startServer();
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error', `An error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
