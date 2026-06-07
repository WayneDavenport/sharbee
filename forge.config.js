module.exports = {
  packagerConfig: {
    name: 'Sharbee',
    executableName: 'sharbee',
    icon: './assets/icon', // Add icon files: icon.icns (mac), icon.ico (win), icon.png (linux)
    asar: true,
    appBundleId: 'com.sharbee.app',
    appCategoryType: 'public.app-category.utilities',
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
        setupIcon: './assets/icon.ico',
        loadingGif: './assets/loading.gif',
        iconUrl: 'https://example.com/icon.ico', // Update with actual URL
        setupExe: 'SharbeeSetup.exe'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Sharbee',
          homepage: 'https://github.com/yourusername/sharbee',
          icon: './assets/icon.png',
          categories: ['Utility', 'Network'],
          description: 'Local file transfer and chat application for secure sharing over WiFi'
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          homepage: 'https://github.com/yourusername/sharbee',
          icon: './assets/icon.png',
          categories: ['Utility', 'Network'],
          description: 'Local file transfer and chat application'
        }
      },
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
