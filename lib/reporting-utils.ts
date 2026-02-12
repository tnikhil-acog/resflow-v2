/**
 * Reusable utility functions for Phase 2 reporting features
 */

/**
 * Generate weekly buckets between two dates
 * Weeks start on Monday and end on Sunday
 */
export function generateWeeklyBuckets(
  startDate: string,
  endDate: string,
): Array<{ week_start: string; week_end: string }> {
  const buckets: Array<{ week_start: string; week_end: string }> = [];
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  let currentWeekStart = new Date(startDateObj);
  // Adjust to Monday
  const day = currentWeekStart.getDay();
  const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
  currentWeekStart.setDate(diff);

  while (currentWeekStart <= endDateObj) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    buckets.push({
      week_start: currentWeekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
    });

    currentWeekStart = new Date(weekEnd);
    currentWeekStart.setDate(currentWeekStart.getDate() + 1); // Next Monday
  }

  return buckets;
}

/**
 * Get the first and last day of a specific month
 */
export function getMonthBounds(
  month: number,
  year: number,
): {
  start: string;
  end: string;
} {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
}

/**
 * Format month number to month name
 */
export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

/**
 * Get default date range for reports (last 8 weeks)
 */
export function getDefaultReportRange(): { start: string; end: string } {
  const today = new Date();
  const end = today.toISOString().split("T")[0];

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 56); // 8 weeks ago
  const start = startDate.toISOString().split("T")[0];

  return { start, end };
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

/**
 * Validate month parameter
 */
export function isValidMonth(month: number): boolean {
  return month >= 1 && month <= 12;
}

/**
 * Validate year parameter
 */
export function isValidYear(year: number): boolean {
  return year >= 2020 && year <= 2100;
}

/**
 * Format hours to 2 decimal places
 */
export function formatHours(hours: number | string): number {
  return Math.round(parseFloat(hours.toString()) * 100) / 100;
}

/**
 * Calculate billable percentage
 */
export function calculateBillablePercentage(
  billableHours: number,
  totalHours: number,
): number {
  if (totalHours === 0) return 0;
  return Math.round((billableHours / totalHours) * 100);
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Sum numeric values in array by key
 */
export function sumBy<T>(array: T[], key: keyof T): number {
  return array.reduce((sum, item) => {
    const value = item[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}
