"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface AllocationFormData {
  employee_id: string | undefined;
  project_id: string | undefined;
  allocation_percentage: string;
  role: string;
  is_billable: boolean;
  is_critical_resource: boolean;
  start_date: string;
  end_date: string;
}

interface AllocationFormFieldsProps {
  isEdit?: boolean;
  formData: AllocationFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string | boolean) => void;
  employees: Employee[];
  projects: Project[];
  disabled?: boolean;
  remainingCapacity?: number;
  showCapacityWarning?: boolean;
}

export function AllocationFormFields({
  isEdit = false,
  formData,
  errors,
  onChange,
  employees,
  projects,
  disabled = false,
  remainingCapacity,
  showCapacityWarning = false,
}: AllocationFormFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Employee and Project Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Assignment Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employee_id">
              Employee <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.employee_id || undefined}
              onValueChange={(value) => onChange("employee_id", value)}
              disabled={isEdit || disabled}
            >
              <SelectTrigger id="employee_id">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && (
              <p className="text-sm text-destructive">{errors.employee_id}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Cannot be changed after creation
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_id">
              Project <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.project_id || undefined}
              onValueChange={(value) => onChange("project_id", value)}
              disabled={isEdit || disabled}
            >
              <SelectTrigger id="project_id">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_code} - {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.project_id && (
              <p className="text-sm text-destructive">{errors.project_id}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Cannot be changed after creation. Use Transfer feature instead.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Allocation Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="allocation_percentage">
              Allocation Percentage <span className="text-destructive">*</span>
            </Label>
            <Input
              id="allocation_percentage"
              type="number"
              min="1"
              max="100"
              value={formData.allocation_percentage}
              onChange={(e) =>
                onChange("allocation_percentage", e.target.value)
              }
              disabled={disabled}
              placeholder="e.g., 50"
            />
            {errors.allocation_percentage && (
              <p className="text-sm text-destructive">
                {errors.allocation_percentage}
              </p>
            )}
            {remainingCapacity !== undefined && (
              <p className="text-xs text-muted-foreground">
                Remaining capacity: {remainingCapacity}%
              </p>
            )}
            {showCapacityWarning && (
              <p className="text-xs text-amber-600">
                ⚠️ Warning: Total allocation exceeds 100%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => onChange("role", e.target.value)}
              disabled={disabled}
              placeholder="e.g., Full Stack Developer"
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Role of the employee in this project
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => onChange("start_date", e.target.value)}
              disabled={disabled}
            />
            {errors.start_date && (
              <p className="text-sm text-destructive">{errors.start_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => onChange("end_date", e.target.value)}
              disabled={disabled}
              min={formData.start_date || undefined}
            />
            {errors.end_date && (
              <p className="text-sm text-destructive">{errors.end_date}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty for ongoing allocation
            </p>
          </div>
        </div>
      </div>

      {/* Additional Flags */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Additional Information</h3>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_billable"
              checked={formData.is_billable}
              onCheckedChange={(checked) =>
                onChange("is_billable", checked === true)
              }
              disabled={disabled}
            />
            <Label
              htmlFor="is_billable"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Billable Resource
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Check if this allocation is billable to the client
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_critical_resource"
              checked={formData.is_critical_resource}
              onCheckedChange={(checked) =>
                onChange("is_critical_resource", checked === true)
              }
              disabled={disabled}
            />
            <Label
              htmlFor="is_critical_resource"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Critical Resource
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Mark if this resource is critical for the project
          </p>
        </div>
      </div>
    </div>
  );
}
