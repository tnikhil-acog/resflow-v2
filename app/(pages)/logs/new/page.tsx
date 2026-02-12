"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Plus, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface LogEntry {
  id: string; // Unique ID for tracking each entry in the UI
  project_id: string;
  hours: string;
  notes: string;
}

export default function NewLogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [allAllocations, setAllAllocations] = useState<any[]>([]); // Store all allocations
  const [projects, setProjects] = useState<Project[]>([]);
  const [logDate, setLogDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [logEntries, setLogEntries] = useState<LogEntry[]>([
    {
      id: crypto.randomUUID(),
      project_id: "",
      hours: "",
      notes: "",
    },
  ]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [dateError, setDateError] = useState<string>("");

  useEffect(() => {
    fetchUserAllocations();
  }, []);

  // Update available projects when log date changes
  useEffect(() => {
    filterProjectsByDate(logDate);
  }, [logDate, allAllocations]);

  async function fetchUserAllocations() {
    try {
      setFetchingProjects(true);

      const token = localStorage.getItem("auth_token");
      // Fetch only allocations for the current user
      const params = new URLSearchParams();
      if (user?.id) {
        params.append("emp_id", user.id);
      }
      const response = await fetch(`/api/allocations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch allocations");
      }

      const data = await response.json();
      setAllAllocations(data.allocations || []);

      // Filter projects for current date
      filterProjectsByDate(logDate);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your project allocations.",
        variant: "destructive",
      });
    } finally {
      setFetchingProjects(false);
    }
  }

  function filterProjectsByDate(date: string) {
    const projectsMap = new Map<string, Project>();
    const selectedDate = new Date(date);

    (allAllocations || []).forEach((allocation: any) => {
      const startDate = new Date(allocation.start_date);
      const endDate = allocation.end_date
        ? new Date(allocation.end_date)
        : null;

      // Check if the selected date falls within the allocation period
      if (startDate <= selectedDate && (!endDate || endDate >= selectedDate)) {
        const pid = allocation.project_id || allocation.project?.id;
        const pcode =
          allocation.project_code || allocation.project?.project_code;
        const pname =
          allocation.project_name || allocation.project?.project_name;

        if (pid) {
          projectsMap.set(pid, {
            id: pid,
            project_code: pcode || "N/A",
            project_name: pname || "Unknown",
          });
        }
      }
    });

    const projectsList = Array.from(projectsMap.values());
    setProjects(projectsList);

    if (projectsList.length === 0 && allAllocations.length > 0) {
      toast({
        title: "No Active Allocations for Selected Date",
        description:
          "You don't have any allocations for the selected date. Please choose a different date.",
        variant: "destructive",
      });
    }
  }

  function addLogEntry() {
    setLogEntries([
      ...logEntries,
      {
        id: crypto.randomUUID(),
        project_id: "",
        hours: "",
        notes: "",
      },
    ]);
  }

  function removeLogEntry(id: string) {
    if (logEntries.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one project entry is required.",
        variant: "destructive",
      });
      return;
    }
    setLogEntries(logEntries.filter((entry) => entry.id !== id));
    // Clear errors for this entry
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  }

  function handleEntryChange(id: string, field: keyof LogEntry, value: string) {
    setLogEntries(
      logEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
    // Clear error for this field
    if (errors[id]?.[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[id]) {
          delete newErrors[id][field];
          if (Object.keys(newErrors[id]).length === 0) {
            delete newErrors[id];
          }
        }
        return newErrors;
      });
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    // Validate date
    if (!logDate) {
      setDateError("Please select a date");
      isValid = false;
    } else {
      const selectedDate = new Date(logDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        setDateError("Cannot log hours for future dates");
        isValid = false;
      } else {
        setDateError("");
      }
    }

    // Validate each log entry
    const usedProjects = new Set<string>();
    logEntries.forEach((entry) => {
      const entryErrors: Record<string, string> = {};

      if (!entry.project_id) {
        entryErrors.project_id = "Please select a project";
        isValid = false;
      } else if (usedProjects.has(entry.project_id)) {
        entryErrors.project_id =
          "Project already selected. Each project can only be logged once per day.";
        isValid = false;
      } else {
        usedProjects.add(entry.project_id);
      }

      if (!entry.hours || entry.hours === "") {
        entryErrors.hours = "Please enter hours worked";
        isValid = false;
      } else {
        const hours = parseFloat(entry.hours);
        if (isNaN(hours) || hours <= 0) {
          entryErrors.hours = "Hours must be a positive number";
          isValid = false;
        } else if (hours > 24) {
          entryErrors.hours = "Hours cannot exceed 24";
          isValid = false;
        }
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    // Validate total hours
    const totalHours = logEntries.reduce((sum, entry) => {
      const hours = parseFloat(entry.hours);
      return sum + (isNaN(hours) ? 0 : hours);
    }, 0);

    if (totalHours > 24) {
      toast({
        title: "Validation Error",
        description: `Total hours (${totalHours.toFixed(1)}) cannot exceed 24 hours in a day.`,
        variant: "destructive",
      });
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      // Prepare bulk submission payload
      const payload = {
        logs: logEntries.map((entry) => ({
          project_id: entry.project_id,
          log_date: logDate,
          hours: parseFloat(entry.hours),
          notes: entry.notes || null,
        })),
      };

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create logs");
      }

      const successCount = result.successful || logEntries.length;
      const failedCount = result.failed || 0;

      if (failedCount > 0 && result.errors) {
        const errorMessages = result.errors
          .map((err: any) => {
            const project = projects.find((p) => p.id === err.project_id);
            return `${project?.project_code || "Unknown"}: ${err.error}`;
          })
          .join("\n");

        toast({
          title: "Partial Success",
          description: `${successCount} log(s) created successfully, ${failedCount} failed:\n${errorMessages}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${successCount} work log(s) created successfully!`,
        });
      }

      // Reset form and redirect
      setLogEntries([
        {
          id: crypto.randomUUID(),
          project_id: "",
          hours: "",
          notes: "",
        },
      ]);
      router.push("/logs");
    } catch (error: any) {
      console.error("Error submitting logs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit work logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (fetchingProjects) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Daily Work Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log work hours for multiple projects on the same day
          </p>
        </div>
        <Link href="/logs">
          <Button variant="outline">Back to Logs</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">No Active Allocations</p>
            <p>
              You don't have any active project allocations. You need to be
              assigned to a project before you can log work hours. Please
              contact your Project Manager or HR to get assigned to a project.
            </p>
            <div className="mt-4">
              <Link href="/allocations">
                <Button variant="outline" size="sm">
                  View My Allocations
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm">
                Record your daily work hours for projects you're assigned to.
                You can log work for multiple projects on the same day. Hours
                must be entered in decimal format (e.g., 8.5 for 8 hours 30
                minutes). Total hours cannot exceed 24 hours per day.
              </p>
            </AlertDescription>
          </Alert>

          {/* Date Picker */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-end md:gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="log_date">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="log_date"
                    type="date"
                    value={logDate}
                    onChange={(e) => {
                      setLogDate(e.target.value);
                      setDateError("");
                    }}
                    max={new Date().toISOString().split("T")[0]}
                    disabled={loading}
                    className={dateError ? "border-red-500" : ""}
                  />
                </div>
                {dateError && (
                  <p className="text-sm text-red-500 md:mb-2">{dateError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Entries */}
          <div className="space-y-4">
            {logEntries.map((entry, index) => (
              <Card key={entry.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-base">
                    Project {index + 1}
                  </CardTitle>
                  {logEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLogEntry(entry.id)}
                      disabled={loading}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Project Selector */}
                    <div className="space-y-2">
                      <Label htmlFor={`project_${entry.id}`}>
                        Project <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={entry.project_id}
                        onValueChange={(value) =>
                          handleEntryChange(entry.id, "project_id", value)
                        }
                        disabled={loading}
                      >
                        <SelectTrigger
                          id={`project_${entry.id}`}
                          className={
                            errors[entry.id]?.project_id ? "border-red-500" : ""
                          }
                        >
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.project_code} - {project.project_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[entry.id]?.project_id && (
                        <p className="text-sm text-red-500">
                          {errors[entry.id].project_id}
                        </p>
                      )}
                    </div>

                    {/* Hours Input */}
                    <div className="space-y-2">
                      <Label htmlFor={`hours_${entry.id}`}>
                        Hours Worked <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`hours_${entry.id}`}
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        placeholder="e.g., 8 or 8.5"
                        value={entry.hours}
                        onChange={(e) =>
                          handleEntryChange(entry.id, "hours", e.target.value)
                        }
                        disabled={loading}
                        className={
                          errors[entry.id]?.hours ? "border-red-500" : ""
                        }
                      />
                      {errors[entry.id]?.hours && (
                        <p className="text-sm text-red-500">
                          {errors[entry.id].hours}
                        </p>
                      )}
                    </div>

                    {/* Notes Input */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes_${entry.id}`}>Notes</Label>
                      <Input
                        id={`notes_${entry.id}`}
                        type="text"
                        placeholder="Work details (optional)"
                        value={entry.notes}
                        onChange={(e) =>
                          handleEntryChange(entry.id, "notes", e.target.value)
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Another Project Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addLogEntry}
            disabled={loading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Project
          </Button>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end">
            <Link href="/logs">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : (
                <>Submit All Logs ({logEntries.length})</>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
