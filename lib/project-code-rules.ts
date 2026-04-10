/**
 * Project Code Rule Engine
 *
 * Centralises all logic for generating and transitioning project codes.
 * Format: {ClientCode}-{YYYY}-{TypePrefix}{SeqNum}
 *
 * Examples:
 *   CL001-2025-E001  → Client 1, eager project #1 in 2025
 *   CL001-2025-C001  → Same project after signing (seq preserved)
 *   IN001-2025-R001  → Internal research project (no client)
 */

import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

/* ─────────────────────────────────────────────
   TYPE PREFIX MAP
   Maps project_type stored in DB to code prefix.
   Single-char types map directly.
   M01 / M02 are BD sub-groups (kept as-is).
───────────────────────────────────────────── */
const TYPE_PREFIX_MAP: Record<string, string> = {
  B:   "B",
  C:   "C",
  E:   "E",
  M:   "M",
  M01: "M01",
  M02: "M02",
  O:   "O",
  P:   "P",
  R:   "R",
  S:   "S",
};

export function getTypePrefix(projectType: string): string {
  const prefix = TYPE_PREFIX_MAP[projectType?.trim()?.toUpperCase()];
  if (!prefix) throw new Error(`Unknown project_type: "${projectType}"`);
  return prefix;
}

/* ─────────────────────────────────────────────
   CLIENT CODE RESOLUTION
   Returns the client_code for a given client_id.
   Returns 'IN001' if clientId is null/undefined
   (i.e. internal / no-client project).
───────────────────────────────────────────── */
export async function getClientCode(
  clientId: string | null | undefined,
): Promise<string> {
  if (!clientId) return "IN001";

  const [client] = await db
    .select({ client_code: schema.clients.client_code })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .limit(1);

  if (!client?.client_code) {
    console.warn(`[ProjectCode] No client_code found for clientId=${clientId}, falling back to IN001`);
    return "IN001";
  }

  return client.client_code;
}

/* ─────────────────────────────────────────────
   NEXT SEQUENCE NUMBER
   Scoped to (clientCode, year, typePrefix).

   If preferredSeq is provided and the slot is free
   → use it (preserves seq on type transitions).
   Otherwise → MAX(taken) + 1.
───────────────────────────────────────────── */
export async function resolveNextSeqNum(
  clientCode: string,
  year: number,
  typePrefix: string,
  preferredSeq?: number,
): Promise<number> {
  // Pattern: CL001-2025-E% or IN001-2025-M01%
  const pattern = `${clientCode}-${year}-${typePrefix}%`;

  const rows = await db
    .select({ project_code: schema.projects.project_code })
    .from(schema.projects)
    .where(sql`${schema.projects.project_code} LIKE ${pattern}`);

  // Extract the numeric seq from the end of each code
  const taken = new Set<number>();
  for (const row of rows) {
    const suffix = row.project_code.slice(
      `${clientCode}-${year}-${typePrefix}`.length,
    );
    const n = parseInt(suffix, 10);
    if (!isNaN(n)) taken.add(n);
  }

  // Prefer to keep the same seq number (type transition case)
  if (preferredSeq !== undefined && !taken.has(preferredSeq)) {
    return preferredSeq;
  }

  // Otherwise assign next sequential number
  if (taken.size === 0) return 1;
  return Math.max(...taken) + 1;
}

/* ─────────────────────────────────────────────
   GENERATE PROJECT CODE
   Full code generation entry point.
   preferredSeq: pass when transitioning types
   (extracted from old code) to try preserving it.
───────────────────────────────────────────── */
export async function generateProjectCode(
  clientCode: string,
  year: number,
  projectType: string,
  preferredSeq?: number,
): Promise<string> {
  const typePrefix = getTypePrefix(projectType);
  const seq = await resolveNextSeqNum(clientCode, year, typePrefix, preferredSeq);
  return `${clientCode}-${year}-${typePrefix}${String(seq).padStart(3, "0")}`;
}

/* ─────────────────────────────────────────────
   EXTRACT SEQ NUM FROM EXISTING CODE
   Used when transitioning project type to
   try preserving the sequence number.
   Returns null if the code is not parseable.
───────────────────────────────────────────── */
export function extractSeqNum(projectCode: string): number | null {
  // Format: {clientCode}-{year}-{typePrefix}{seq}
  // The seq is the trailing digits of the last segment
  const lastSegment = projectCode.split("-").slice(2).join("-"); // e.g. "E001" or "M01001"
  const match = lastSegment.match(/\d+$/);
  if (!match) return null;
  return parseInt(match[0], 10);
}

/* ─────────────────────────────────────────────
   NEXT CLIENT CODE
   Generates the next sequential CL code.
   Called when creating a new external client.
───────────────────────────────────────────── */
export async function generateClientCode(): Promise<string> {
  const [result] = await db
    .select({ max_code: sql<string>`MAX(client_code)` })
    .from(schema.clients)
    .where(sql`client_code LIKE 'CL%'`);

  if (!result?.max_code) return "CL001";

  // Extract numeric part from 'CL001' → 1
  const num = parseInt(result.max_code.replace("CL", ""), 10);
  if (isNaN(num)) return "CL001";

  return `CL${String(num + 1).padStart(3, "0")}`;
}
