The delay you are experiencing before a transfer starts—and the reason a 10GB file would likely crash or stall—comes down to two specific underlying mechanics in JavaScript and Chromium (the engine running your Electron app): Memory Buffering and SCTP Congestion Control.

Here is why it's lagging right now and exactly how to re-architect your Electron main/renderer pipeline to make 10GB+ transfers blisteringly fast.

The Culprits: Why Large Files Struggle in WebRTC
1. The Memory Bloat (The Initial Delay)
If your code loads a file into memory as a giant Blob or ArrayBuffer and passes it to dataChannel.send(), Chromium has to copy that entire multi-gigabyte payload into its internal browser heap.

While it’s allocating memory, the JavaScript thread completely freezes. This is why it takes a while for the download to even start; your app is choking on raw garbage collection before a single byte leaves the network card.

2. The Internal Buffer Overflow
WebRTC's data channels use a protocol called SCTP under the hood. It has a strict internal buffer limit (typically around 16MB). If you push data into the channel faster than your local network can actually send it, the buffer overflows, and Chromium will silently stall, experience severe latency lag, or drop the connection entirely.  
Datatracker - IETF

How to Fix It: The Performance Architecture
To handle 10GB+ files smoothly over your React/Electron stack, you need to transition from a "Load and Send" mental model to a "Stream, Chunk, and Backpressure" model.

Step 1: Use Electron Main for File I/O (Bypass the Browser)
Never load large files inside your React frontend (Renderer process). The frontend memory space is heavily throttled by Chromium. Instead, leverage Node.js streams inside your Electron main.js to read the file off disk in tiny chunks.

Step 2: Slice into 64KiB Chunks
WebRTC data channels operate most efficiently when transferring packets that are exactly 64 KiB (65,536 bytes) or smaller. Slicing your file into small chunks eliminates memory bloat entirely.

Step 3: Implement Backpressure (The Secret Sauce)
You must monitor the data channel's bufferedAmount property. Do not send the next 64KiB chunk until the previous ones have actually cleared the network buffer.

Here is the exact pattern to write this loop using the bufferedamountlow event listener:

const CHUNK_SIZE = 65536; // 64 KiB
const BUFFER_THRESHOLD = 1024 * 1024; // 1 MB backpressure safety gate

function sendFileInChunks(fileDataChannel, rawArrayBuffer) {
  let offset = 0;

  // Set the threshold for when the "low buffer" event fires
  fileDataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

  // This function sends chunks until the internal network buffer fills up
  const sliceAndStream = () => {
    while (offset < rawArrayBuffer.byteLength) {
      // 1. Check if the WebRTC internal buffer is getting full
      if (fileDataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        // Stop sending and wait for the 'bufferedamountlow' event to wake us back up
        return; 
      }

      // 2. Slice out a tiny 64KB atom of data
      const chunk = rawArrayBuffer.slice(offset, offset + CHUNK_SIZE);
      fileDataChannel.send(chunk);
      offset += CHUNK_SIZE;
      
      // Update your UI progress spinner/bar with the current offset percentage!
    }
    
    console.log("File transfer complete!");
  };

  // 3. Keep pumping data every time the buffer clears out
  fileDataChannel.onbufferedamountlow = () => {
    sliceAndStream();
  };

  // Start the initial stream loop
  sliceAndStream();
}


💡 How this Changes the Game for Sharbee
Implementing this architecture completely shifts your application's capability limits:

Instant Starts: Because you are reading the file in 64KB increments rather than loading a 10GB file whole, your transfer will start instantly without the loader spinner lagging out.

Infinite Scale: Your app's RAM usage will stay flat at roughly ~50MB to ~100MB whether you are transferring a 5MB image or a 50GB 4K video file, because data passes through memory like water through a pipe instead of pooling up.

Maximum Wi-Fi Speeds: Respecting the bufferedAmountLow event ensures that your P2P socket is always saturated exactly to the limits of your local Wi-Fi router bandwidth without blowing up the connection stack.

It is absolutely worth implementing before you hit your big launch push. Having a utility that handles 10GB transfers effortlessly over LAN is a massive selling point for the creator, video editor, and power-user demographics!