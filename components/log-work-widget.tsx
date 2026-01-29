"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface LogWorkWidgetProps {
  currentDate: Date;
}

export function LogWorkWidget({ currentDate }: LogWorkWidgetProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(
    undefined,
  );
  const [hours, setHours] = useState<string>("00");
  const [minutes, setMinutes] = useState<string>("00");
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatLogDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Fetch user's allocated projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch("/api/allocations?active_only=true", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          const allocations = result.data?.allocations || [];

          // Extract unique projects from allocations
          const uniqueProjects = allocations.reduce(
            (acc: Project[], alloc: any) => {
              if (!acc.find((p) => p.id === alloc.project_id)) {
                acc.push({
                  id: alloc.project_id,
                  project_code: alloc.project_code,
                  project_name: alloc.project_name,
                });
              }
              return acc;
            },
            [],
          );

          setProjects(uniqueProjects);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setFetchingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleLogWork = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }

    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);

    if (hoursNum === 0 && minutesNum === 0) {
      toast.error("Please enter hours or minutes");
      return;
    }

    // Convert to decimal hours
    const totalHours = hoursNum + minutesNum / 60;

    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: selectedProject,
          log_date: formatLogDate(currentDate),
          hours: totalHours.toFixed(2),
          notes: "",
        }),
      });

      if (response.ok) {
        toast.success("Work logged successfully");
        // Reset form
        setSelectedProject("");
        setHours("00");
        setMinutes("00");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to log work");
      }
    } catch (error) {
      console.error("Error logging work:", error);
      toast.error("Failed to log work");
    } finally {
      setLoading(false);
    }
  };

  const incrementHours = () => {
    const h = parseInt(hours);
    setHours(String(h + 1).padStart(2, "0"));
  };

  const decrementHours = () => {
    const h = parseInt(hours);
    if (h > 0) {
      setHours(String(h - 1).padStart(2, "0"));
    }
  };

  const incrementMinutes = () => {
    const m = parseInt(minutes);
    if (m >= 45) {
      setMinutes("00");
      incrementHours();
    } else {
      setMinutes(String(m + 15).padStart(2, "0"));
    }
  };

  const decrementMinutes = () => {
    const m = parseInt(minutes);
    if (m === 0) {
      if (parseInt(hours) > 0) {
        setMinutes("45");
        decrementHours();
      }
    } else {
      setMinutes(String(m - 15).padStart(2, "0"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <Calendar className="h-5 w-5 mr-2" />
        <CardTitle className="text-base font-semibold">
          {formatDate(currentDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Project</label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  fetchingProjects ? "Loading..." : "Select a project"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {projects.length === 0 && !fetchingProjects ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No active projects
                </div>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_code} - {project.project_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hours</label>
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={incrementHours}
                className="w-full"
              >
                +
              </Button>
              <Input
                type="text"
                value={hours}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setHours(val.padStart(2, "0").slice(-2));
                }}
                className="text-center text-3xl font-bold h-16 border-0"
              />
              <div className="text-xs text-muted-foreground">Hours</div>
              <Button
                variant="outline"
                size="sm"
                onClick={decrementHours}
                className="w-full"
              >
                -
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Minutes</label>
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={incrementMinutes}
                className="w-full"
              >
                +
              </Button>
              <Input
                type="text"
                value={minutes}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  const num = parseInt(val) || 0;
                  setMinutes(String(Math.min(num, 59)).padStart(2, "0"));
                }}
                className="text-center text-3xl font-bold h-16 border-0"
              />
              <div className="text-xs text-muted-foreground">Mins</div>
              <Button
                variant="outline"
                size="sm"
                onClick={decrementMinutes}
                className="w-full"
              >
                -
              </Button>
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleLogWork}
          disabled={loading || !selectedProject}
        >
          {loading ? "Logging..." : "Log Work"}
        </Button>
      </CardContent>
    </Card>
  );
}
