# MiniMind — Android Native Build Guide
# Use this with Codex / Cursor / Copilot / Antigravity in Android Studio

## PROJECT CONTEXT

MiniMind is a production-ready AI-powered learning app built with:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **Payments**: Razorpay (Live Mode) — subscriptions + credit top-ups
- **AI Engine**: Google Gemini + OpenAI via Supabase Edge Functions
- **PWA**: Service Worker + Manifest (disable SW for Capacitor)
- **Capacitor**: Already configured for Android wrapping

## TECH STACK (DO NOT CHANGE)
- All AI calls go through Supabase Edge Function (`/functions/v1/chat`)
- All payments go through Razorpay Edge Functions
- Auth uses Supabase Auth (email + password)
- Credits system is server-side atomic (PostgreSQL function `deduct_user_credit`)
- State management: React Context + TanStack Query

---

## STEP 1: CLONE & SETUP

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd minimindworkgd
npm install
```

## STEP 2: PRODUCTION BUILD

Open `capacitor.config.ts` and REMOVE the `server` block:

```typescript
// DELETE THIS BLOCK for production:
// server: {
//   url: 'https://...',
//   cleartext: true
// }
```

Final `capacitor.config.ts` should look like:
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minimind.app',
  appName: 'MiniMind',
  webDir: 'dist',
};

export default config;
```

Then build:
```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```

## STEP 3: ANDROID STUDIO ENHANCEMENTS

Once the project opens in Android Studio, use Codex/Cursor to apply these enhancements:

---

### 🎨 APP ICON & SPLASH SCREEN

**Prompt for Codex/Copilot:**
```
Generate adaptive app icons for MiniMind learning app.
- Foreground: Brain/lightbulb icon with gradient (green #22c55e to blue #3b82f6)
- Background: White (#ffffff)
- Create ic_launcher.xml with adaptive icon layers
- Generate all density variants (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Add splash screen using Android 12+ SplashScreen API
- Splash background color: #f0f9f4 (mint green)
- Splash icon: Same brain icon, centered
- Keep splash duration under 1 second
```

**Files to modify:**
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/values/colors.xml`

---

### 🔒 NETWORK SECURITY CONFIG

**Prompt:**
```
Add network security config for Android that:
1. Allows HTTPS connections to these domains:
   - ojyabhrwfwdkjvpvlmuz.supabase.co (backend API)
   - ojyabhrwfwdkjvpvlmuz.functions.supabase.co (edge functions)  
   - api.razorpay.com (payments)
   - fonts.googleapis.com (fonts)
   - fonts.gstatic.com (font files)
   - i.ibb.co (images)
2. Block all cleartext HTTP traffic
3. Add proper certificate pinning for production
```

**File:** `android/app/src/main/res/xml/network_security_config.xml`

---

### 📱 ANDROID MANIFEST OPTIMIZATIONS

**Prompt:**
```
Update AndroidManifest.xml for MiniMind production app:
1. Add required permissions:
   - INTERNET (already present)
   - ACCESS_NETWORK_STATE
   - VIBRATE (for haptic feedback)
2. Set android:usesCleartextTraffic="false"
3. Add android:networkSecurityConfig
4. Set orientation to portrait only
5. Enable hardware acceleration
6. Add intent filter for deep links: minimind://
7. Set android:exported="true" for main activity
8. Add meta-data for Google Play:
   - com.google.android.gms.version
9. Disable backup to prevent data leaks:
   - android:allowBackup="false"
   - android:fullBackupContent="false"
```

---

### 🎯 WEBVIEW OPTIMIZATIONS

**Prompt:**
```
Optimize the Capacitor WebView (MainActivity) for performance:
1. Enable DOM storage
2. Enable JavaScript
3. Set mixed content mode to MIXED_CONTENT_NEVER_ALLOW
4. Enable hardware acceleration on WebView
5. Set cache mode to LOAD_DEFAULT
6. Override URL loading to keep navigation in-app
7. Handle Razorpay payment redirects inside WebView (don't open external browser)
8. Add back button handler: 
   - If WebView can go back → go back
   - If on home page → show "Press back again to exit" toast
   - Double-back within 2 seconds → exit app
9. Handle file uploads from WebView (for profile avatar)
10. Set user agent string to include "MiniMind-Android/2.0"
```

---

### 🔐 PROGUARD RULES (Release Build)

**Prompt:**
```
Add ProGuard rules for MiniMind Capacitor app:
1. Keep all Capacitor plugin classes
2. Keep Razorpay SDK classes (if added natively)
3. Keep WebView JavaScript interfaces
4. Don't obfuscate WebView-related classes
5. Keep Gson/serialization models if any
```

**File:** `android/app/proguard-rules.pro`

---

### 📦 BUILD GRADLE OPTIMIZATIONS

**Prompt:**
```
Update android/app/build.gradle for production:
1. Set minSdkVersion to 24 (Android 7.0+)
2. Set targetSdkVersion to 34 (Android 14)
3. Enable minifyEnabled true for release
4. Enable shrinkResources true for release
5. Set versionCode to 1
6. Set versionName to "2.0.0"
7. Add signing config placeholder for release keystore
8. Enable R8 full mode
9. Set applicationId to: app.minimind.learn
   (more professional than the auto-generated one)
```

---

### 🏪 PLAY STORE SIGNING

**Prompt:**
```
Create a signing configuration for Play Store release:
1. Guide me to generate a keystore:
   keytool -genkey -v -keystore minimind-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias minimind
2. Add signingConfigs block in build.gradle
3. Reference keystore from local gradle.properties (not committed to git)
4. Apply signing config to release buildType
```

---

## STEP 4: BUILD SIGNED APK/AAB

In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle (.aab)** for Play Store
3. Select your keystore created above
4. Choose **release** build variant
5. Build!

---

## STEP 5: PLAY STORE CHECKLIST

Before uploading to Google Play Console:

- [ ] App icon (512x512 PNG) — high-res
- [ ] Feature graphic (1024x500 PNG)
- [ ] At least 4 screenshots (phone) — 16:9 or 9:16
- [ ] Privacy Policy URL: https://minimind.app/privacy
- [ ] Short description (80 chars): "AI-powered learning — any topic explained 4 ways"
- [ ] Full description (4000 chars): See below
- [ ] App category: Education
- [ ] Content rating: Everyone
- [ ] Target audience: 13+
- [ ] Contact email: feedback.minimind.app@gmail.com

### Suggested Play Store Description:

```
🧠 MiniMind — Learn Anything, 4 Ways

MiniMind is your AI-powered learning companion that explains any topic 
in 4 unique modes:

📘 Beginner Mode — Simple, fun explanations for everyone
🤔 Thinker Mode — Logical reasoning with real-world scenarios  
📖 Story Mode — Learn through memorable narratives
🎓 Mastery Mode — Deep, exam-ready explanations for JEE/NEET/UPSC

✨ Key Features:
• Ask anything and get instant AI explanations
• 4 learning modes tailored to your style
• Study Plans with structured learning paths
• Quick Recall flashcards (Ekakshar)
• Test Yourself — explain concepts back to check understanding
• Purpose Lens — customize AI for your learning goals
• Save notes and track progress
• Daily streaks and achievements
• Support for 25+ languages including Hindi
• Credit-based fair usage system
• Dark mode support

📱 Built for Indian students preparing for competitive exams. 
Works offline-ready with PWA support.

Start learning smarter today! 🚀
```

---

## IMPORTANT NOTES

1. **DO NOT modify any files in `src/` or `supabase/`** — the web app is production-ready
2. **Only modify Android-specific files** in the `android/` directory  
3. **All API endpoints are HTTPS** — no cleartext needed
4. **Razorpay works in WebView** — no native SDK needed
5. **Test on a real device** before uploading to Play Store
6. **Keep the keystore file SAFE** — you need it for ALL future updates

---

## EMERGENCY: IF SOMETHING BREAKS

If the Android build has issues:
```bash
# Reset and rebuild
cd minimindworkgd
rm -rf android/
npm run build
npx cap add android
npx cap sync
npx cap open android
```

This regenerates a clean Android project from your working web app.
