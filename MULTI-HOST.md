# Sharbee - Multi-Host Architecture

## ✅ Multiple Hosts on Same Network - Now Supported!

Sharbee now supports multiple independent hosts running simultaneously on the same WiFi network. Each host operates as a separate sharing session.

---

## How It Works

### Automatic Port Assignment

When you start Sharbee:
1. **Tries port 8888** (default)
2. **If occupied**, tries 8889, then 8890, and so on
3. **Binds to first available port**
4. **Displays which port it's using**

```
🚀 Sharbee Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💻 Host:      LAPTOP-ABC123
📱 Local:     http://localhost:8889
📡 Network:   http://192.168.1.109:8889
🌐 mDNS:      http://sharbee-laptop-abc123.local:8889
⚠️  Port 8888 in use, using 8889 instead
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Unique mDNS Names

Each host gets a unique mDNS identifier based on computer hostname:
- **Computer A** (`LAPTOP-ABC123`) → `sharbee-laptop-abc123.local`
- **Computer B** (`DESKTOP-XYZ`) → `sharbee-desktop-xyz.local`
- **Computer C** (`Macbook-Pro`) → `sharbee-macbook-pro.local`

The mDNS service name is also unique:
- Shows as "Sharbee on LAPTOP-ABC123" in network browsers

---

## Example Scenarios

### Scenario 1: Family Gathering
```
Living Room:
├─ Dad's Laptop (DADS-LAPTOP)
│  ├─ Port: 8888
│  ├─ mDNS: sharbee-dads-laptop.local:8888
│  └─ Sharing: Vacation photos
│
└─ Mom's Phone (connects to Dad)
   └─ http://192.168.1.109:8888

Kitchen:
├─ Sister's Laptop (SISTERS-MAC)
│  ├─ Port: 8889 (8888 was taken)
│  ├─ mDNS: sharbee-sisters-mac.local:8889
│  └─ Sharing: Recipe PDFs
│
└─ Brother's Tablet (connects to Sister)
   └─ http://192.168.1.110:8889
```

**Result**: Two independent sharing sessions, no conflicts!

### Scenario 2: Office Meeting
```
Conference Room A:
├─ Presenter's Laptop
│  ├─ Port: 8888
│  └─ Sharing: Presentation slides
└─ 5 attendees connect → share notes back

Conference Room B (same WiFi):
├─ Another Presenter's Laptop
│  ├─ Port: 8889
│  └─ Sharing: Design mockups
└─ 8 attendees connect → share feedback
```

**Result**: Both presentations run simultaneously with isolated sessions!

### Scenario 3: Gaming Party
```
Host 1: Streaming PC
├─ Port: 8888
└─ Sharing: Game clips, screenshots

Host 2: Gaming Laptop
├─ Port: 8889
└─ Sharing: Memes, GIFs

Host 3: Friend's PC
├─ Port: 8890
└─ Sharing: Game mods, configs

Everyone's phones connect to their preferred host!
```

---

## How Satellites Choose a Host

### Method 1: Direct IP Connection (Universal)
1. Host shows their IP in the Electron app
2. Host shares: `http://192.168.1.109:8889`
3. Satellite opens that URL in browser
4. Connects to that specific host ✅

### Method 2: QR Code (Easy)
1. Host shows QR code (includes IP and port)
2. Satellite scans QR code
3. Automatically connects to that host ✅

### Method 3: mDNS (iOS/Mac/Windows with Bonjour)
1. Satellite types: `http://sharbee-laptop-abc123.local:8889`
2. Connects to that specific host ✅

---

## Key Features

### Independent Sessions
- Each host has its own memory
- Messages don't cross between hosts
- Files don't cross between hosts
- Each host can clear their own history

### Automatic Conflict Resolution
- No manual port configuration needed
- Works out of the box
- Multiple Sharbee instances just work

### Clear Host Identification
- UI shows computer hostname
- Console shows which port is active
- mDNS includes hostname
- No confusion about which host you're connected to

---

## Connection Info Display

The ConnectionInfo panel now shows:

```
┌─────────────────────────────────┐
│ Connection Status               │
│                        Host: LAPTOP-ABC123 │
│                        🟢 Connected        │
├─────────────────────────────────┤
│ 📱 RECOMMENDED FOR MOBILE      │
│ http://192.168.1.109:8889      │
│ ✅ Works on all devices         │
├─────────────────────────────────┤
│ 🖥️ EASY ADDRESS               │
│ http://sharbee-laptop-abc123.local:8889 │
│ ✅ iOS, Mac, Windows (Bonjour) │
│ ❌ Android                      │
└─────────────────────────────────┘
```

---

## Technical Details

### Port Assignment Algorithm
```javascript
async function findAvailablePort(startPort) {
  // Try to bind to startPort
  // If EADDRINUSE error:
  //   - Increment port
  //   - Try again recursively
  // If successful:
  //   - Return that port
}
```

### Hostname Processing
```javascript
function getHostIdentifier() {
  // Get computer hostname
  // Remove special characters
  // Convert to lowercase
  // Return: "laptop-abc123"
}
```

### mDNS Broadcasting
```javascript
bonjourInstance.publish({
  name: 'Sharbee on LAPTOP-ABC123',  // Human-readable
  type: 'http',
  port: 8889,
  host: 'sharbee-laptop-abc123.local',  // Unique DNS
  txt: {
    hostname: 'LAPTOP-ABC123'
  }
});
```

---

## Testing Multi-Host Setup

### On Same Computer (For Testing)
1. **Terminal 1**: `PORT=8888 npm run electron:dev`
2. **Terminal 2**: `PORT=8889 npm run electron:dev`
3. Both will start successfully!
4. Connect browser to either port

### On Different Computers
1. **Computer A**: Start Sharbee normally
2. **Computer B**: Start Sharbee normally
3. Both find available ports automatically
4. No configuration needed!

---

## Limitations

### Network Discovery
- Satellites must know which host to connect to
- No automatic "list all hosts" feature (future enhancement)
- Must manually share URL/QR code

### Port Range
- Searches 8888-8998 (111 ports)
- If all occupied, fails (unlikely scenario)
- Can expand range if needed

### mDNS Conflicts
- If two computers have identical hostnames (rare)
- mDNS names will conflict
- Use IP addresses as fallback

---

## Future Enhancements

### Host Discovery Dashboard
```
Available Sharbee Hosts on Network:
├─ Dad's Laptop (8888) - 3 connected
├─ Sister's Mac (8889) - 1 connected
└─ Brother's PC (8890) - 5 connected

[Choose a host to connect]
```

### Host Clustering
- Multiple hosts share same session
- Distributed memory/state
- Scale to larger groups

### Host-to-Host File Transfer
- Send files between hosts
- Not just host-to-satellite

---

## Troubleshooting

### "All ports in range are in use"
- Close some Sharbee instances
- Or increase port range in code
- Or specify custom port: `PORT=9000 npm run electron:dev`

### "Can't find host on network"
- Verify both devices on same WiFi
- Use IP address instead of mDNS
- Check firewall allows ports 8888-8998

### "Connected to wrong host"
- Check the hostname in ConnectionInfo
- Verify IP address matches intended host
- Use QR code for guaranteed correct host

---

## Summary

✅ **Multiple hosts work simultaneously**  
✅ **Automatic port assignment**  
✅ **Unique mDNS names per host**  
✅ **Independent sessions**  
✅ **No configuration required**  
✅ **Clear host identification**  

**Your vision is implemented!** Every Electron instance is a host, every browser is a satellite. Multiple hosts coexist peacefully on the same network. 🎉
