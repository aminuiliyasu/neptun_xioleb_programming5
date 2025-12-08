# Mobile Client - React Native

## Prerequisites

### For Android:
- Node.js (v16 or higher)
- Java Development Kit (JDK) 11 or higher
- Android Studio with Android SDK
- Android device or emulator

### For iOS (macOS only):
- Node.js (v16 or higher)
- Xcode (latest version)
- CocoaPods
- iOS Simulator or physical device

## Installation

1. Install dependencies:
```bash
cd clients/mobile-client
npm install
```

2. For iOS (macOS only):
```bash
cd ios
pod install
cd ..
```

## Running the Mobile Client

### Step 1: Start Backend Services
**IMPORTANT**: Make sure backend services are running first:
```bash
# From project root
npm run start:services
```

### Step 2: Start Metro Bundler
In one terminal:
```bash
cd clients/mobile-client
npm start
```

Or from root:
```bash
npm run start:mobile
```

### Step 3: Run on Android
In another terminal:
```bash
cd clients/mobile-client
npm run android
```

**Make sure you have:**
- Android Studio installed
- Android SDK configured
- Android emulator running OR physical device connected with USB debugging enabled

### Step 4: Run on iOS (macOS only)
```bash
cd clients/mobile-client
npm run ios
```

## Service URLs Configuration

The mobile client is configured to use:
- **Android Emulator**: `10.0.2.2` (automatically maps to host machine's localhost)
- **Physical Device**: You may need to update URLs in `App.js` to use your computer's IP address

To find your computer's IP address:
```bash
# Linux/Mac
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or
hostname -I
```

Then update in `App.js`:
```javascript
const API_BASE = 'http://YOUR_IP_ADDRESS'; // e.g., 'http://192.168.1.100'
```

## Troubleshooting

### "Android project not found" Error:
✅ **FIXED**: The Android project has been initialized. You should now be able to run `npm run android`.

### Android Issues:
- **"SDK not found"**: Install Android SDK via Android Studio
  - Open Android Studio → SDK Manager → Install Android SDK
- **"No devices found"**: 
  - Start Android emulator from Android Studio
  - OR connect physical device and enable USB debugging
- **Connection fails**: 
  - For emulator: Already configured to use `10.0.2.2`
  - For physical device: Update URLs to use your computer's IP address

### iOS Issues:
- Run `pod install` in the `ios` directory
- Make sure Xcode is properly configured
- Check that iOS Simulator is running

### Build Errors:
- Clean build: `cd android && ./gradlew clean`
- Clear Metro cache: `npm start -- --reset-cache`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Connection Issues:
- Make sure backend services are running on ports 3001-3004
- Check firewall settings
- For physical devices, ensure device and computer are on the same network

