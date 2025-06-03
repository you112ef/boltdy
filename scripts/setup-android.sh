#!/bin/bash

echo "Setting up Bolt DIY for Android development..."

# Install Capacitor dependencies with legacy peer deps to avoid conflicts
echo "Installing Capacitor dependencies..."
npm install --legacy-peer-deps @capacitor/core @capacitor/cli @capacitor/android @capacitor/preferences @capacitor/status-bar @capacitor/splash-screen

# Initialize Capacitor if not already done
if [ ! -f "capacitor.config.ts" ]; then
    echo "Initializing Capacitor..."
    npx cap init
fi

echo "Building the web app..."
npm run build

echo "Adding Android platform..."
npx cap add android

echo "Syncing web assets with native project..."
npx cap sync

echo "Android setup complete!"
echo "To open Android Studio and run the app:"
echo "npm run android:open"
echo ""
echo "To build and sync changes:"
echo "npm run android:build"