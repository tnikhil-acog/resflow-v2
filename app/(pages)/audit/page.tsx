"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  changed_fields: Record<string, any> | null;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
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
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [
    page,
    entityTypeFilter,
    operationFilter,
    userFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (entityTypeFilter) params.append("entity_type", entityTypeFilter);
      if (operationFilter) params.append("operation", operationFilter);
      if (userFilter) params.append("changed_by", userFilter);
      if (startDateFilter) params.append("start_date", startDateFilter);
      if (endDateFilter) params.append("end_date", endDateFilter);

      const response = await fetch(`/api/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
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
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-semibold">Audit Trail</h1>
            <p className="text-muted-foreground mt-1">
              Complete history of all system changes for compliance and tracking
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
                  <Select
                    value={userFilter}
                    onValueChange={(v) => {
                      setUserFilter(v === "all" ? undefined : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employee_code} - {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <th className="text-left p-3 font-medium">Entity ID</th>
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
                        <>
                          <tr
                            key={log.id}
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
                            <td className="p-3 font-mono text-xs">
                              {log.entity_id.slice(0, 8)}...
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
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">
                                    Changed Fields:
                                  </div>
                                  {log.changed_fields ? (
                                    <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
                                      {JSON.stringify(
                                        log.changed_fields,
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">
                                      No changed fields data available
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
