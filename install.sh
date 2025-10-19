#!/bin/bash

# Distributed Game System - Installation Script
echo "Installing Distributed Game System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "ERROR: Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "SUCCESS: Node.js $(node -v) detected"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install service dependencies
echo "Installing User Service dependencies..."
cd services/user-service && npm install && cd ../..

echo "Installing Room Service dependencies..."
cd services/room-service && npm install && cd ../..

echo "Installing Game Service dependencies..."
cd services/game-service && npm install && cd ../..

# Install client dependencies
echo "Installing CLI Client dependencies..."
cd clients/cli-client && npm install && cd ../..

echo "Installing Web Client dependencies..."
cd clients/web-client && npm install && cd ../..

echo "Installing Mobile Client dependencies..."
cd clients/mobile-client && npm install && cd ../..

echo "Installation completed successfully!"
echo ""
echo "To start the system:"
echo "   npm run start:services    # Start all microservices"
echo "   npm run start:cli         # Start CLI client"
echo "   npm run start:web         # Start Web client"
echo "   npm run start:mobile      # Start Mobile client"
echo ""
echo "Documentation:"
echo "   README.md                # Main documentation"
echo "   docs/API_DOCUMENTATION.md # API reference"
echo "   docs/ARCHITECTURE.md     # System architecture"
echo "   docs/PRESENTATION_GUIDE.md # Presentation guide"
