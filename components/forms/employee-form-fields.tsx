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

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface EmployeeFormData {
  employee_code: string;
  ldap_username: string;
  full_name: string;
  email: string;
  gender?: string;
  employee_type: string;
  employee_role: string;
  employee_design: string;
  working_location: string;
  department_id: string;
  reporting_manager_id?: string;
  experience_years?: string;
  resume_url?: string;
  college?: string;
  degree?: string;
  educational_stream?: string;
  joined_on: string;
}

interface EmployeeFormFieldsProps {
  isEdit?: boolean;
  formData: EmployeeFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  departments: Department[];
  managers: Manager[];
  disabled?: boolean;
}

export function EmployeeFormFields({
  isEdit = false,
  formData,
  errors,
  onChange,
  departments,
  managers,
  disabled = false,
}: EmployeeFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employee_code">
              Employee Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="employee_code"
              value={formData.employee_code}
              onChange={(e) => onChange("employee_code", e.target.value)}
              disabled={isEdit || disabled}
              placeholder="e.g., EMP001"
            />
            {errors.employee_code && (
              <p className="text-sm text-destructive">{errors.employee_code}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Cannot be changed after creation
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ldap_username">
              LDAP Username <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ldap_username"
              value={formData.ldap_username}
              onChange={(e) => onChange("ldap_username", e.target.value)}
              disabled={isEdit || disabled}
              placeholder="e.g., john.doe"
            />
            {errors.ldap_username && (
              <p className="text-sm text-destructive">{errors.ldap_username}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Cannot be changed after creation
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => onChange("full_name", e.target.value)}
              disabled={disabled}
              placeholder="e.g., John Doe"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onChange("email", e.target.value)}
              disabled={disabled}
              placeholder="john.doe@company.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender || undefined}
              onValueChange={(value) => onChange("gender", value)}
              disabled={disabled}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joined_on">
              Joining Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="joined_on"
              type="date"
              value={formData.joined_on}
              onChange={(e) => onChange("joined_on", e.target.value)}
              disabled={disabled}
              max={new Date().toISOString().split("T")[0]}
            />
            {errors.joined_on && (
              <p className="text-sm text-destructive">{errors.joined_on}</p>
            )}
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Employment Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employee_type">
              Employee Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.employee_type || undefined}
              onValueChange={(value) => onChange("employee_type", value)}
              disabled={disabled}
            >
              <SelectTrigger id="employee_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-Time">Full-Time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Intern">Intern</SelectItem>
              </SelectContent>
            </Select>
            {errors.employee_type && (
              <p className="text-sm text-destructive">{errors.employee_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_role">
              Employee Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.employee_role || undefined}
              onValueChange={(value) => onChange("employee_role", value)}
              disabled={disabled}
            >
              <SelectTrigger id="employee_role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="hr_executive">HR Executive</SelectItem>
              </SelectContent>
            </Select>
            {errors.employee_role && (
              <p className="text-sm text-destructive">{errors.employee_role}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_design">
              Designation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="employee_design"
              value={formData.employee_design}
              onChange={(e) => onChange("employee_design", e.target.value)}
              disabled={disabled}
              placeholder="e.g., Senior Software Engineer"
            />
            {errors.employee_design && (
              <p className="text-sm text-destructive">
                {errors.employee_design}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="working_location">
              Working Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="working_location"
              value={formData.working_location}
              onChange={(e) => onChange("working_location", e.target.value)}
              disabled={disabled}
              placeholder="e.g., Hyderabad"
            />
            {errors.working_location && (
              <p className="text-sm text-destructive">
                {errors.working_location}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_id">Department</Label>
            <Select
              value={formData.department_id || undefined}
              onValueChange={(value) => onChange("department_id", value)}
              disabled={disabled}
            >
              <SelectTrigger id="department_id">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reporting_manager_id">Reporting Manager</Label>
            <Select
              value={formData.reporting_manager_id || undefined}
              onValueChange={(value) => onChange("reporting_manager_id", value)}
              disabled={disabled}
            >
              <SelectTrigger id="reporting_manager_id">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience_years">Experience (Years)</Label>
            <Input
              id="experience_years"
              type="number"
              min="0"
              step="0.5"
              value={formData.experience_years || ""}
              onChange={(e) => onChange("experience_years", e.target.value)}
              disabled={disabled}
              placeholder="e.g., 3.5"
            />
          </div>
        </div>
      </div>

      {/* Education Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Education Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="college">College/University</Label>
            <Input
              id="college"
              value={formData.college || ""}
              onChange={(e) => onChange("college", e.target.value)}
              disabled={disabled}
              placeholder="e.g., IIT Delhi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="degree">Degree</Label>
            <Input
              id="degree"
              value={formData.degree || ""}
              onChange={(e) => onChange("degree", e.target.value)}
              disabled={disabled}
              placeholder="e.g., B.Tech"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="educational_stream">Stream/Major</Label>
            <Input
              id="educational_stream"
              value={formData.educational_stream || ""}
              onChange={(e) => onChange("educational_stream", e.target.value)}
              disabled={disabled}
              placeholder="e.g., Computer Science"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume_url">Resume URL</Label>
            <Input
              id="resume_url"
              type="url"
              value={formData.resume_url || ""}
              onChange={(e) => onChange("resume_url", e.target.value)}
              disabled={disabled}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
