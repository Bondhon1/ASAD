/**
 * Date utility functions for consistent timezone handling
 * All dates are displayed in Asia/Dhaka timezone
 */

/**
 * Format a date/datetime string in Asia/Dhaka timezone
 * @param value - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @returns Formatted date string in Dhaka timezone
 */
export function formatDhakaDateTime(
  value?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '';
  
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  
  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format a date (without time) in Asia/Dhaka timezone
 * @param value - ISO date string or Date object
 * @returns Formatted date string in Dhaka timezone
 */
export function formatDhakaDate(
  value?: string | Date | null
): string {
  return formatDhakaDateTime(value, {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

/**
 * Format a short date time for display
 * @param value - ISO date string or Date object
 * @returns Formatted date time string
 */
export function formatShortDhakaDateTime(
  value?: string | Date | null
): string {
  return formatDhakaDateTime(value, {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
