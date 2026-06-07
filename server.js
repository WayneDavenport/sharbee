const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        maxHttpBufferSize: 100 * 1024 * 1024 // 100MB max file size
    });

    // Store connected peers
    const peers = new Map();

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Register peer
        socket.on('register-peer', (data) => {
            const peerInfo = {
                id: socket.id,
                name: data.name || 'Anonymous',
                timestamp: Date.now()
            };
            peers.set(socket.id, peerInfo);

            // Broadcast updated peer list to all clients
            io.emit('peers-updated', Array.from(peers.values()));
            console.log('Peer registered:', peerInfo.name);
        });

        // Handle chat messages
        socket.on('send-message', (data) => {
            io.emit('receive-message', {
                id: data.id,
                sender: data.sender,
                message: data.message,
                timestamp: data.timestamp
            });
        });

        // Handle file metadata broadcast
        socket.on('send-file-offer', (data) => {
            io.emit('receive-file-offer', {
                id: data.id,
                sender: data.sender,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType,
                timestamp: data.timestamp
            });
        });

        // Handle file chunk transfer
        socket.on('send-file-chunk', (data) => {
            socket.broadcast.emit('receive-file-chunk', data);
        });

        // Handle file transfer completion
        socket.on('file-transfer-complete', (data) => {
            io.emit('file-received', {
                id: data.id,
                fileName: data.fileName,
                sender: data.sender
            });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            peers.delete(socket.id);
            io.emit('peers-updated', Array.from(peers.values()));
        });
    });

    server.listen(port, hostname, () => {
        const localIP = getLocalIP();
        console.log('\n🚀 Sharbee Server Started!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📱 Local:     http://localhost:${port}`);
        console.log(`📡 Network:   http://${localIP}:${port}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n💡 Share the Network URL with other devices on the same WiFi');
        console.log('   to transfer files and chat!\n');
    });
});

