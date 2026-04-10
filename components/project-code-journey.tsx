"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, CheckCircle2, ArrowRight, Clock } from "lucide-react";

/* ─── Type / prefix metadata ─────────────────────────────────────────────── */
const TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  B:   { label: "Bench",       color: "text-slate-600",   bg: "bg-slate-100 dark:bg-slate-800",   dot: "bg-slate-400" },
  C:   { label: "Signed",      color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/40", dot: "bg-emerald-500" },
  E:   { label: "Eager",       color: "text-amber-700",   bg: "bg-amber-50 dark:bg-amber-900/40",   dot: "bg-amber-400" },
  M:   { label: "BD",          color: "text-blue-700",    bg: "bg-blue-50 dark:bg-blue-900/40",    dot: "bg-blue-400" },
  M01: { label: "BD Grp 1",    color: "text-blue-700",    bg: "bg-blue-50 dark:bg-blue-900/40",    dot: "bg-blue-400" },
  M02: { label: "BD Grp 2",    color: "text-indigo-700",  bg: "bg-indigo-50 dark:bg-indigo-900/40", dot: "bg-indigo-400" },
  O:   { label: "Overheads",   color: "text-gray-600",    bg: "bg-gray-100 dark:bg-gray-800",      dot: "bg-gray-400" },
  P:   { label: "Product",     color: "text-violet-700",  bg: "bg-violet-50 dark:bg-violet-900/40", dot: "bg-violet-500" },
  R:   { label: "Research",    color: "text-cyan-700",    bg: "bg-cyan-50 dark:bg-cyan-900/40",    dot: "bg-cyan-500" },
  S:   { label: "Solutioning", color: "text-rose-700",    bg: "bg-rose-50 dark:bg-rose-900/40",   dot: "bg-rose-500" },
};

function getTypeMeta(type: string | null) {
  if (!type) return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" };
  return (
    TYPE_META[type.toUpperCase()] ??
    { label: type, color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" }
  );
}

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface JourneyEntry {
  code: string;
  type: string | null;
  event: "created" | "changed";
  changed_at: string;
  changed_by: string | null;
  is_current: boolean;
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export function ProjectCodeJourney({ projectId }: { projectId: string }) {
  const { authenticatedFetch } = useAuth();
  const [journey, setJourney] = useState<JourneyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    authenticatedFetch(`/api/projects/code-journey?id=${projectId}`)
      .then((r) => r.json())
      .then((d) => setJourney(d.journey ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Code Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (journey.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Code Journey
          <Badge variant="secondary" className="ml-auto text-xs font-mono">
            {journey.length} {journey.length === 1 ? "step" : "steps"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          {/* Vertical connector line */}
          {journey.length > 1 && (
            <div className="absolute left-[27px] top-8 bottom-8 w-px bg-border z-0" />
          )}

          <div className="divide-y divide-border/40">
            {journey.map((entry, idx) => {
              const meta = getTypeMeta(entry.type);
              const isLast = idx === journey.length - 1;
              const date = new Date(entry.changed_at);

              return (
                <div
                  key={idx}
                  className={`relative flex gap-3 px-4 py-3 transition-colors ${
                    entry.is_current
                      ? "bg-primary/5"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    {entry.is_current ? (
                      <div className="h-6 w-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                    ) : (
                      <div
                        className={`h-6 w-6 rounded-full border-2 border-background ring-2 ${
                          meta.dot.replace("bg-", "ring-")
                        } ${meta.dot}`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      {/* Code chip */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono font-semibold ${meta.bg} ${meta.color}`}
                      >
                        {entry.code}
                      </span>

                      {/* Current badge */}
                      {entry.is_current && (
                        <Badge
                          variant="default"
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                        >
                          Now
                        </Badge>
                      )}
                    </div>

                    {/* Type label */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[11px] font-medium ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      {!isLast && (
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Meta: who + when */}
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      <span>
                        {entry.event === "created" ? "Created" : "Changed"}{" "}
                        {date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {entry.changed_by && (
                          <> · {entry.changed_by}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
