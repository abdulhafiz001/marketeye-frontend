# Market Eye (Expo)

React Native / Expo client for Market Eye.

## Setup

1. Copy `.env.example` → `.env`
2. Set `EXPO_PUBLIC_API_URL` to your Laravel host (LAN IP on a physical phone)
3. Optional Google OAuth: set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
4. `pnpm install` then `pnpm start`

### Push notifications (Android FCM)

Expo Go will **not** receive remote price alerts.  
`google-services.json` is gitignored — share it privately.

- Full FCM notes: **[docs/PUSH_NOTIFICATIONS.md](./docs/PUSH_NOTIFICATIONS.md)**  
- **Hand this to collaborators:** **[docs/COLLABORATOR_DEV_BUILD.md](./docs/COLLABORATOR_DEV_BUILD.md)**

## Features wired to the API

- Auth (email/password, Google ID token, forgot-password OTP)
- Markets, prices, compare, submit
- Server-side price alerts + Expo push token registration
- Offline draft queue (AsyncStorage + NetInfo → `POST /submissions/batch`)
- Insights tab (inflation movers, submission heatmap, top contributors)
- Date-stamped price history / change timeline on product detail
- Airtime wallet + claim (≥ ₦200)
- Leaderboard points (separate from wallet)
