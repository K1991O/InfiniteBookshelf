# 📱 InfiniteBookshelf — React Native Setup

This project is a React Native (TypeScript) application that can be run on:

- iOS Simulator
- iPhone (physical device)
- Android Emulator
- Android phone

One Metro bundler serves all platforms.

## 🧱 Prerequisites (one-time)

- **macOS**
- **Node.js** (via nvm, Node 18+ recommended)
- **Xcode** (from App Store)
- **Android Studio** (for Android only)
- **Watchman** (recommended)

```bash
brew install watchman
```

## 🔁 Fresh start (after reboot or cloning the repo)

From the project root:

```bash
# 1. Use correct Node version (if using nvm)
nvm use

# 2. Install dependencies
npm install
```

If `nvm use` fails, check `.nvmrc` or install the version:

```bash
nvm install
```

## 🚦 Start the Metro bundler (REQUIRED)

Metro must be running for all platforms.

```bash
npx react-native start
```

**Leave this terminal open.**

## 🍎 Run on iOS

### iOS Simulator (no signing required)

```bash
npx react-native run-ios
```

Or target a specific simulator:

```bash
npx react-native run-ios --simulator "iPhone 15"
```

### iPhone (physical device)

Requires Apple ID signing (set once in Xcode)

```bash
npx react-native run-ios --device "Your iPhone Name"
```

If this fails:

```bash
cd ios
open MyApp.xcworkspace
```

Then in Xcode:

1. Select **MyApp** → **Signing & Capabilities**
2. Enable **Automatically manage signing**
3. Select your Apple ID team

## 🤖 Run on Android

### Android Emulator

1. Open Android Studio
2. Start an emulator
3. Then:

```bash
npx react-native run-android
```

### Android Phone (USB)

1. Enable Developer Mode
2. Enable USB Debugging
3. Plug phone into Mac
4. Then:

```bash
adb reverse tcp:8081 tcp:8081
npx react-native run-android
```

## 🔥 Hot Reload / Fast Refresh

- Enabled by default
- Save any `.ts` / `.tsx` file → app updates instantly
- Shake device (or `Cmd+D` in simulator) for dev menu

## 🧠 Common commands (quick reference)

```bash
# Start Metro
npx react-native start

# iOS
npx react-native run-ios

# Android
npx react-native run-android

# List iOS devices
xcrun xctrace list devices

# Reset Metro cache (if things get weird)
npx react-native start --reset-cache
```

## 🧹 If things break badly

```bash
rm -rf node_modules
npm install

cd ios
pod install
cd ..
```

Then restart Metro and rerun the platform.

## 📂 Project structure (important files)

```
InfiniteBookshelf/
├── App.tsx          # Main application entry
├── index.js         # Registers the app
├── tsconfig.json    # TypeScript config
├── package.json
├── ios/             # iOS native project
├── android/         # Android native project
```

## ✅ Mental model (important)

- **Metro** = JavaScript server (must always be running)
- **run-ios / run-android** = builds native shell once, then reuses it
- You can run iOS + Android at the same time using one Metro instance
