/**
 * Utility Functions Library
 * 
 * Place shared utility functions here that are used across the application.
 * Examples: formatters, validators, common calculations, etc.
 */

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date | string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Map color names (including non-CSS names like Amber, Emerald, etc.) to hex values.
 * Falls back to treating the input as a CSS color if not found in the map.
 */
const COLOR_HEX_MAP: Record<string, string> = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  pink: '#EC4899',
  white: '#FFFFFF',
  black: '#1F2937',
  brown: '#92400E',
  gray: '#6B7280',
  grey: '#6B7280',
  cyan: '#06B6D4',
  lime: '#84CC16',
  teal: '#14B8A6',
  rose: '#F43F5E',
  amber: '#F59E0B',
  emerald: '#10B981',
  sky: '#0EA5E9',
  fuchsia: '#D946EF',
  purple: '#A855F7',
  gold: '#CA8A04',
  silver: '#9CA3AF',
  maroon: '#7F1D1D',
  navy: '#1E3A5F',
  coral: '#F97171',
  turquoise: '#2DD4BF',
  magenta: '#E879F9',
  beige: '#D4C5A9',
  ivory: '#FFFFF0',
  olive: '#84CC16',
  salmon: '#FA8072',
  khaki: '#BDB76B',
  lavender: '#C4B5FD',
  crimson: '#DC143C',
  peach: '#FBBF24',
  mint: '#6EE7B7',
  charcoal: '#374151',
};

export function colorNameToHex(colorName: string): string {
  if (!colorName) return '#94a3b8';
  const key = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[key] || (key.startsWith('#') ? key : '#94a3b8');
}
