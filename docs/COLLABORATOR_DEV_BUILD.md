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

**Supported Node versions:** Node **20.19+**, **22.13+**, or Node **24 LTS**. Do not use odd-numbered Node releases or Node 22.0–22.12.

```bash
git clone <REPO_URL>
cd marketeye-frontend
corepack enable
corepack prepare pnpm@11.4.0 --activate
pnpm install --frozen-lockfile
pnpm doctor
```

This repository uses **pnpm only**. Do not run `npm install` or `yarn`; they create conflicting lockfiles and are rejected by the preinstall check.

Copy the local environment:

```bash
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_API_URL=https://marketeye.ahzcode.sbs/api/v1
EXPO_PUBLIC_ADMIN_PANEL_URL=https://marketeye.ahzcode.sbs/admin
EXPO_PUBLIC_EAS_PROJECT_ID=new

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

1. Confirm `.env` starts unlinked:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=new
```

2. Create **your** project:

```bash
npx eas-cli init
```

- Choose **Create a new project** under your own Expo login.
- Copy the UUID printed by EAS. Do not copy another developer's UUID.

3. Replace `new` in `.env` with your UUID:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=paste-your-uuid-here
```

4. Verify the link:

```bash
pnpm eas:which-project
```

It must print your UUID and `OK — projectId present for EAS`.

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
# or: pnpm eas:build:dev
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
pnpm exec expo start --dev-client
```

Open the installed **Market Eye** app (not Expo Go). It should connect to Metro.

If the API URL changed, update `.env` and restart with cache clear:

```bash
pnpm exec expo start --dev-client -c
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
| `npx eas-cli build --profile development --platform android` | ☐ |
| APK installed on real device | ☐ |
| `pnpm exec expo start --dev-client` | ☐ |
| Sign in + create price alert | ☐ |

---

## Common issues

- **`npx eas login` → could not determine executable** → use `npx eas-cli login` (not `eas`). Do not add `eas-cli` as a project dependency (expo-doctor rejects that); use `npx eas-cli` or a global install.  
- **Multiple lock files detected** → delete `package-lock.json` / `yarn.lock`, then run `pnpm install --frozen-lockfile`.
- **Entity not authorized** → `.env` contains another person's project UUID. Set it to `new`, run `npx eas-cli init`, then save your new UUID in `.env`.
- **Node EBADENGINE / 22.9.0** → upgrade to Node **22.13+** or **20.19+**.  
- **Using Expo Go** → remote push won’t work. Use the EAS APK.  
- **`localhost` API on phone** → phone can’t see your PC. Use LAN IP or deployed backend URL.  
- **No push after alert** → backend needs Firebase service account mounted + `php artisan queue:work`.  
- **Build fails on google-services** → file missing or wrong package name (`com.marketeye.app`).
