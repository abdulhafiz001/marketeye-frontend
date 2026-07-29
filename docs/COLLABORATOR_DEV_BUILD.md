# Collaborator guide — run Market Eye (dev build + push)

Send this file (or copy the steps below) to teammates.  
`google-services.json` is **gitignored** — they must get it from you privately (Slack/Drive), not from GitHub.

**Important:** Expo Go cannot receive remote push on modern Android. You need an **EAS development build**.

---

## 0. What you need from the project owner

1. Access to the `marketeye-frontend` repo  
2. The private file **`google-services.json`** (Firebase Android config for package `com.marketeye.app`)  
3. (Optional but needed for Expo-routed push) the Firebase **FCM V1 service account** JSON — only if they will upload credentials to EAS themselves  
4. Backend API URL to use, e.g. `https://your-coolify-domain.com` or a LAN IP while testing locally  

---

## 1. Clone & install

**Node version:** use **Node 20.19+** or **22.13+** (not 22.9.0).  
Check with `node -v`. Upgrade via [nodejs.org](https://nodejs.org/) or `nvm install 22`.

```bash
git clone <REPO_URL>
cd marketeye-frontend
pnpm install
# or: npm install
```

Copy env:

```bash
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_API_URL=https://YOUR_BACKEND_URL
EXPO_PUBLIC_ADMIN_PANEL_URL=https://YOUR_BACKEND_URL/admin

# Optional Google sign-in (ask owner for client IDs)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

On a **physical phone** talking to a PC backend, use the PC Wi‑Fi IP, not `localhost`:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

---

## 2. Add `google-services.json`

1. Receive `google-services.json` from the project owner  
2. Place it in the **frontend project root**:

```
marketeye-frontend/google-services.json
```

Same folder as `app.config.js` / `package.json`.

Do **not** commit this file.

Confirm the package inside the file is:

```json
"package_name": "com.marketeye.app"
```

---

## 3. Your own Expo account (recommended for collaborators)

Do **not** use the owner’s EAS project. Create builds under **your** Expo account so credentials and billing stay yours.

`npx eas` does not work — use `eas-cli`:

```bash
npx eas-cli login
npx eas-cli whoami   # must show YOUR username
```

### 3a. Create your own EAS project

**What is `EXPO_PUBLIC_EAS_PROJECT_ID`?**  
A line **you type into your local `.env`** (same folder as `package.json`). It is not from Expo/Firebase automatically. It tells EAS which Expo project is yours.

If `eas init` says `Project already linked (ID: 05f71ac9-...)`, the app config still has the **owner’s** id — pull latest (owner id was removed from git) and verify:

```bash
git pull
npm run eas:which-project
```

You want: `Resolved extra.eas.projectId: (none — ok to run eas init)`.

1. In `.env`:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=new
```

2. Confirm unlink:

```bash
npm run eas:which-project
```

3. Create **your** project:

```bash
npx eas-cli init
```

- **Create a new project** under your login (`beauteeanne` etc.).
- If `eas init` edits `app.config.js` and inserts a `projectId`, copy that UUID into `.env` as below, then **undo** the `app.config.js` change (`git checkout -- app.config.js`) so you don’t commit your id.

4. Save your uuid in `.env`:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=paste-your-uuid-here
```

5. Then credentials / build.

### 3b. Upload FCM credentials on *your* EAS project

You still need the same Firebase Android app as the backend (`google-services.json` for `com.marketeye.app`) so server push can reach your device. Upload the FCM V1 service account JSON **to your EAS project**:

```bash
npx eas-cli credentials
```

1. **Android**  
2. Profile: **development** (upload for production too if you use it)  
3. **Google Service Account → FCM V1**  
4. Upload the Firebase service-account JSON the owner shared privately  

Web UI: [expo.dev](https://expo.dev) → **your** project → Credentials → Android → `com.marketeye.app` → FCM V1.

**Note:** Expo/EAS is yours; Firebase can still be the shared Market Eye Firebase project so the Laravel backend can push to you. Fully separate Firebase is only needed if you also run your own backend.

---

## 4. Build the development APK

```bash
cd marketeye-frontend
npx eas-cli build --profile development --platform android
# or: npm run eas:build:dev
# or: pnpm exec eas build --profile development --platform android
```

When the build finishes:

1. Open the build page link from the terminal  
2. Download the **APK**  
3. Install it on a **physical Android phone** (enable install from unknown sources if asked)

---

## 5. Start Metro against the dev client

Phone and PC on the same Wi‑Fi (for LAN API), then:

```bash
cd marketeye-frontend
npx expo start --dev-client
```

Open the installed **Market Eye** app (not Expo Go). It should connect to Metro.

If the API URL changed, update `.env` and restart with cache clear:

```bash
npx expo start --dev-client -c
```

---

## 6. What to test

1. **Register / login**  
2. Browse markets, compare prices, submit a price  
3. **Profile → Notification settings** → create a price alert (allow notifications)  
4. Confirm the backend has your device token (`users.fcm_device_token` / `expo_push_token`)  
5. Trigger a push (owner can run on backend):

```bash
php artisan push:test your@email.com
```

Or approve a submission that crosses an alert target (queue worker must be running on the server).

6. Offline submit: turn on airplane mode, submit a price → should show pending uploads → turn network back on → syncs  

---

## Quick checklist

| Step | Done? |
|------|--------|
| `pnpm install` + `.env` with API URL | ☐ |
| `google-services.json` in frontend root | ☐ |
| Own EAS project + `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env` | ☐ |
| FCM V1 key on **your** EAS project | ☐ |
| `eas build --profile development --platform android` | ☐ |
| APK installed on real device | ☐ |
| `npx expo start --dev-client` | ☐ |
| Sign in + create price alert | ☐ |

---

## Common issues

- **`npx eas login` → could not determine executable** → use `npx eas-cli login` (not `eas`). Pull latest main so `eas-cli` is in `devDependencies`, then reinstall.  
- **Entity not authorized / Project already linked (05f71ac9-...)** → still on the owner project. Run `git pull`, set `EXPO_PUBLIC_EAS_PROJECT_ID=new` in `.env`, run `npm run eas:which-project` (must say `none`), then `npx eas-cli init`.  
- **Emergency (no pull yet):** in `app.config.js` search for `05f71ac9` or `projectId` and delete that whole `eas: { projectId: ... }` block, save, run `npx eas-cli init`.  
- **Node EBADENGINE / 22.9.0** → upgrade to Node **22.13+** or **20.19+**.  
- **Using Expo Go** → remote push won’t work. Use the EAS APK.  
- **`localhost` API on phone** → phone can’t see your PC. Use LAN IP or deployed backend URL.  
- **No push after alert** → backend needs Firebase service account mounted + `php artisan queue:work`.  
- **Build fails on google-services** → file missing or wrong package name (`com.marketeye.app`).
