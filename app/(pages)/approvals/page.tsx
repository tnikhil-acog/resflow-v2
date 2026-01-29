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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface SkillRequest {
  id: string;
  type: "skill";
  emp_id: string;
  employee_code: string;
  employee_name: string;
  skill_id: string;
  skill_name: string;
  proficiency_level: string;
  requested_at: string;
}

interface DemandApproval {
  id: string;
  type: "demand";
  project_id: string;
  project_code: string;
  project_name: string;
  role_required: string;
  skill_names: string[];
  start_date: string;
  requested_by: string;
  requested_by_name: string;
  demand_status: string;
}

export default function ApprovalsPage() {
  return (
    <ProtectedRoute requiredRoles={["project_manager", "hr_executive"]}>
      <ApprovalsContent />
    </ProtectedRoute>
  );
}

function ApprovalsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("skills");
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [demandApprovals, setDemandApprovals] = useState<DemandApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    fetchSkillRequests();
    if (isHR) {
      fetchDemandApprovals();
    }
  }, []);

  const fetchSkillRequests = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/approvals?type=skill", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch skill requests");
      }

      const data = await response.json();
      setSkillRequests(data.approvals || []);
    } catch (error) {
      console.error("Error fetching skill requests:", error);
      toast.error("Failed to load skill requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchDemandApprovals = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/approvals?type=demand", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch demand approvals");
      }

      const data = await response.json();
      setDemandApprovals(data.approvals || []);
    } catch (error) {
      console.error("Error fetching demand approvals:", error);
      toast.error("Failed to load demand approvals");
    }
  };

  const handleSkillApproval = async (
    skillRequestId: string,
    approve: boolean,
  ) => {
    setProcessing(skillRequestId);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employee-skills", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: approve ? "approve" : "reject",
          id: skillRequestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to ${approve ? "approve" : "reject"} skill request`,
        );
      }

      toast.success(
        `Skill request ${approve ? "approved" : "rejected"} successfully`,
      );
      fetchSkillRequests();
    } catch (error) {
      console.error(
        `Error ${approve ? "approving" : "rejecting"} skill request:`,
        error,
      );
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${approve ? "approve" : "reject"} skill request`,
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleDemandAction = async (
    demandId: string,
    action: "FULFILLED" | "CANCELLED",
  ) => {
    setProcessing(demandId);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/demands", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update_status",
          id: demandId,
          demand_status: action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${action.toLowerCase()} demand`,
        );
      }

      toast.success(`Demand ${action.toLowerCase()} successfully`);
      fetchDemandApprovals();
    } catch (error) {
      console.error(`Error ${action.toLowerCase()} demand:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${action.toLowerCase()} demand`,
      );
    } finally {
      setProcessing(null);
    }
  };

  const getProficiencyBadgeVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case "expert":
        return "default";
      case "intermediate":
        return "secondary";
      case "beginner":
        return "outline";
      default:
        return "outline";
    }
  };

  const skillColumns: Column<SkillRequest>[] = [
    {
      key: "employee_code",
      header: "Employee Code",
      render: (r) => r.employee_code,
    },
    {
      key: "employee_name",
      header: "Employee Name",
      render: (r) => r.employee_name,
    },
    {
      key: "skill_name",
      header: "Skill",
      render: (r) => r.skill_name,
    },
    {
      key: "proficiency_level",
      header: "Proficiency",
      render: (r) => (
        <Badge variant={getProficiencyBadgeVariant(r.proficiency_level)}>
          {r.proficiency_level}
        </Badge>
      ),
    },
    {
      key: "requested_at",
      header: "Requested On",
      render: (r) => new Date(r.requested_at).toLocaleDateString(),
    },
  ];

  const demandColumns: Column<DemandApproval>[] = [
    {
      key: "project_code",
      header: "Project Code",
      render: (d) => d.project_code,
    },
    {
      key: "project_name",
      header: "Project Name",
      render: (d) => d.project_name,
    },
    {
      key: "role_required",
      header: "Role Required",
      render: (d) => d.role_required,
    },
    {
      key: "skills",
      header: "Skills",
      render: (d) => (
        <div className="flex flex-wrap gap-1">
          {d.skill_names && d.skill_names.length > 0 ? (
            d.skill_names.map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">No skills</span>
          )}
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Start Date",
      render: (d) => new Date(d.start_date).toLocaleDateString(),
    },
    {
      key: "requested_by_name",
      header: "Requested By",
      render: (d) => d.requested_by_name,
    },
  ];

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-semibold">Approvals</h1>
            <p className="text-muted-foreground mt-1">
              {isPM
                ? "Review and approve skill requests from your team"
                : "Review and approve skill requests and resource demands"}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="skills">
              Skill Requests
              {skillRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {skillRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            {isHR && (
              <TabsTrigger value="demands">
                Demands
                {demandApprovals.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {demandApprovals.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Skill Requests</CardTitle>
                <CardDescription>
                  {isPM
                    ? "Approve or reject skill requests from your team members"
                    : "Approve or reject skill requests from all employees"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {skillRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending skill requests
                  </div>
                ) : (
                  <DataTable
                    columns={skillColumns}
                    data={skillRequests}
                    searchKeys={[
                      "employee_name",
                      "employee_code",
                      "skill_name",
                    ]}
                    searchPlaceholder="Search by employee or skill..."
                    actions={(r) => (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkillApproval(r.id, true);
                          }}
                          disabled={processing === r.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkillApproval(r.id, false);
                          }}
                          disabled={processing === r.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isHR && (
            <TabsContent value="demands" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Resource Demands</CardTitle>
                  <CardDescription>
                    Fulfill or cancel resource demands from project managers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {demandApprovals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending resource demands
                    </div>
                  ) : (
                    <DataTable
                      columns={demandColumns}
                      data={demandApprovals}
                      searchKeys={[
                        "project_name",
                        "project_code",
                        "role_required",
                      ]}
                      searchPlaceholder="Search by project or role..."
                      onRowClick={(d) => router.push(`/demands/${d.id}`)}
                      actions={(d) => (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDemandAction(d.id, "FULFILLED");
                            }}
                            disabled={processing === d.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Fulfill
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDemandAction(d.id, "CANCELLED");
                            }}
                            disabled={processing === d.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
