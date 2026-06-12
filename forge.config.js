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
