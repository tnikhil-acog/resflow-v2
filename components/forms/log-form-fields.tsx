"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface LogFormData {
  project_id: string | undefined;
  log_date: string;
  hours: string;
  notes: string;
}

interface LogFormFieldsProps {
  isEdit?: boolean;
  formData: LogFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  projects: Project[];
  disabled?: boolean;
  locked?: boolean;
}

export function LogFormFields({
  isEdit = false,
  formData,
  errors,
  onChange,
  projects,
  disabled = false,
  locked = false,
}: LogFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project_id">
            Project <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.project_id || undefined}
            onValueChange={(value) => onChange("project_id", value)}
            disabled={isEdit || disabled || locked}
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
              Cannot be changed after creation
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="log_date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="log_date"
            type="date"
            value={formData.log_date}
            onChange={(e) => onChange("log_date", e.target.value)}
            disabled={isEdit || disabled || locked}
            max={new Date().toISOString().split("T")[0]}
          />
          {errors.log_date && (
            <p className="text-sm text-destructive">{errors.log_date}</p>
          )}
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Cannot be changed after creation
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hours">
            Hours <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hours"
            type="number"
            step="0.25"
            min="0"
            max="24"
            value={formData.hours}
            onChange={(e) => onChange("hours", e.target.value)}
            disabled={disabled || locked}
            placeholder="e.g., 8.5"
          />
          {errors.hours && (
            <p className="text-sm text-destructive">{errors.hours}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter hours in decimal format (e.g., 8.5 for 8 hours 30 minutes)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          disabled={disabled || locked}
          placeholder="What did you work on today?"
          rows={4}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes}</p>
        )}
      </div>

      {locked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            🔒 This log is locked because it has been included in a submitted
            weekly report and cannot be modified.
          </p>
        </div>
      )}
    </div>
  );
}
