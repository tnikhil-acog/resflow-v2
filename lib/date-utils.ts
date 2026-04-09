// Utility functions for date formatting and conversion

/**
 * Convert Date object to YYYY-MM-DD string format for PostgreSQL date columns
 */
export function toDateString(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export function fromDateString(
  dateStr: string | null | undefined,
): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
