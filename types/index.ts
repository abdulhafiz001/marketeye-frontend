/**
 * TypeScript Interfaces for NaijaPrice Pulse
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role?: string;
  points?: number;
  walletBalance?: number;
  verified?: boolean;
}

export interface Commodity {
  id: string;
  name: string;
  icon: string;
  category: 'Staples' | 'Perishables' | 'Beverages' | 'Other';
  currentPrice: number;
  previousPrice: number;
  trend: number; // percentage change
  trendDirection: 'up' | 'down' | 'neutral';
  unit: string;
  description?: string;
  priceHistory?: PriceDataPoint[];
  aiForecast?: AIForecast;
  priceDrivers?: string[];
  marketPrices?: MarketPrice[];
}

export interface PriceDataPoint {
  date: string;
  price: number;
}

export interface AIForecast {
  predictedPrice: number;
  confidence: number;
  timeframe: string;
  trend: 'up' | 'down' | 'neutral';
  percentageChange: number;
  factors: string[];
}

export interface MarketPrice {
  marketName: string;
  price: number;
  location: string;
}

export interface Alert {
  id: string;
  commodityId: string;
  commodityName: string;
  condition: 'above' | 'below';
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
  message?: string;
  marketId?: number;
  marketName?: string;
  percentChange?: number;
  /** ISO timestamp — used to avoid spamming repeats */
  lastTriggeredAt?: string;
  /** Updated when background checks refresh prices */
  lastKnownPrice?: number;
}

/** Read/received inbox items (bell). */
export interface InboxNotification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MarketWatchItem {
  id: string;
  productId: number;
  productName: string;
  unit: string;
  marketId: number;
  marketName: string;
  lastPrice: number | null;
  lastCheckedAt: string | null;
}

export interface PriceMetric {
  label: string;
  value: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface FeaturedCommodity {
  commodity: Commodity;
  highlight: string;
}

