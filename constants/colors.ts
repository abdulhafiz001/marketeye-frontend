/**
 * NaijaPrice Pulse Color Palette
 * Deep Blue, Vibrant Green, Sunrise Orange, Light Gray, White
 */

export const Colors = {
  primary: {
    deepBlue: '#1E3A5F',
    vibrantGreen: '#2ECC71',
    sunriseOrange: '#FF6B35',
    lightGray: '#E8E8E8',
    white: '#FFFFFF',
  },
  secondary: {
    blueLight: '#4A90E2',
    greenLight: '#52D3A8',
    orangeLight: '#FF8C5A',
    grayDark: '#6C757D',
    grayLight: '#F5F5F5',
    /** Alias used across legacy screens */
    lightGray: '#E8E8E8',
  },
  text: {
    primary: '#1E3A5F',
    secondary: '#6C757D',
    light: '#FFFFFF',
    dark: '#000000',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    card: '#FFFFFF',
  },
  status: {
    success: '#2ECC71',
    warning: '#FF6B35',
    error: '#E74C3C',
    info: '#4A90E2',
  },
  trend: {
    up: '#2ECC71',
    down: '#E74C3C',
    neutral: '#6C757D',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

