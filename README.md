# Market Eye (Expo)

React Native / Expo client for Market Eye.

## Setup

1. Copy `.env.example` → `.env`
2. Set `EXPO_PUBLIC_API_URL` to your Laravel host (LAN IP on a physical phone)
3. Optional Google: set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (see backend `PROJECT.md`)
4. `pnpm install` then `pnpm start`

## Features wired to the API

- Auth (email/password, Google ID token, forgot-password OTP)
- Markets, prices, compare, submit
- Airtime wallet + claim (≥ ₦200)
- Leaderboard points (separate from wallet)
