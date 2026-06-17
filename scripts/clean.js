/**
 * Removes the Forge output folder before a build.
 *
 * The MSIX maker uses fs.move() without overwrite, so a leftover
 * out/make/msix/x64/Sharbee.msix from a previous run causes
 * "dest already exists". Clearing out/ first avoids that.
 *
 * Retries a few times because OneDrive / antivirus can briefly lock
 * large build artifacts (.nupkg, .msix) while they sync/scan.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../out');

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function clean() {
    if (!fs.existsSync(OUT_DIR)) {
        console.log('[clean] Nothing to remove (out/ does not exist).');
        return;
    }

    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            fs.rmSync(OUT_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
            console.log('[clean] Removed out/');
            return;
        } catch (err) {
            if (attempt === maxAttempts) {
                console.error(`[clean] Could not remove out/ after ${maxAttempts} attempts.`);
                console.error('[clean] Close any running Sharbee instances and pause OneDrive sync, then retry.');
                throw err;
            }
            console.warn(`[clean] out/ is locked (attempt ${attempt}/${maxAttempts}) — retrying in 1.5s…`);
            await sleep(1500);
        }
    }
}

clean().catch((err) => {
    console.error('[clean] Failed:', err.message);
    process.exit(1);
});
