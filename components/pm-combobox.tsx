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

interface ProjectManager {
  id: string;
  employee_code: string;
  full_name: string;
}

interface PMComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PMCombobox({
  value,
  onValueChange,
  placeholder = "Select project manager...",
  className,
  disabled = false,
}: PMComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [managers, setManagers] = React.useState<ProjectManager[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (open && managers.length === 0) {
      fetchManagers();
    }
  }, [open]);

  React.useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        fetchManagers();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const params = new URLSearchParams({
        limit: "999",
        status: "ACTIVE",
        role: "PM", // Filter for project managers only
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching project managers:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedManager = managers.find((pm) => pm.id === value);

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
          {selectedManager
            ? `${selectedManager.employee_code} - ${selectedManager.full_name}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search project manager..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : "No project manager found."}
            </CommandEmpty>
            <CommandGroup>
              {managers.map((manager) => (
                <CommandItem
                  key={manager.id}
                  value={manager.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === manager.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{manager.employee_code}</span>
                    <span className="text-sm text-muted-foreground">
                      {manager.full_name}
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
