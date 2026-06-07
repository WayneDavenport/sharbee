# Sharbee - Port Configuration Guide

## Default Ports

- **Development**: Port 8888 (configurable)
- **Production**: Port 8888 (configurable)

## Changing the Port

### Method 1: Environment Variable (Recommended)
```bash
# Windows
set PORT=8888 && npm run electron:dev

# macOS/Linux
PORT=8888 npm run electron:dev
```

### Method 2: Edit main.js
Edit `electron/main.js` line 14:
```javascript
const PORT = process.env.PORT || 8888; // Change 8888 to your desired port
```

## How It Works

### Development Mode
```
┌─────────────────────────────────────┐
│   Electron Window                   │
│   Loads: http://localhost:8888      │
│                                      │
│   ┌─────────────────────────────┐   │
│   │   Next.js Dev Server        │   │
│   │   + Socket.io Server        │   │
│   │   Port: 8888                │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**What happens:**
1. Electron starts server on port 8888
2. Next.js dev server runs on same port
3. Electron window loads from `http://localhost:8888`
4. Socket.io connects to same origin

### Production Mode
```
┌─────────────────────────────────────┐
│   Electron Window                   │
│   Loads: file:///out/index.html     │
│                                      │
│   ┌─────────────────────────────┐   │
│   │   Static Files (file://)    │   │
│   │   ↓ connects to ↓           │   │
│   │   Socket.io Server          │   │
│   │   http://localhost:8888     │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘

External Browser (e.g., Phone)
http://192.168.1.109:8888
        ↓
   Socket.io Server
   http://192.168.1.109:8888
```

**What happens:**
1. Electron starts server on port 8888
2. Electron window loads static HTML from disk (`file://`)
3. JavaScript detects Electron environment
4. Socket.io connects to `http://localhost:8888`
5. External browsers connect to `http://<ip>:8888`

## Network Info API

The `/api/network-info` endpoint automatically adapts to your port:

```json
{
  "ip": "192.168.1.109",
  "port": 8888,
  "localUrl": "http://localhost:8888",
  "networkUrl": "http://192.168.1.109:8888",
  "mdnsUrl": "http://sharbee.local:8888"
}
```

This is what the UI displays in the connection URLs.

## Port 8888 - Why This Choice?

✅ **Advantages:**
- Not commonly used by default applications
- Easy to remember (repeating digits)
- Above privileged port range (1-1023)
- Below ephemeral port range (49152-65535)
- Not used by common services:
  - 3000: React/Node dev servers
  - 8080: Common HTTP alternate
  - 8000: Python/Django dev
  - 5000: Flask dev

❌ **Known Conflicts:**
- Some game servers
- Some proxy servers
- If you have a conflict, just change the port!

## Common Port Alternatives

If 8888 is in use, here are good alternatives:

| Port  | Notes                                    |
|-------|------------------------------------------|
| 8888  | Default (current)                        |
| 7777  | Easy to remember, rarely used            |
| 9999  | Easy to remember, rarely used            |
| 8889  | Close to 8888                            |
| 3333  | Simple, but check for dev server         |
| 4444  | Simple, rarely used                      |

## Testing Port Changes

### 1. Change the port in `electron/main.js`
```javascript
const PORT = process.env.PORT || 7777; // Changed to 7777
```

### 2. Start the app
```bash
npm run electron:dev
```

### 3. Verify in console
```
🚀 Sharbee Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 Local:     http://localhost:7777
📡 Network:   http://192.168.1.109:7777
🌐 mDNS:      http://sharbee.local:7777
```

### 4. Check UI
All three URLs in the connection panel should show the new port.

### 5. Test QR code
Scan the QR code - it should connect to the new port.

## Production Build

When you build for production:

```bash
npm run export      # Build static files
npm run package     # Package Electron app
```

The packaged app will:
1. Use the port defined in `electron/main.js`
2. Load static files from disk
3. Run server on configured port
4. Auto-connect to correct port

## Troubleshooting

### "Port already in use"
```bash
# Windows - Find what's using the port
netstat -ano | findstr :8888

# Kill the process (replace PID with actual process ID)
taskkill /PID <pid> /F

# macOS/Linux
lsof -ti:8888 | xargs kill -9
```

### "Can't connect from phone"
1. Check firewall - allow port 8888
2. Verify both devices on same WiFi
3. Try IP address instead of mDNS
4. Check the console for correct IP
5. Verify port in network-info API:
   `http://localhost:8888/api/network-info`

### "QR code shows wrong port"
1. Restart the app completely
2. Clear browser cache (Ctrl+Shift+R)
3. Check `/api/network-info` endpoint
4. Verify PORT variable in main.js

## Security Note

**The port is NOT encrypted.** All connections are HTTP (not HTTPS).

This is by design for a local-only app:
- ✅ Fast transfers over LAN
- ✅ No certificate issues
- ✅ Simple setup
- ⚠️ Only use on trusted local networks
- ❌ Do NOT expose to internet

If you need encryption, you would need to:
1. Generate SSL certificates
2. Use HTTPS server
3. Configure Socket.io for secure connections
4. Handle certificate trust on all devices

For a local file transfer app, this is overkill and would complicate mobile connections.

---

**Summary:**
- Default port: **8888**
- Change in: `electron/main.js` line 14
- Works in both dev and production
- Network info API adapts automatically
- QR code updates automatically
