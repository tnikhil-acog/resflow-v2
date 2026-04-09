"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft, ChevronRight, InfoIcon } from "lucide-react";
import type { ProjectRef as Project } from "@/lib/types";
import amplitude from "@/lib/amplitude";

// ── date helpers ──────────────────────────────────────────────────────────────

/** Returns the Monday of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/**
 * Enforce hh:mm format as the user types.
 * isDeleting: true when the last key pressed was Backspace/Delete — suppresses
 * the auto-colon so the user doesn't get trapped in "08:" forever.
 */
function enforceTimeInput(raw: string, isDeleting: boolean): string {
  if (raw === "") return "";

  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits === "") return "";

  if (digits.length <= 2) {
    const h = Math.min(parseInt(digits, 10), 24);
    const hStr = h.toString().padStart(digits.length === 2 ? 2 : 1, "0");
    // Auto-insert colon only when typing forward (not deleting)
    return digits.length === 2 && !isDeleting ? `${hStr}:` : hStr;
  }

  // 3–4 digits: format as HH:M or HH:MM
  const h = Math.min(parseInt(digits.slice(0, 2), 10), 24);
  const hh = h.toString().padStart(2, "0");
  const mRaw = digits.slice(2); // 1 or 2 chars
  if (mRaw.length === 1) {
    // Partial minutes — show without padding so backspace feels natural
    return `${hh}:${mRaw}`;
  }
  const m = Math.min(parseInt(mRaw, 10), 59);
  return `${hh}:${m.toString().padStart(2, "0")}`;
}

/** Parse a complete "hh:mm" string to decimal hours. Returns NaN for incomplete/invalid input. */
function parseHours(value: string): number {
  if (!value || !value.trim()) return 0;
  // Only accept fully-formed hh:mm (must contain colon with both parts)
  const colonIdx = value.indexOf(":");
  if (colonIdx < 1 || colonIdx === value.length - 1) return NaN;
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m) || m < 0 || m > 59 || h < 0 || h > 24) return NaN;
  return h + m / 60;
}

/** Format decimal hours as "h:mm". E.g. 2.5 → "2:30". */
function formatHours(decimal: number): string {
  if (!decimal || decimal <= 0) return "–";
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface WeekEntry {
  id: string;
  project_id: string;
  notes: string;
  hours: Record<string, string>; // ISO date → raw "hh:mm" string
}

interface ExistingLogCell {
  id: string;
  project_id: string;
  log_date: string;
  hours: string;
  notes: string | null;
  locked: boolean;
}

function toTimeInputString(value: string | number): string {
  const decimal = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(decimal) || decimal <= 0) return "";
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function getLogKey(projectId: string, logDate: string): string {
  return `${projectId}__${logDate}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function WeeklyTimesheetPage() {
  const router = useRouter();
  const { user, authenticatedFetch } = useAuth();

  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date()),
  );
  const [entries, setEntries] = useState<WeekEntry[]>([
    { id: crypto.randomUUID(), project_id: "", notes: "", hours: {} },
  ]);
  const [allAllocations, setAllAllocations] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingLogsByKey, setExistingLogsByKey] = useState<
    Record<string, ExistingLogCell>
  >({});
  // Track whether the last keypress was a deletion so enforceTimeInput can suppress colon auto-insert
  const isDeletingRef = useRef(false);

  const weekDays = getWeekDays(weekStart);
  const workDays = weekDays.slice(0, 5); // Mon–Fri only
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── fetch allocations ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAllocations() {
      setLoadingProjects(true);
      try {
        const params = new URLSearchParams();
        if (user?.id) params.append("emp_id", user.id);
        const res = await authenticatedFetch(`/api/allocations?${params}`);
        const data = await res.json();
        setAllAllocations(data.allocations || []);
      } catch {
        toast.error("Failed to load your project allocations");
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchAllocations();
  }, [user?.id]);

  // ── filter projects active during this week ─────────────────────────────────
  useEffect(() => {
    const weekEnd = weekDays[4]; // Friday
    const map = new Map<string, Project>();

    allAllocations.forEach((a) => {
      const start = new Date(a.start_date);
      const end = a.end_date ? new Date(a.end_date) : null;
      if (start <= weekEnd && (!end || end >= weekDays[0])) {
        const pid = a.project_id || a.project?.id;
        if (pid) {
          map.set(pid, {
            id: pid,
            project_code: a.project_code || a.project?.project_code || "N/A",
            project_name:
              a.project_name || a.project?.project_name || "Unknown",
          });
        }
      }
    });

    setProjects(Array.from(map.values()));
  }, [allAllocations, weekStart]);

  // ── week navigation ─────────────────────────────────────────────────────────
  function shiftWeek(delta: number) {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  useEffect(() => {
    async function fetchWeekLogs() {
      if (!user?.id) return;

      try {
        const startISO = dateToISO(weekDays[0]);
        const endISO = dateToISO(weekDays[4]);
        const res = await authenticatedFetch(
          `/api/logs?start_date=${startISO}&end_date=${endISO}&limit=500`,
        );

        if (!res.ok) {
          throw new Error("Failed to fetch existing week logs");
        }

        const data = await res.json();
        const logs = (data.logs || []) as ExistingLogCell[];

        const byKey: Record<string, ExistingLogCell> = {};
        const grouped: Record<string, WeekEntry> = {};

        logs.forEach((log) => {
          const key = getLogKey(log.project_id, log.log_date);
          byKey[key] = log;

          if (!grouped[log.project_id]) {
            grouped[log.project_id] = {
              id: crypto.randomUUID(),
              project_id: log.project_id,
              notes: log.notes || "",
              hours: {},
            };
          }

          grouped[log.project_id].hours[log.log_date] = toTimeInputString(
            log.hours,
          );

          if (!grouped[log.project_id].notes && log.notes) {
            grouped[log.project_id].notes = log.notes;
          }
        });

        setExistingLogsByKey(byKey);

        const seededEntries = Object.values(grouped);
        setEntries(
          seededEntries.length > 0
            ? seededEntries
            : [{ id: crypto.randomUUID(), project_id: "", notes: "", hours: {} }],
        );
      } catch {
        toast.error("Failed to load existing logs for this week");
      }
    }

    fetchWeekLogs();
  }, [weekStart, user?.id]);

  // ── entry management ────────────────────────────────────────────────────────
  function addEntry() {
    setEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), project_id: "", notes: "", hours: {} },
    ]);
  }

  function removeEntry(id: string) {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntry(id: string, field: "project_id" | "notes", value: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  }

  function updateHours(id: string, dateISO: string, value: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, hours: { ...e.hours, [dateISO]: value } } : e,
      ),
    );
  }

  // ── totals ──────────────────────────────────────────────────────────────────
  function dayTotal(dateISO: string): number {
    return entries.reduce((sum, e) => {
      const v = parseHours(e.hours[dateISO] || "");
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }

  function rowTotal(entry: WeekEntry): number {
    return workDays.reduce((sum, day) => {
      const v = parseHours(entry.hours[dateToISO(day)] || "");
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const createLogs: Array<{
      project_id: string;
      log_date: string;
      hours: number;
      notes: string | null;
    }> = [];
    const updateLogs: Array<{ id: string; hours: number; notes: string | null }> = [];
    const deleteLogIds: string[] = [];

    for (const entry of entries) {
      if (!entry.project_id) continue;
      for (const day of workDays) {
        const iso = dateToISO(day);
        const raw = entry.hours[iso];
        const key = getLogKey(entry.project_id, iso);
        const existing = existingLogsByKey[key];

        if (!raw || !raw.trim()) {
          if (existing && !existing.locked) {
            deleteLogIds.push(existing.id);
          }
          continue;
        }

        const h = parseHours(raw);
        if (isNaN(h) || h <= 0) {
          toast.error(
            `Incomplete time "${raw}" on ${iso} — enter a full hh:mm value (e.g. 08:30).`,
          );
          return;
        }
        if (h > 24) {
          toast.error(`Hours cannot exceed 24 for ${iso}.`);
          return;
        }

        const roundedHours = Math.round(h * 100) / 100;
        const notesValue = entry.notes || null;

        if (existing) {
          if (existing.locked) {
            if (
              roundedHours !== Math.round(parseFloat(existing.hours) * 100) / 100 ||
              (notesValue || "") !== (existing.notes || "")
            ) {
              toast.error(
                `Cannot edit locked log for ${iso}.`,
              );
              return;
            }
            continue;
          }

          const existingHours = Math.round(parseFloat(existing.hours) * 100) / 100;
          const existingNotes = existing.notes || "";
          if (roundedHours !== existingHours || (notesValue || "") !== existingNotes) {
            updateLogs.push({
              id: existing.id,
              hours: roundedHours,
              notes: notesValue,
            });
          }
        } else {
          createLogs.push({
            project_id: entry.project_id,
            log_date: iso,
            hours: roundedHours,
            notes: notesValue,
          });
        }
      }
    }

    if (
      createLogs.length === 0 &&
      updateLogs.length === 0 &&
      deleteLogIds.length === 0
    ) {
      toast.error("No changes detected to submit.");
      return;
    }

    for (const day of workDays) {
      const total = dayTotal(dateToISO(day));
      if (total > 24) {
        toast.error(
          `Total hours on ${dateToISO(day)} exceed 24h (${formatHours(total)}).`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      let created = 0;
      let updated = 0;
      let deleted = 0;

      if (createLogs.length > 0) {
        const createRes = await authenticatedFetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: createLogs }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || "Failed to create logs");
        }
        created = createData.successful || 0;
      }

      for (const payload of updateLogs) {
        const updateRes = await authenticatedFetch(`/api/logs/${payload.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hours: payload.hours, notes: payload.notes }),
        });
        if (!updateRes.ok) {
          const updateData = await updateRes.json();
          throw new Error(updateData.error || "Failed to update existing logs");
        }
        updated += 1;
      }

      for (const id of deleteLogIds) {
        const deleteRes = await authenticatedFetch(`/api/logs/${id}`, {
          method: "DELETE",
        });
        if (!deleteRes.ok) {
          const deleteData = await deleteRes.json();
          throw new Error(deleteData.error || "Failed to delete cleared logs");
        }
        deleted += 1;
      }

      toast.success(
        `Timesheet saved. Created: ${created}, Updated: ${updated}, Deleted: ${deleted}.`,
      );
      amplitude.track("log_submitted", {
        created,
        updated,
        deleted,
      });

      router.push("/logs");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const isFutureWeek = weekStart > today;
  const weekLabel = `${workDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${workDays[4].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="p-6 space-y-4 max-w-screen-xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Timesheet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{weekLabel}</p>
        </div>
        <Link href="/logs">
          <Button variant="outline" size="sm">← Back to Logs</Button>
        </Link>
      </div>

      {/* ── No allocations alert ── */}
      {projects.length === 0 && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">No active allocations this week.</span>{" "}
            Try a different week, or contact your PM/HR to be assigned to a project.{" "}
            <Link href="/allocations" className="underline underline-offset-2">
              View allocations →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Week navigation ── */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={dateToISO(weekStart)}
          onChange={(e) => {
            if (e.target.value)
              setWeekStart(getWeekStart(new Date(e.target.value + "T12:00:00")));
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => shiftWeek(1)}
          disabled={isFutureWeek}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-1">{weekLabel}</span>
      </div>

      {/* ── Timesheet card ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm table-fixed border-collapse">
          {/* Column widths: Project gets ~40%, 5 days share ~48%, Total ~8%, del ~4% */}
          <colgroup>
            <col className="w-[38%]" />
            {workDays.map((d) => (
              <col key={dateToISO(d)} className="w-[11%]" />
            ))}
            <col className="w-[7%]" />
            <col className="w-[4%]" />
          </colgroup>

          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Project
              </th>
              {workDays.map((day, i) => {
                const iso = dateToISO(day);
                const isToday = iso === dateToISO(today);
                return (
                  <th
                    key={iso}
                    className={`text-center px-1 py-3 font-semibold text-xs uppercase tracking-wide ${
                      isToday
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div>{WEEKDAY_NAMES[i]}</div>
                    <div className="font-normal normal-case text-[11px] mt-0.5">
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </th>
                );
              })}
              <th className="text-center px-1 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Total
              </th>
              <th />
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {entries.map((entry, idx) => {
              const rTotal = rowTotal(entry);
              const isEven = idx % 2 === 0;
              return (
                <React.Fragment key={entry.id}>
                  {/* ── Input row ── */}
                  <tr
                    className={`${isEven ? "" : "bg-muted/20"} transition-colors`}
                  >
                    {/* Project selector */}
                    <td className="px-3 pt-3 pb-1 align-top">
                      <Select
                        value={entry.project_id}
                        onValueChange={(v) => updateEntry(entry.id, "project_id", v)}
                      >
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Select a project…" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-medium">{p.project_code}</span>
                              <span className="text-muted-foreground ml-1">– {p.project_name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Day hour inputs */}
                    {workDays.map((day) => {
                      const iso = dateToISO(day);
                      const isToday = iso === dateToISO(today);
                      const isFuture = day > today;
                      const val = entry.hours[iso] || "";
                      const parsed = parseHours(val);
                      const hasValue = val.trim() !== "";
                      const isInvalid = hasValue && isNaN(parsed);
                      return (
                        <td
                          key={iso}
                          className={`px-1 pt-3 pb-1 align-top ${isToday ? "bg-primary/5" : ""}`}
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="–"
                            maxLength={5}
                            value={val}
                            onKeyDown={(e) => {
                              isDeletingRef.current =
                                e.key === "Backspace" || e.key === "Delete";
                              // Block anything that isn't a digit or a control key
                              if (
                                !/^\d$/.test(e.key) &&
                                ![
                                  "Backspace",
                                  "Delete",
                                  "Tab",
                                  "ArrowLeft",
                                  "ArrowRight",
                                  "ArrowUp",
                                  "ArrowDown",
                                ].includes(e.key) &&
                                !e.ctrlKey &&
                                !e.metaKey
                              ) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) =>
                              updateHours(
                                entry.id,
                                iso,
                                enforceTimeInput(
                                  e.target.value,
                                  isDeletingRef.current,
                                ),
                              )
                            }
                            disabled={isFuture || !entry.project_id}
                            className={`h-9 text-center text-sm px-1 ${
                              isInvalid
                                ? "border-destructive focus-visible:ring-destructive"
                                : hasValue
                                ? "border-primary/40 bg-primary/5 font-medium"
                                : ""
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* Row total */}
                    <td className="px-1 pt-3 pb-1 text-center align-middle">
                      <span className={`text-sm font-semibold tabular-nums ${rTotal > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                        {rTotal > 0 ? formatHours(rTotal) : "–"}
                      </span>
                    </td>

                    {/* Delete */}
                    <td className="pr-2 pt-3 pb-1 text-center align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(entry.id)}
                        disabled={entries.length === 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>

                  {/* ── Description sub-row ── */}
                  <tr
                    className={`${isEven ? "" : "bg-muted/20"}`}
                  >
                    <td colSpan={8} className="px-3 pt-1 pb-3">
                      <textarea
                        rows={2}
                        placeholder="Describe your tasks for this project this week…"
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, "notes", e.target.value)}
                        className="w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background/60 placeholder:text-muted-foreground/50 transition-colors"
                      />
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>

          {/* ── Daily totals footer ── */}
          <tfoot>
            <tr className="border-t-2 bg-muted/30">
              <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Daily total
              </td>
              {workDays.map((day) => {
                const iso = dateToISO(day);
                const total = dayTotal(iso);
                const isToday = iso === dateToISO(today);
                return (
                  <td
                    key={iso}
                    className={`py-3 px-1 text-center tabular-nums font-semibold text-sm ${
                      isToday ? "bg-primary/5 text-primary" : ""
                    } ${total > 0 ? "text-foreground" : "text-muted-foreground/40"}`}
                  >
                    {total > 0 ? formatHours(total) : "–"}
                  </td>
                );
              })}
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={addEntry}
          disabled={projects.length === 0}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Project Row
        </Button>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || projects.length === 0}
          className="min-w-[140px]"
        >
          {submitting && <LoadingSpinner className="mr-2 h-3.5 w-3.5" />}
          {submitting ? "Submitting…" : "Submit Timesheet"}
        </Button>
      </div>
    </div>
  );
}
