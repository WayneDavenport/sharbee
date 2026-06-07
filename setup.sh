#!/bin/bash

# Sharbee Quick Setup Script
# Run this after cloning the repository

echo "🚀 Sharbee - Quick Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required"
    echo "   Current version: $(node --version)"
    echo "   Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js version OK: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"

# Check for required directories
echo ""
echo "📁 Creating required directories..."
mkdir -p electron
mkdir -p out
echo "✅ Directories created"

# Build static export
echo ""
echo "🔨 Building Next.js static export..."
npm run export

if [ $? -ne 0 ]; then
    echo "❌ Failed to build static export"
    exit 1
fi
echo "✅ Static export built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start development: npm run electron:dev"
echo "  2. Package app:       npm run package"
echo "  3. Create installer:  npm run make"
echo ""
echo "📚 Documentation:"
echo "  - README.md        - User guide"
echo "  - DEVELOPMENT.md   - Developer guide"
echo "  - ARCHITECTURE.md  - Architecture overview"
echo ""
echo "Happy coding! 🎉"
