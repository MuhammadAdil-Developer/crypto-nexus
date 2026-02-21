/**
 * Utility for Standardized Marketplace Time (Market Time / MT)
 * Market Time is always UTC to prevent timezone-based scamming between buyers and vendors.
 */

/**
 * Format timestamp to a human-readable Market Time (UTC)
 * Output example: "Feb 21, 2026 13:45 UTC"
 */
export function formatMarketTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return 'N/A';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  // Use Intl.DateTimeFormat with timeZone set to UTC
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).format(date) + ' MT';
}

/**
 * Format timestamp to relative time (relative to UTC Now)
 * Note: For 100% accuracy, this should ideally use a server-synced clock.
 */
export function getRelativeMarketTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return 'N/A';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  // Calculate difference without local timezone bias
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return 'Just now';

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Legacy compatibility (aliases to new Market Time versions)
 */
export function getRelativeTime(timestamp: string | Date): string {
  return getRelativeMarketTime(timestamp);
}
