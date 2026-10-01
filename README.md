# Pong WorkMate 1.1.1 Fix

This package fixes the incomplete v1.1 upload.

Required files to overwrite in GitHub:
- index.html
- styles.css
- app.js
- firebase-config.js
- manifest.json
- sw.js
- icons/

After upload:
1. Commit changes
2. Wait for GitHub Pages deployment
3. Open the web URL in a private/incognito window first
4. Google Login should show as a styled full-screen card
5. Desktop uses popup login; iPhone/PWA uses redirect login

Firebase requirements:
- Authentication > Google provider enabled
- Authorized domains includes pong00550.github.io
- Firestore exists
- Firestore Rules published from firestore.rules
