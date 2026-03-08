// Monthly payment system utilities
// Donation months: January(1), March(3), May(5), July(7), September(9), November(11)

export const DONATION_MONTHS = [1, 3, 5, 7, 9, 11];

/** Feature launch date — no donations are owed before this month/year */
export const FEATURE_START_MONTH = 3; // March
export const FEATURE_START_YEAR = 2026;
export const DEFAULT_AMOUNT = 70;
export const DEFAULT_FINE = 10;
export const DEFAULT_DEADLINE_DAY = 15;

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function isDonationMonth(month: number): boolean {
  return DONATION_MONTHS.includes(month);
}

/** Returns { month, year } in Asia/Dhaka timezone */
export function getDhakaToday(): { month: number; year: number; day: number } {
  const now = new Date();
  const dhaka = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    month: 'numeric',
    year: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const month = parseInt(dhaka.find(p => p.type === 'month')!.value);
  const year = parseInt(dhaka.find(p => p.type === 'year')!.value);
  const day = parseInt(dhaka.find(p => p.type === 'day')!.value);
  return { month, year, day };
}

/**
 * For a given (month, year) and deadline day, determine if today is past the deadline.
 */
export function isAfterDeadline(month: number, year: number, deadlineDay: number): boolean {
  const today = getDhakaToday();
  if (today.year > year) return true;
  if (today.year < year) return false;
  if (today.month > month) return true;
  if (today.month < month) return false;
  return today.day > deadlineDay;
}

/**
 * Get a list of all donation (month, year) pairs that have started
 * (i.e., today is on or after the 1st of that month) and for which the deadline
 * may or may not have passed. Used to determine outstanding obligations.
 *
 * We look back a fixed window (e.g. 12 months) to find unpaid months.
 */
export function getRelevantDonationMonths(
  lookbackMonths = 12,
): Array<{ month: number; year: number }> {
  const today = getDhakaToday();
  const result: Array<{ month: number; year: number }> = [];

  for (let i = 0; i <= lookbackMonths; i++) {
    let m = today.month - i;
    let y = today.year;
    while (m <= 0) { m += 12; y -= 1; }

    if (!isDonationMonth(m)) continue;

    // Skip months before the feature was launched — no one owes those
    if (y < FEATURE_START_YEAR || (y === FEATURE_START_YEAR && m < FEATURE_START_MONTH)) continue;

    // Only include months whose first day has already passed
    if (y < today.year || (y === today.year && m <= today.month)) {
      result.push({ month: m, year: y });
    }
  }

  return result;
}
