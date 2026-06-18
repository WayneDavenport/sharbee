const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Sharbee',
    executableName: 'sharbee',
    icon: './assets/icons/icon', // Electron Forge automatically picks .ico for Windows, .icns for Mac
    asar: false, // Disabled for debugging - files will be unpacked
    appBundleId: 'com.sharbee.app',
    appCategoryType: 'public.app-category.utilities',
    // Exclude dev/build artifacts but keep all production dependencies
    ignore: (path) => {
      if (!path) return false;
      // Exclude these folders (dev-time only)
      if (path.startsWith('/.next')) return true;
      if (path.startsWith('/src')) return true;
      if (path.startsWith('/.git')) return true;
      // Include everything else (dist, electron, node_modules, etc.)
      return false;
    },
    win32metadata: {
      CompanyName: 'Sharbee',
      FileDescription: 'Local File Transfer & Chat',
      OriginalFilename: 'Sharbee.exe',
      ProductName: 'Sharbee',
      InternalName: 'Sharbee'
    },
    osxSign: {}, // for macOS code signing
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Sharbee',
        authors: 'Sharbee Team',
        description: 'Local file transfer and chat application',
        setupIcon: './assets/icons/icon.ico',
        loadingGif: './assets/sharbee-loader.gif',
        iconUrl: 'file://' + path.resolve(__dirname, 'assets/icons/icon.ico'),
        setupExe: 'SharbeeSetup.exe',
        // Create desktop and start menu shortcuts
        setupMsi: undefined,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-msix',
      config: {
        // Produce an UNSIGNED package. The Microsoft Store signs it for you in
        // Partner Center. Leaving signing on makes the maker try to auto-generate
        // a dev cert via pwsh.exe (PowerShell 7), which fails if it isn't installed.
        // (For local sideload testing instead, set sign: true and install PowerShell 7.)
        sign: false,

        // Custom Store tiles generated from assets/icons/1024x1024.png by
        // `npm run gen:msix-assets`. Re-run that script if you change the source icon.
        packageAssets: './assets/msix',

        // All manifest fields must be nested under manifestVariables.
        // packageVersion and packageIdentity are auto-populated from package.json,
        // but can be overridden here. MSIX version must be 4-part (x.x.x.x).
        manifestVariables: {
          // Replace both values below with what Partner Center shows under
          // Apps & Games → your app → App management → Product identity
          publisher: 'CN=3BEDD6A1-D4F2-441A-A728-DECF0EFF0E53',       // ← Partner Center "Package/Identity/Publisher"
          publisherDisplayName: 'Mediaq',                      // ← Partner Center "Package/Properties/PublisherDisplayName"
          packageIdentity: 'Mediaq.Sharbee',                           // ← Partner Center "Package/Identity/Name"
          packageDisplayName: 'Sharbee',
          appDisplayName: 'Sharbee',
          packageDescription: 'Local file transfer and chat over Wi-Fi',
          packageVersion: '1.0.1.0',

          // Windows 10 1809 (Oct 2018) is the minimum that natively supports MSIX.
          // The Store rejects anything targeting <= 10.0.17134.0 (1803, Apr 2018).
          packageMinOSVersion: '10.0.17763.0',      // Win 10 1809 — MSIX minimum
          packageMaxOSVersionTested: '10.0.26100.0', // Win 11 24H2
        },

        // Point directly at the installed SDK so the maker doesn't try to locate
        // one by matching packageMinOSVersion (10.0.17763.0 isn't installed here).
        windowsKitPath: 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64',
      },
      platforms: ['win32'],
    },
  ],
  plugins: [],
  hooks: {
    generateAssets: async () => {
      // Custom hook to run before packaging
      console.log('Generating assets...');
    },
    prePackage: async (config, platform, arch) => {
      console.log(`Packaging for ${platform}-${arch}...`);
    }
  }
};
