# Market Eye — Push notifications (FCM + Expo fallback)

Architecture:

```
Laravel API  →  Firebase FCM HTTP v1 (preferred)  →  Android device
             ↘  Expo Push API (fallback)          →  FCM/APNs
```

- Frontend: `google-services.json` (package `com.marketeye.app`)
- Backend: service account at `storage/app/firebase/service-account.json`
- App registers both **FCM device token** and Expo token with `POST /api/v1/user/device-token`

Expo Go cannot receive remote push on modern Android. Use an **EAS development build**.

---

## 1. Firebase console (Google)

1. Open [Firebase Console](https://console.firebase.google.com/) → create or select project **MarketEye**.
2. Add an **Android** app:
   - Package name: `com.marketeye.app` (must match `app.config.js`)
3. Download **`google-services.json`**.
4. Put it here (project root of the frontend):

   ```
   marketeye-frontend/google-services.json
   ```

5. In Firebase → Project settings → **Cloud Messaging**:
   - Ensure **Firebase Cloud Messaging API (V1)** is enabled (Google Cloud Console → APIs).

6. Create an **FCM V1 service account key** (for Expo/EAS, not for Laravel):
   - Firebase → Project settings → **Service accounts**
   - **Generate new private key** → downloads a JSON file  
   - Save it somewhere safe as `fcm-service-account.json` (do **not** commit this file)

---

## 2. EAS FCM V1 key (optional fallback)

The Laravel backend already sends directly through FCM using
`storage/app/firebase/service-account.json`. A collaborator does not need that
private file and does not need to run `eas credentials` for normal Market Eye
development builds.

Only configure this section if Expo Push is intentionally being used as the
primary/fallback delivery service. Never upload `google-services.json` here;
the prompt requires a service-account JSON containing `type`, `private_key`,
and `client_email`.

From `marketeye-frontend`:

```bash
npx eas-cli login
pnpm eas:which-project
npx eas-cli credentials
```

Then:

1. Choose **Android**
2. Choose a build profile (e.g. **development** or **production**)
3. **Google Service Account** → **FCM V1 service account key**
4. Upload `fcm-service-account.json`

Or use the Expo website:  
Project → Credentials → Android → `com.marketeye.app` → FCM V1 service account key.

Each developer uses the project UUID stored in their local `.env` as
`EXPO_PUBLIC_EAS_PROJECT_ID`. Never reuse another developer's UUID.

---

## 3. Build a dev client and install it

```bash
cd marketeye-frontend
# confirm google-services.json is present
npx eas-cli build --profile development --platform android
```

Install the APK on a physical phone, then:

```bash
pnpm exec expo start --dev-client
```

Sign in → open Notification Settings → create a price alert (this requests permission + registers `ExponentPushToken[...]` with Laravel).

---

## 4. Backend (already done)

- Token saved on `users.expo_push_token`
- Alerts fire via `ProcessPriceAlertsJob` → Expo Push API
- Keep a worker running:

```bash
cd marketeye-backend
php artisan queue:work
```

Quick manual test (replace token):

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '[{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Market Eye test",
    "body": "If you see this, FCM + Expo are working.",
    "channelId": "price-alerts"
  }]'
```

Or trigger a real alert: approve a submission that crosses a user’s target price.

---

## Checklist

| Step | Done when |
|------|-----------|
| `google-services.json` in frontend root | `app.config.js` picks it up automatically |
| FCM V1 service account uploaded to EAS | Expo can deliver Android pushes |
| Dev/preview APK installed | Not Expo Go |
| User logged in + alert created | Token in DB (`users.expo_push_token`) |
| `php artisan queue:work` | Jobs actually send |

---

## iOS (later)

Needs an Apple Developer account + APNs key uploaded via `eas credentials` (iOS). Android FCM alone is enough for your current Android-focused demo.
