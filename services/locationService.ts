/**
 * Location & Geofencing Service
 * Handles Expo location permissions, current GPS coordinate acquisition,
 * and Haversine distance calculations for market geofencing.
 */

import * as Location from 'expo-location';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

let cachedLocation: UserCoordinates | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Requests foreground location permission from the device OS.
 * Returns true if granted.
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch (error) {
    console.warn('[LocationService] Permission request error:', error);
    return false;
  }
}

/**
 * Checks if location permission has already been granted.
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Gets the user's current GPS coordinates.
 * Prompts for permission if not already granted.
 * Returns null if permission is denied, location services are disabled, or on timeout.
 */
export async function getCurrentUserLocation(forceRefresh = false): Promise<UserCoordinates | null> {
  const now = Date.now();
  if (!forceRefresh && cachedLocation && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLocation;
  }

  try {
    const granted = await requestLocationPermission();
    if (!granted) {
      return null;
    }

    // Try high accuracy with a 6-second timeout, fallback to balanced
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      cachedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      lastFetchTime = Date.now();
      return cachedLocation;
    } catch {
      // Fallback: try last known position if active GPS timed out
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        cachedLocation = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        lastFetchTime = Date.now();
        return cachedLocation;
      }
      return null;
    }
  } catch (err) {
    console.warn('[LocationService] Failed to acquire GPS coordinates:', err);
    return null;
  }
}

/**
 * Computes great-circle distance between two GPS points in kilometers using Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * Returns true if the user is physically within the geofenced radius (default: 750 meters) of the market.
 */
export function isUserInMarketGeofence(
  userCoords: { latitude?: number | null; longitude?: number | null } | null | undefined,
  marketCoords: { latitude?: number | null; longitude?: number | null } | null | undefined,
  radiusKm = 0.75 // 750 meters
): boolean {
  if (
    !userCoords ||
    !marketCoords ||
    userCoords.latitude == null ||
    userCoords.longitude == null ||
    marketCoords.latitude == null ||
    marketCoords.longitude == null
  ) {
    return false;
  }

  const distance = calculateHaversineDistanceKm(
    userCoords.latitude,
    userCoords.longitude,
    Number(marketCoords.latitude),
    Number(marketCoords.longitude)
  );

  return distance <= radiusKm;
}
