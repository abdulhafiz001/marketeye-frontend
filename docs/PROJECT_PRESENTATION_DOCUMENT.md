# NaijaPrice Pulse (Market Eye) — Project Presentation Document

**Version:** 1.0  
**Date:** February 2025  
**Purpose:** Comprehensive project documentation for stakeholder presentations

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Value Proposition for Nigerian Users](#3-value-proposition-for-nigerian-users)
4. [Methodology](#4-methodology)
5. [Findings & Challenges](#5-findings--challenges)
6. [Conclusion & Progress Summary](#6-conclusion--progress-summary)
7. [Screenshot Placement Guide for Presentations](#7-screenshot-placement-guide-for-presentations)

---

## 1. Executive Summary

**NaijaPrice Pulse** (also branded as **Market Eye**) is a mobile application built to help Nigerians track commodity prices in real time, receive AI-powered price forecasts, and set price alerts to save money on everyday purchases. The app targets essential food staples and perishables—Rice, Tomatoes, Onions, Garri, Beans, Palm Oil—that form the backbone of Nigerian household spending.

**Current Status:** The app has a fully functional UI/UX with onboarding, authentication, dashboard, market browsing, commodity details with charts, price alerts, and profile management. All features are built with **mock data**; backend integration and live price feeds are planned for the next phase.

---

## 2. Project Overview

### What Is NaijaPrice Pulse?

NaijaPrice Pulse is a **React Native (Expo)** mobile application that provides:

| Feature | Description |
|--------|-------------|
| **Real-Time Prices** | View current commodity prices across multiple markets (e.g., Garki, Wuse, Kubwa in Abuja) |
| **AI-Powered Forecasts** | Predicted price trends with confidence levels and contributing factors |
| **Price Alerts** | Set alerts for when prices go above or below a target—get notified and buy at the right time |
| **Market Pulse** | Macro indicators like Naira/USD and fuel prices that influence commodity costs |
| **Watchlist** | Save favorite commodities for quick access |
| **Price History Charts** | Visualize price trends over time (1D, 1W, 1M, 3M, 6M) |

### Target Users

- **Households** — Families planning grocery budgets
- **Traders & Retailers** — Market participants tracking wholesale/retail prices
- **Small Business Owners** — Restaurants, caterers managing food costs
- **Budget-Conscious Nigerians** — Anyone wanting to maximize savings on essential goods

### Commodities Covered

- **Staples:** Rice (50kg bag), Garri, Beans  
- **Perishables:** Tomatoes, Onions  
- **Other:** Palm Oil  

All prices are displayed in **Naira (₦)** with units appropriate to each commodity (e.g., per bag, per basket, per liter).

---

## 3. Value Proposition for Nigerian Users

### Why This App Matters in Nigeria

1. **Price Volatility**  
   Nigerian commodity prices fluctuate due to fuel costs, seasonal factors, exchange rates, and supply chain issues. Users often lack visibility into these changes until they reach the market.

2. **Information Asymmetry**  
   Sellers may charge different prices across markets. NaijaPrice Pulse helps users compare prices (e.g., Garki vs. Wuse vs. Kubwa) and choose the best market before leaving home.

3. **Budget Planning**  
   With AI forecasts and historical trends, users can plan purchases when prices are expected to rise or fall, reducing surprise expenses.

4. **Savings Through Alerts**  
   Price alerts notify users when commodities drop below a target price, enabling them to buy at optimal times and save money over time.

5. **Localized Experience**  
   The app uses Nigerian markets (Abuja-focused in current mock data), Naira currency, and familiar commodities—designed specifically for the Nigerian context.

---

## 4. Methodology

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React Native 0.81.5, Expo ~54 |
| **Language** | TypeScript 5.9 |
| **Navigation** | React Navigation 7 (Stack + Bottom Tabs) |
| **State Management** | Custom store with `useSyncExternalStore` (Zustand-like) |
| **UI Components** | React Native Paper, MaterialCommunityIcons |
| **Charts** | react-native-chart-kit |
| **Animations** | React Native Animated, Reanimated |
| **Storage** | AsyncStorage (for persistence) |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     App Entry (Expo)                         │
├─────────────────────────────────────────────────────────────┤
│  AppNavigator (Root)                                         │
│  ├── Onboarding (3 screens) → Auth → Main                    │
│  ├── Auth (Login, SignUp, ForgotPassword)                   │
│  └── Main (Bottom Tabs)                                      │
│       ├── Dashboard                                          │
│       ├── Markets (MarketScreen + CommodityDetailScreen)     │
│       ├── Alerts                                             │
│       └── Profile (Watchlist, Account, Notifications)       │
├─────────────────────────────────────────────────────────────┤
│  Global Store (useStore)                                     │
│  - user, isAuthenticated, hasCompletedOnboarding            │
│  - commodities, watchlist, alerts, alertsEnabled             │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  - mockData.ts (mock commodities, user, alerts, metrics)    │
│  - [Planned] API integration for live prices                 │
└─────────────────────────────────────────────────────────────┘
```

### Development Approach

- **User-Centric Design:** Onboarding explains value (Real-Time Prices → AI Forecasts → Save Money) before sign-up
- **Progressive Disclosure:** Dashboard shows key metrics; users drill down into commodity details and alerts
- **Responsive UI:** Animations, safe areas, and keyboard handling for a smooth mobile experience
- **Modular Structure:** Screens, components, store, and types are organized for maintainability and future scaling

---

## 5. Findings & Challenges

### Challenge 1: Sourcing Day-to-Day Correct Prices (e.g., Abuja)

**Problem:**  
The app currently uses **static mock data**. To deliver real value, we need **accurate, daily commodity prices** for specific locations like Abuja (Garki, Wuse, Kubwa, etc.).

**Findings on Data Sources:**

| Source | Description | Pros | Cons |
|--------|-------------|------|------|
| **Nigeria Food Price Tracking (NBS)** | National Bureau of Statistics initiative; crowdsourcing + AI | Official, covers multiple markets | May need API access; update frequency varies |
| **World Bank Real Time Prices (RTP)** | Monthly energy & food price estimates | Structured, historical | Monthly, not daily; may not cover all Abuja markets |
| **openAFRICA** | Open datasets on Nigerian commodity prices | Free, downloadable | Historical; not real-time |
| **Manual Crowdsourcing** | Partner with market associations or field agents | Can be tailored to our markets | Costly, requires logistics |
| **Web Scraping** | Scrape market websites or social media | Potentially real-time | Unreliable, legal/ethical concerns |

**Recommendation:**  
Integrate with **Nigeria Food Price Tracking** (nigeriafoodpricetracking.ng) if an API is available, or explore partnerships with NBS or market associations for structured daily data. A hybrid approach (official data + verified crowdsourcing) could improve coverage and accuracy.

---

### Challenge 2: AI Forecast Accuracy

**Problem:**  
AI forecasts (predicted price, confidence, factors) are currently **hardcoded**. Real forecasts require historical price data and a trained model.

**Next Steps:**  
- Collect sufficient historical data (e.g., 6–12 months)  
- Train a simple forecasting model (e.g., time series, regression) or integrate an external forecasting API  
- Validate predictions against actual prices and refine

---

### Challenge 3: Alert Delivery

**Problem:**  
Alerts are stored in the app state but **not yet delivered** via push notifications. Users must open the app to see triggered alerts.

**Next Steps:**  
- Integrate Expo Push Notifications or Firebase Cloud Messaging  
- Implement a backend service to evaluate alert conditions against live prices and send notifications

---

### Challenge 4: Multi-Location Support

**Problem:**  
Mock data is Abuja-focused. Nigeria has many cities (Lagos, Kano, Port Harcourt, etc.) with different price dynamics.

**Next Steps:**  
- Add location selection (city/market)  
- Ensure data sources support multiple locations  
- Update UI to show location-specific prices and forecasts

---

### Challenge 5: Authentication & Backend

**Problem:**  
Login uses mock user data; no real authentication or user persistence. Social login (Google, Apple) is UI-only.

**Next Steps:**  
- Implement backend (e.g., Firebase Auth, Supabase, or custom API)  
- Add proper sign-up, password reset, and session management  
- Enable social login via OAuth

---

## 6. Conclusion & Progress Summary

### What Has Been Accomplished

| Area | Status | Notes |
|------|--------|-------|
| **Onboarding** | ✅ Complete | 3 screens (Real-Time, AI Forecasts, Save Money) |
| **Authentication** | ✅ UI Complete | Login, SignUp, ForgotPassword; mock auth |
| **Dashboard** | ✅ Complete | Greeting, search, Market Pulse, AI Spotlight, Live Prices |
| **Markets** | ✅ Complete | List, search, category filter, watchlist |
| **Commodity Detail** | ✅ Complete | Price chart, AI forecast, market prices |
| **Alerts** | ✅ Complete | Add/remove/toggle alerts; modal for new alerts |
| **Profile** | ✅ Complete | Watchlist, Account, Notifications, Help, Logout |
| **Design System** | ✅ Complete | Colors, typography, spacing, icons |
| **State Management** | ✅ Complete | Custom store, watchlist, alerts |
| **Backend / API** | ⏳ Pending | All data is mock |
| **Push Notifications** | ⏳ Pending | Alerts not delivered externally |
| **Live Price Data** | ⏳ Pending | Requires data source integration |

### Overall Progress

**Estimated Completion:** ~70% of core product (UI/UX and flows).  
**Remaining Work:** Backend, live data integration, push notifications, and production deployment.

### Next Phase Priorities

1. **Integrate live price data** (Nigeria Food Price Tracking or equivalent)  
2. **Implement backend & real authentication**  
3. **Add push notifications for alerts**  
4. **Expand to more cities and commodities**  
5. **Deploy to App Store / Play Store**

---

## 7. Screenshot Placement Guide for Presentations

Use this guide to know **where to insert screenshots** in your presentation slides.

---

### Slide: "Project Introduction" or "What We Built"

**Screenshot:** **Onboarding Screen 1** (Real-Time Prices)  
- **File:** `screens/onboarding/OnboardingScreen1.tsx`  
- **Shows:** Large chart icon, "Real-Time Prices" title, description about commodity prices across Nigeria  
- **Why:** Introduces the app’s primary value proposition

---

### Slide: "Key Features"

**Screenshot:** **Onboarding Screen 2** (AI-Powered Forecasts)  
- **File:** `screens/onboarding/OnboardingScreen2.tsx`  
- **Shows:** Brain icon, "AI-Powered Forecasts"  
- **Why:** Highlights the AI/forecasting differentiator  

**Screenshot:** **Onboarding Screen 3** (Save Money)  
- **File:** `screens/onboarding/OnboardingScreen3.tsx`  
- **Shows:** Wallet icon, "Save Money", price alerts  
- **Why:** Emphasizes user savings and alerts

---

### Slide: "User Journey" or "Authentication"

**Screenshot:** **Login Screen**  
- **File:** `screens/auth/LoginScreen.tsx`  
- **Shows:** Welcome Back, email/password fields, Google/Apple buttons, Sign Up link  
- **Why:** Demonstrates the entry point after onboarding  

**Optional:** Sign Up screen, Forgot Password screen

---

### Slide: "Main App Experience"

**Screenshot:** **Dashboard Screen**  
- **File:** `screens/main/DashboardScreen.tsx`  
- **Shows:** Greeting, search bar, Market Pulse (Naira/USD, Fuel), AI Spotlight card, Live Prices grid  
- **Why:** Main home screen; shows the full experience at a glance  

**Screenshot:** **Market Screen**  
- **File:** `screens/main/MarketScreen.tsx`  
- **Shows:** Search, category pills (All, Grains, Vegetables, etc.), commodity cards with prices and trends, watchlist stars  
- **Why:** Core browsing experience for commodities  

**Screenshot:** **Commodity Detail Screen**  
- **File:** `screens/main/CommodityDetailScreen.tsx`  
- **Shows:** Hero price, line chart, AI forecast card, market prices (Garki, Wuse, Kubwa)  
- **Why:** Deep-dive view; shows charts and forecasts  

---

### Slide: "Price Alerts"

**Screenshot:** **Alerts Screen**  
- **File:** `screens/main/AlertsScreen.tsx`  
- **Shows:** List of alerts (e.g., Rice below ₦40,000; Tomatoes above ₦4,000), Add Alert FAB, global toggle  
- **Why:** Demonstrates the "Save Money" feature in action  

**Optional:** Screenshot of "Add Alert" modal (commodity picker, above/below, target price)

---

### Slide: "Profile & Settings"

**Screenshot:** **Profile Screen**  
- **File:** `screens/main/ProfileScreen.tsx`  
- **Shows:** User avatar, Watchlist, Account, Notifications, Help & Support, About App, Logout  
- **Why:** Shows personalization and settings  

---

### Slide: "Challenges" or "Data Sourcing"

**Screenshot:** **Commodity Detail – Market Prices Section**  
- **File:** `screens/main/CommodityDetailScreen.tsx` (scroll to market prices)  
- **Shows:** Garki Market, Wuse Market, Kubwa Market with different prices  
- **Why:** Illustrates the need for real, location-specific data (Abuja markets)

---

### Slide: "Tech Stack" or "Architecture"

**Screenshot:** **Dashboard** or **Market Screen**  
- **Why:** Visual proof of the implemented UI; can overlay tech labels (React Native, TypeScript, etc.) if desired

---

### Quick Reference: Screenshot Checklist

| Slide Topic | Screen to Capture | File |
|-------------|-------------------|------|
| Intro / Value Prop | Onboarding 1 | `OnboardingScreen1.tsx` |
| AI Feature | Onboarding 2 | `OnboardingScreen2.tsx` |
| Savings / Alerts | Onboarding 3 | `OnboardingScreen3.tsx` |
| Login | Login | `LoginScreen.tsx` |
| Main App | Dashboard | `DashboardScreen.tsx` |
| Market Browsing | Markets | `MarketScreen.tsx` |
| Commodity Detail | Commodity Detail | `CommodityDetailScreen.tsx` |
| Price Alerts | Alerts | `AlertsScreen.tsx` |
| Profile | Profile | `ProfileScreen.tsx` |

---

### How to Capture Screenshots

1. Run the app: `npx expo start`  
2. Open in Expo Go (physical device) or Android/iOS simulator  
3. Navigate to each screen and capture (device screenshot or simulator screenshot)  
4. For best results, use a consistent device frame (e.g., iPhone 14 or Pixel) in your presentation template  

---

*End of Document*
