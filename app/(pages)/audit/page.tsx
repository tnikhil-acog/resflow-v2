"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/empty-state";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Search,
  FileText,
} from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  operation: string;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  changed_fields: Record<string, any> | null;
}

const FIELD_LABELS: Record<string, string> = {
  emp_id: "Employee",
  project_id: "Project",
  skill_id: "Skill",
  department_id: "Department",
  client_id: "Client",
  phase_id: "Phase",
  reporting_manager_id: "Reporting Manager",
  owner_id: "Owner",
  assigned_by: "Assigned By",
  approved_by: "Approved By",
  approved_at: "Approved On",
  demand_status: "Demand Status",
  status: "Status",
  role: "Role",
  allocation_percentage: "Allocation %",
  start_date: "Start Date",
  end_date: "End Date",
  billability: "Billable",
  full_name: "Full Name",
  email: "Email",
  employee_code: "Employee Code",
  employee_role: "Role",
  employee_type: "Employment Type",
  employee_design: "Designation",
  experience_years: "Years of Experience",
  working_location: "Location",
  proficiency_level: "Proficiency Level",
  project_name: "Project Name",
  project_code: "Project Code",
  project_type: "Project Type",
  hours: "Hours",
  log_date: "Log Date",
  notes: "Notes",
  locked: "Locked",
  report_type: "Report Type",
  description: "Description",
  due_on: "Due Date",
  joined_on: "Joined On",
  exited_on: "Exited On",
  skill_ids: "Skills",
  completion_reason: "Reason",
  action: "Action",
  phase_name: "Phase Name",
  content: "Content (truncated)",
};

// Internal plumbing IDs — not useful to display standalone
const HIDDEN_FIELDS = new Set(["allocation_id", "demand_id"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && UUID_RE.test(value))
    return `${value.slice(0, 8)}… (ID)`;
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string" && UUID_RE.test(v)))
      return `${value.length} item(s)`;
    return value.join(", ");
  }
  const str = String(value);
  return str.length > 120 ? str.slice(0, 120) + "…" : str;
}

function ChangedFieldsDisplay({
  changedFields,
}: {
  changedFields: Record<string, any>;
}) {
  const entries = Object.entries(changedFields).filter(
    ([key]) => !HIDDEN_FIELDS.has(key),
  );

  if (entries.length === 0)
    return (
      <p className="text-sm text-muted-foreground italic">No detail available</p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border rounded">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left p-2 font-medium w-1/4">Field</th>
            <th className="text-left p-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => {
            const label =
              FIELD_LABELS[key] ??
              key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const isDiff =
              value !== null &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              ("old" in value || "new" in value);

            return (
              <tr key={key} className="border-t">
                <td className="p-2 font-medium text-muted-foreground whitespace-nowrap">
                  {label}
                </td>
                <td className="p-2">
                  {isDiff ? (
                    <span className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground">
                        {formatValue(value.old)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{formatValue(value.new)}</span>
                    </span>
                  ) : (
                    formatValue(value)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditPage() {
  return (
    <ProtectedRoute requiredRoles={["hr_executive"]}>
      <AuditContent />
    </ProtectedRoute>
  );
}

function AuditContent() {
  const router = useRouter();
  const { user, authenticatedFetch } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>(
    undefined,
  );
  const [operationFilter, setOperationFilter] = useState<string | undefined>(
    undefined,
  );
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const entityTypes = [
    "EMPLOYEE",
    "DEPARTMENT",
    "CLIENT",
    "PROJECT",
    "PROJECT_ALLOCATION",
    "SKILL",
    "EMPLOYEE_SKILL",
    "DEMAND",
    "DEMAND_SKILL",
    "REPORT",
    "TASK",
    "PHASE",
    "PHASE_REPORT",
    "DAILY_PROJECT_LOG",
    "ATTRIBUTE",
    "ATTRIBUTE_VALUE",
  ];

  const operations = ["INSERT", "UPDATE", "DELETE"];

  useEffect(() => {
    fetchAuditLogs();
  }, [
    page,
    entityTypeFilter,
    operationFilter,
    userFilter,
    startDateFilter,
    endDateFilter,
    searchQuery,
  ]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (entityTypeFilter) params.append("entity_type", entityTypeFilter);
      if (operationFilter) params.append("operation", operationFilter);
      if (userFilter) params.append("changed_by", userFilter);
      if (startDateFilter) params.append("start_date", startDateFilter);
      if (endDateFilter) params.append("end_date", endDateFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await authenticatedFetch(`/api/audit?${params.toString()}`, {
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setAuditLogs(data.audits || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getOperationBadgeVariant = (operation: string) => {
    switch (operation) {
      case "INSERT":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleClearFilters = () => {
    setEntityTypeFilter(undefined);
    setOperationFilter(undefined);
    setUserFilter(undefined);
    setStartDateFilter("");
    setEndDateFilter("");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold">Audit Trail</h1>
            <p className="text-muted-foreground mt-1">
              Complete history of all system changes for compliance and tracking
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>System Audit Logs</CardTitle>
            <CardDescription>
              Track all changes made to entities across the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by entity ID..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleSearch} size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity Type</label>
                  <Select
                    value={entityTypeFilter}
                    onValueChange={(v) => {
                      setEntityTypeFilter(v === "all" ? undefined : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All entity types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entity Types</SelectItem>
                      {entityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Operation</label>
                  <Select
                    value={operationFilter}
                    onValueChange={(v) => {
                      setOperationFilter(v === "all" ? undefined : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All operations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operations</SelectItem>
                      {operations.map((op) => (
                        <SelectItem key={op} value={op}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Changed By</label>
                  <EmployeeCombobox
                    value={userFilter}
                    onValueChange={(v) => {
                      setUserFilter(v === "" ? undefined : v);
                      setPage(1);
                    }}
                    placeholder="All users"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => {
                        setStartDateFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => {
                        setEndDateFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-sm text-muted-foreground">
                  Showing {auditLogs.length} of {total} audit logs
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="border rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="w-10 p-3"></th>
                      <th className="text-left p-3 font-medium">Entity Type</th>
                      <th className="text-left p-3 font-medium">Entity</th>
                      <th className="text-left p-3 font-medium">Operation</th>
                      <th className="text-left p-3 font-medium">Changed By</th>
                      <th className="text-left p-3 font-medium">Changed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No audit logs found
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <React.Fragment key={log.id}>
                          <tr
                            className="border-b hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleRowExpansion(log.id)}
                          >
                            <td className="p-3">
                              {expandedRows.has(log.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">
                                {log.entity_type.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">
                              {log.entity_label ? (
                                <span>{log.entity_label}</span>
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {log.entity_id.slice(0, 8)}…
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={getOperationBadgeVariant(
                                  log.operation,
                                )}
                              >
                                {log.operation}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {log.changed_by_name || "Unknown"}
                            </td>
                            <td className="p-3 text-sm">
                              {new Date(log.changed_at).toLocaleString()}
                            </td>
                          </tr>
                          {expandedRows.has(log.id) && (
                            <tr
                              key={`${log.id}-details`}
                              className="bg-muted/10"
                            >
                              <td colSpan={6} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">
                                      Full entity ID:
                                    </span>
                                    <span className="font-mono text-xs">
                                      {log.entity_id}
                                    </span>
                                  </div>
                                  <div className="font-medium text-sm">Changes:</div>
                                  {log.changed_fields ? (
                                    <ChangedFieldsDisplay
                                      changedFields={log.changed_fields}
                                    />
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      No detail available
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <PaginationControls
              currentPage={page}
              pageSize={limit}
              total={total}
              onPageChange={setPage}
              itemName="audit logs"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
