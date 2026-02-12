"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface EmployeeComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showAllOption?: boolean;
  filterByPMProjects?: boolean; // New prop to filter by PM's projects
}

export function EmployeeCombobox({
  value,
  onValueChange,
  placeholder = "Select employee...",
  className,
  disabled = false,
  showAllOption = false,
  filterByPMProjects = false,
}: EmployeeComboboxProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const isPM = user?.employee_role === "project_manager";

  React.useEffect(() => {
    if (open && employees.length === 0) {
      fetchEmployees();
    }
  }, [open]);

  React.useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        fetchEmployees();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  const fetchEmployees = async () => {
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

      // If filterByPMProjects is true and user is PM, get employees from their projects
      if (filterByPMProjects && isPM && user?.id) {
        // First, get PM's projects
        const projectsRes = await fetch(
          `/api/projects?project_manager_id=${user.id}&limit=999`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          const projects = projectsData.projects || [];

          if (projects.length > 0) {
            // Get unique employee IDs from allocations
            const projectIds = projects.map((p: any) => p.id);

            // Fetch allocations for these projects
            const allocationsRes = await fetch(
              `/api/allocations?project_ids=${projectIds.join(",")}&limit=999`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (allocationsRes.ok) {
              const allocData = await allocationsRes.json();
              const allocations = allocData.allocations || [];
              const uniqueEmpIds = [
                ...new Set(allocations.map((a: any) => a.emp_id)),
              ];

              if (uniqueEmpIds.length > 0) {
                params.append("ids", uniqueEmpIds.join(","));
              } else {
                // PM has projects but no allocations
                setEmployees([]);
                return;
              }
            }
          } else {
            // PM has no projects
            setEmployees([]);
            return;
          }
        }
      }

      const response = await fetch(`/api/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find((emp) => emp.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value === "ALL"
            ? "All employees"
            : selectedEmployee
              ? `${selectedEmployee.employee_code} - ${selectedEmployee.full_name}`
              : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search employee..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : "No employee found."}
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
                  All employees
                </CommandItem>
              )}
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={employee.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === employee.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {employee.employee_code} - {employee.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
