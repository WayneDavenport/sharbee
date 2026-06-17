/**
 * Generates the MSIX/Store tile assets from a single square source PNG.
 *
 * Usage:  node scripts/gen-msix-assets.js
 * Output: assets/msix/  (point forge.config.js packageAssets at this folder)
 *
 * The filenames and sizes match what the AppxManifest references plus the common
 * scale/target-size variants Windows looks for. Square tiles use "contain" so a
 * non-square logo is never cropped; wide/splash tiles letterbox on a transparent
 * (or branded) background.
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Source image — highest-resolution square icon available
const SOURCE = path.resolve(__dirname, '../assets/icons/1024x1024.png');
const OUT_DIR = path.resolve(__dirname, '../assets/msix');

// Background for letterboxed (non-square) tiles. Use a hex string for a branded
// color (e.g. '#2563eb') or keep transparent.
const BG = { r: 0, g: 0, b: 0, alpha: 0 };

// [filename, width, height]
const SQUARE_TILES = [
    ['icon.png', 50, 50],                                          // StoreLogo / Properties>Logo
    ['Square44x44Logo.png', 44, 44],
    ['Square44x44Logo.scale-200.png', 88, 88],
    ['Square44x44Logo.targetsize-24_altform-unplated.png', 24, 24],
    ['Square150x150Logo.png', 150, 150],
    ['Square150x150Logo.scale-200.png', 300, 300],
    ['LockScreenLogo.scale-200.png', 48, 48],
];

// Wide/splash tiles letterbox the square logo onto a wider canvas
const WIDE_TILES = [
    ['Wide310x150Logo.scale-200.png', 620, 300],
    ['SplashScreen.scale-200.png', 1240, 600],
];

async function generate() {
    if (!fs.existsSync(SOURCE)) {
        console.error(`[gen-msix-assets] Source not found: ${SOURCE}`);
        process.exit(1);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const [name, w, h] of SQUARE_TILES) {
        await sharp(SOURCE)
            .resize(w, h, { fit: 'contain', background: BG })
            .png()
            .toFile(path.join(OUT_DIR, name));
        console.log(`  ✓ ${name} (${w}x${h})`);
    }

    for (const [name, w, h] of WIDE_TILES) {
        // Scale the logo to fit the shorter dimension, then center on the canvas
        const logoSize = Math.round(h * 0.8);
        const logo = await sharp(SOURCE)
            .resize(logoSize, logoSize, { fit: 'contain', background: BG })
            .png()
            .toBuffer();
        await sharp({
            create: { width: w, height: h, channels: 4, background: BG },
        })
            .composite([{ input: logo, gravity: 'center' }])
            .png()
            .toFile(path.join(OUT_DIR, name));
        console.log(`  ✓ ${name} (${w}x${h})`);
    }

    console.log(`\n[gen-msix-assets] Done → ${OUT_DIR}`);
}

generate().catch((err) => {
    console.error('[gen-msix-assets] Failed:', err);
    process.exit(1);
});
