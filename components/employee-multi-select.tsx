"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface EmployeeMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EmployeeMultiSelect({
  value = [],
  onValueChange,
  disabled = false,
  placeholder = "Select employees...",
}: EmployeeMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch all active employees
  React.useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/employees?limit=999&status=ACTIVE", {
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

    fetchEmployees();
  }, []);

  const selectedEmployees = employees.filter((emp) => value.includes(emp.id));

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.employee_code.toLowerCase().includes(searchLower) ||
      emp.full_name.toLowerCase().includes(searchLower)
    );
  });

  const toggleEmployee = (empId: string) => {
    const newValue = value.includes(empId)
      ? value.filter((id) => id !== empId)
      : [...value, empId];
    onValueChange(newValue);
  };

  const removeEmployee = (empId: string) => {
    onValueChange(value.filter((id) => id !== empId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">
              {value.length === 0
                ? placeholder
                : `${value.length} employee(s) selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-100 p-0">
          <Command>
            <CommandInput
              placeholder="Search employees..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading && (
                <div className="py-6 text-center text-sm">Loading...</div>
              )}
              {!loading && filteredEmployees.length === 0 && (
                <CommandEmpty>No employees found.</CommandEmpty>
              )}
              {!loading && filteredEmployees.length > 0 && (
                <CommandGroup>
                  {filteredEmployees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={employee.id}
                      onSelect={() => toggleEmployee(employee.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(employee.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {employee.employee_code}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {employee.full_name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected employees badges */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEmployees.map((employee) => (
            <Badge key={employee.id} variant="secondary" className="pr-1">
              <span className="mr-1">
                {employee.employee_code} - {employee.full_name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeEmployee(employee.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
