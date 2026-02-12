/**
 * Export utilities for CSV and Excel generation
 */

import { NextResponse } from "next/server";

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) return "";

  // Create header row
  const csvHeaders = headers.join(",");

  // Create data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return "";
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

/**
 * Generate CSV download response
 */
export function generateCSVResponse(
  data: any[],
  headers: string[],
  filename: string,
): NextResponse {
  const csv = arrayToCSV(data, headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

/**
 * Simple Excel-compatible CSV with BOM for proper encoding
 */
export function generateExcelCSVResponse(
  data: any[],
  headers: string[],
  filename: string,
): NextResponse {
  const csv = arrayToCSV(data, headers);
  // Add UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  const content = bom + csv;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().replace("T", " ").split(".")[0];
}

/**
 * Sanitize data for export (remove null, format dates)
 */
export function sanitizeForExport(data: any[]): any[] {
  return data.map((row) => {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        sanitized[key] = "";
      } else if (value instanceof Date) {
        sanitized[key] = formatDateForExport(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  });
}
