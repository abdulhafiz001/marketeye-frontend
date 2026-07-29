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

## 3. Expo login + FCM credentials on EAS (Android push)

If the owner already uploaded FCM V1 credentials to the shared Expo project, skip to step 4.

Otherwise, from `marketeye-frontend`:

```bash
npx eas login
npx eas credentials
```

Then:

1. **Android**  
2. Profile: **development** (or production — upload for both if unsure)  
3. **Google Service Account → FCM V1 service account key**  
4. Upload the Firebase service-account JSON the owner gave you  

EAS project id (already in app config): `05f71ac9-5001-4077-b954-38187c2151cf`

Web UI alternative: [expo.dev](https://expo.dev) → project → Credentials → Android → `com.marketeye.app` → FCM V1.

---

## 4. Build the development APK

```bash
cd marketeye-frontend
npx eas build --profile development --platform android
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
| FCM V1 key on EAS (shared project) | ☐ |
| `eas build --profile development --platform android` | ☐ |
| APK installed on real device | ☐ |
| `npx expo start --dev-client` | ☐ |
| Sign in + create price alert | ☐ |

---

## Common issues

- **Using Expo Go** → remote push won’t work. Use the EAS APK.  
- **`localhost` API on phone** → phone can’t see your PC. Use LAN IP or deployed backend URL.  
- **No push after alert** → backend needs Firebase service account mounted + `php artisan queue:work`.  
- **Build fails on google-services** → file missing or wrong package name (`com.marketeye.app`).
