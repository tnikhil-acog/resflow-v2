"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface ProjectComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showAllOption?: boolean; // Whether to show "All Projects" option
  filterProjectIds?: string[]; // Optional list of project IDs to filter by (for employees)
}

export function ProjectCombobox({
  value,
  onValueChange,
  placeholder = "Select project...",
  className,
  showAllOption = false, // Default to false
  filterProjectIds, // Optional filter
}: ProjectComboboxProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const isPM = user?.employee_role === "project_manager";

  // Fetch projects on open
  React.useEffect(() => {
    if (open && projects.length === 0) {
      fetchProjects();
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        fetchProjects();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const params = new URLSearchParams({
        limit: "999",
        status: "ACTIVE",
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      // If PM, filter to only their projects
      if (isPM && user?.id) {
        params.append("project_manager_id", user.id);
      }

      const response = await fetch(`/api/projects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects if filterProjectIds is provided
  const displayProjects =
    filterProjectIds && filterProjectIds.length > 0
      ? projects.filter((p) => filterProjectIds.includes(p.id))
      : projects;

  const selectedProject = displayProjects.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {showAllOption && value === "ALL"
            ? "All Projects"
            : selectedProject
              ? `${selectedProject.project_code} - ${selectedProject.project_name}`
              : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-100 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search projects..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : "No projects found."}
            </CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  value="ALL"
                  onSelect={() => {
                    onValueChange("ALL");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "ALL" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  All Projects
                </CommandItem>
              )}
              {displayProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === project.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{project.project_code}</span>
                    <span className="text-sm text-muted-foreground">
                      {project.project_name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
