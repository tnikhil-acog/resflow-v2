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
import { PMCombobox } from "@/components/pm-combobox";

interface Client {
  id: string;
  client_name: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface ProjectFormData {
  project_type: string;
  project_name: string;
  client_id: string | undefined;
  project_manager_id: string | undefined;
  short_description?: string;
  long_description?: string;
  pitch_deck_url?: string;
  github_url?: string;
  started_on: string;
  status?: string | undefined;
  // read-only display fields
  project_code?: string;
}

interface ProjectFormFieldsProps {
  isEdit?: boolean;
  isPM?: boolean;
  formData: ProjectFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  clients: Client[];
  managers: Manager[];
  disabled?: boolean;
  allowedStatuses?: string[];
}

export function ProjectFormFields({
  isEdit = false,
  isPM = false,
  formData,
  errors,
  onChange,
  clients,
  managers,
  disabled = false,
  allowedStatuses = [],
}: ProjectFormFieldsProps) {
  // PM can only edit certain fields
  const canEditBasicInfo = !isPM;

  return (
    <div className="space-y-6">
      {/* Basic Information - HR Only */}
      {canEditBasicInfo && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Code — read-only, auto-generated */}
            <div className="space-y-2">
              <Label htmlFor="project_code">Project Code</Label>
              {isEdit && formData.project_code ? (
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-mono text-muted-foreground">
                  {formData.project_code}
                </div>
              ) : (
                <div className="flex h-10 items-center rounded-md border border-dashed bg-muted/50 px-3 text-sm text-muted-foreground italic">
                  Auto-generated on save
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Format: ClientCode-Year-Type+Seq (e.g. CL001-2025-E001)
              </p>
            </div>

            {/* Project Type — required */}
            <div className="space-y-2">
              <Label htmlFor="project_type">
                Project Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.project_type || undefined}
                onValueChange={(value) => onChange("project_type", value)}
                disabled={disabled}
              >
                <SelectTrigger id="project_type">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B">B — Bench</SelectItem>
                  <SelectItem value="C">C — Signed Customer Project</SelectItem>
                  <SelectItem value="E">E — Eager (Unsigned)</SelectItem>
                  <SelectItem value="M01">M01 — Business Development (Group 1)</SelectItem>
                  <SelectItem value="M02">M02 — Business Development (Group 2)</SelectItem>
                  <SelectItem value="O">O — Overheads / Internal Ops</SelectItem>
                  <SelectItem value="P">P — Product / Platform</SelectItem>
                  <SelectItem value="R">R — Research</SelectItem>
                  <SelectItem value="S">S — Solutioning</SelectItem>
                </SelectContent>
              </Select>
              {errors.project_type && (
                <p className="text-sm text-destructive">{errors.project_type}</p>
              )}
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Changing type will auto-update the project code
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_name">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => onChange("project_name", e.target.value)}
                disabled={disabled}
                placeholder="e.g., Mobile App Development"
              />
              {errors.project_name && (
                <p className="text-sm text-destructive">
                  {errors.project_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client (Optional)</Label>
              <Select
                value={formData.client_id || undefined}
                onValueChange={(value) => onChange("client_id", value)}
                disabled={disabled}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-destructive">{errors.client_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_manager_id">
                Project Manager <span className="text-destructive">*</span>
              </Label>
              <PMCombobox
                value={formData.project_manager_id || undefined}
                onValueChange={(value) => onChange("project_manager_id", value)}
                placeholder="Search and select project manager..."
                disabled={disabled}
              />
              {errors.project_manager_id && (
                <p className="text-sm text-destructive">
                  {errors.project_manager_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="started_on">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="started_on"
                type="date"
                value={formData.started_on}
                onChange={(e) => onChange("started_on", e.target.value)}
                disabled={disabled}
              />
              {errors.started_on && (
                <p className="text-sm text-destructive">{errors.started_on}</p>
              )}
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || undefined}
                  onValueChange={(value) => onChange("status", value)}
                  disabled={disabled || allowedStatuses.length === 0}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.length > 0 ? (
                      allowedStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace("_", " ")}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={formData.status || "DRAFT"} disabled>
                        {formData.status?.replace("_", " ") ||
                          "No transitions available"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {allowedStatuses.length === 0
                    ? "No status transitions available"
                    : isPM
                      ? "Limited status transitions available"
                      : "All transitions available"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Details - Both PM and HR */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Project Details</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="short_description">Short Description</Label>
            <Textarea
              id="short_description"
              value={formData.short_description || ""}
              onChange={(e) => onChange("short_description", e.target.value)}
              disabled={disabled}
              placeholder="Brief description of the project"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              A brief one-line description (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="long_description">Long Description</Label>
            <Textarea
              id="long_description"
              value={formData.long_description || ""}
              onChange={(e) => onChange("long_description", e.target.value)}
              disabled={disabled}
              placeholder="Detailed description of the project"
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Detailed project description (optional)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pitch_deck_url">Pitch Deck URL</Label>
              <Input
                id="pitch_deck_url"
                type="url"
                value={formData.pitch_deck_url || ""}
                onChange={(e) => onChange("pitch_deck_url", e.target.value)}
                disabled={disabled}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub URL</Label>
              <Input
                id="github_url"
                type="url"
                value={formData.github_url || ""}
                onChange={(e) => onChange("github_url", e.target.value)}
                disabled={disabled}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
        </div>
      </div>

      {isPM && isEdit && (
        <div className="space-y-2">
          <Label htmlFor="pm_status">Status</Label>
          <Select
            value={formData.status || undefined}
            onValueChange={(value) => onChange("status", value)}
            disabled={disabled}
          >
            <SelectTrigger id="pm_status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {allowedStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Limited status transitions available for Project Managers
          </p>
        </div>
      )}
    </div>
  );
}
