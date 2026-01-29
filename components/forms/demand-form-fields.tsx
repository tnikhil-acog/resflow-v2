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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface Skill {
  skill_id: string;
  skill_name: string;
  skill_department: string;
}

interface DemandFormData {
  project_id: string | undefined;
  role_required: string;
  skill_ids: string[];
  start_date: string;
}

interface DemandFormFieldsProps {
  isEdit: boolean;
  formData: DemandFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string | string[]) => void;
  projects: Project[];
  skills: Skill[];
  disabled?: boolean;
}

export function DemandFormFields({
  isEdit,
  formData,
  errors,
  onChange,
  projects,
  skills,
  disabled = false,
}: DemandFormFieldsProps) {
  const handleSkillAdd = (skillId: string) => {
    if (!formData.skill_ids.includes(skillId)) {
      onChange("skill_ids", [...formData.skill_ids, skillId]);
    }
  };

  const handleSkillRemove = (skillId: string) => {
    onChange(
      "skill_ids",
      formData.skill_ids.filter((id) => id !== skillId),
    );
  };

  const selectedSkills = skills.filter((s) =>
    formData.skill_ids.includes(s.skill_id),
  );
  const availableSkills = skills.filter(
    (s) => !formData.skill_ids.includes(s.skill_id),
  );

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project_id">
            Project <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.project_id}
            onValueChange={(value) => onChange("project_id", value)}
            disabled={disabled || isEdit}
          >
            <SelectTrigger
              id="project_id"
              className={errors.project_id ? "border-destructive" : ""}
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
          {errors.project_id && (
            <p className="text-sm text-destructive">{errors.project_id}</p>
          )}
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Project cannot be changed after creation
            </p>
          )}
        </div>
      </div>

      {/* Demand Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Demand Details</h3>

        <div className="space-y-2">
          <Label htmlFor="role_required">
            Role Required <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role_required"
            value={formData.role_required}
            onChange={(e) => onChange("role_required", e.target.value)}
            placeholder="e.g., Senior Frontend Developer"
            disabled={disabled}
            className={errors.role_required ? "border-destructive" : ""}
          />
          {errors.role_required && (
            <p className="text-sm text-destructive">{errors.role_required}</p>
          )}
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
            className={errors.start_date ? "border-destructive" : ""}
          />
          {errors.start_date && (
            <p className="text-sm text-destructive">{errors.start_date}</p>
          )}
        </div>
      </div>

      {/* Skills Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Required Skills</h3>

        {/* Selected Skills */}
        {selectedSkills.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Skills</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <Badge
                  key={skill.skill_id}
                  variant="secondary"
                  className="gap-1"
                >
                  {skill.skill_name}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleSkillRemove(skill.skill_id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add Skills Dropdown */}
        {!disabled && availableSkills.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="add_skill">Add Skills</Label>
            <Select
              value=""
              onValueChange={(value) => {
                handleSkillAdd(value);
              }}
            >
              <SelectTrigger id="add_skill">
                <SelectValue placeholder="Select skills to add" />
              </SelectTrigger>
              <SelectContent>
                {availableSkills.map((skill) => (
                  <SelectItem key={skill.skill_id} value={skill.skill_id}>
                    {skill.skill_name} ({skill.skill_department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {errors.skill_ids && (
          <p className="text-sm text-destructive">{errors.skill_ids}</p>
        )}

        {selectedSkills.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No skills selected. Add skills from the dropdown above.
          </p>
        )}
      </div>
    </div>
  );
}
