# NEXUSNIME_OS

Multi-Node Anime Streamer with a Hacker/Dark-Tech aesthetic. Includes a Gamer Browser and a powerful AI Assistant.

## 🚀 Deployment

### Netlify
1. Connect your GitHub repository to Netlify.
2. Build Settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Environment Variables:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `GOOGLE_MAPS_PLATFORM_KEY`: Your Google Maps API Key.
   - All Firebase environment variables from `firebase-applet-config.json`.

### APK Conversion
This project is a Progressive Web App (PWA). To convert it to an APK:
1. Use [PWA2APK](https://www.pwa2apk.com/) or [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).
2. Point to your deployed URL (e.g., Netlify URL).
3. Download the generated APK.

## 🛠 Features
- **AI Monitoring**: Uses Gemini to detect new episodes and content updates.
- **Multi-Server**: Search across TioAnime, JKAnime, and MonosChinos.
- **Gamer Browser**: Integrated browser for safe navigation.
- **Favorites & History**: Cloud-synced favorites with automatic episode tracking.
- **Nexus Assistant**: AI-powered character that helps you find content.

## 📦 Tech Stack
- React + Vite
- Tailwind CSS
- Firebase (Auth & Firestore)
- Google Gemini AI
- Express (Backend Proxy)
