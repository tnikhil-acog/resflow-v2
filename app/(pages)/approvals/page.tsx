"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle, XCircle, CheckCheck, XOctagon } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("skills");
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [demandApprovals, setDemandApprovals] = useState<DemandApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Bulk operations state
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedDemands, setSelectedDemands] = useState<Set<string>>(
    new Set(),
  );
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState<"skill" | "demand">("skill");

  // Get taskId from URL if present
  const taskId = searchParams.get("taskId");

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    // Set active tab based on URL parameter
    const typeParam = searchParams.get("type");
    if (typeParam === "skill") {
      setActiveTab("skills");
    } else if (typeParam === "demand") {
      setActiveTab("demands");
    }

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
      const requestBody: any = {
        action: approve ? "approve" : "reject",
        employee_skill_id: skillRequestId,
      };

      // Include task_id if it was passed in the URL
      if (taskId) {
        requestBody.task_id = taskId;
      }

      const response = await fetch("/api/skills/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to ${approve ? "approve" : "reject"} skill request`,
        );
      }

      toast.success(
        `Skill request ${approve ? "approved" : "rejected"} successfully${data.approval_tasks_completed ? ` (Task completed)` : ""}`,
      );

      // If task was completed, navigate back to tasks page
      if (taskId && data.approval_tasks_completed > 0) {
        setTimeout(() => {
          router.push("/tasks");
        }, 1500);
      } else {
        fetchSkillRequests();
      }
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

      const requestBody: any = {
        demand_id: demandId,
        action: action === "FULFILLED" ? "approve" : "reject",
      };

      // Include task_id if it was passed in the URL
      if (taskId) {
        requestBody.task_id = taskId;
      }

      const response = await fetch("/api/demands/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${action.toLowerCase()} demand`,
        );
      }

      toast.success(
        `Demand ${action === "FULFILLED" ? "approved" : "rejected"} successfully${data.allocation_tasks_created ? ` (${data.allocation_tasks_created} allocation task(s) created)` : ""}${data.approval_tasks_completed ? ` (Task completed)` : ""}`,
      );

      // If task was completed, navigate back to tasks page
      if (
        taskId &&
        (data.approval_tasks_completed > 0 || data.allocation_tasks_created > 0)
      ) {
        setTimeout(() => {
          router.push("/tasks");
        }, 1500);
      } else {
        fetchDemandApprovals();
      }
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

  // Bulk operations handlers
  const handleBulkApprove = async (type: "skill" | "demand") => {
    const selected = type === "skill" ? selectedSkills : selectedDemands;

    if (selected.size === 0) {
      toast.error("Please select items to approve");
      return;
    }

    setBulkProcessing(true);

    try {
      const token = localStorage.getItem("auth_token");
      const approvals = Array.from(selected).map((id) => ({
        id: parseInt(id),
        type,
        action: "approve" as const,
      }));

      const response = await fetch("/api/approvals/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approvals }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bulk approval failed");
      }

      const successCount = data.results.filter(
        (r: any) => r.status === "success",
      ).length;
      const errorCount = data.results.filter(
        (r: any) => r.status === "error",
      ).length;

      if (errorCount > 0) {
        toast.warning(`Approved ${successCount} items, ${errorCount} failed`);
      } else {
        toast.success(`Successfully approved ${successCount} items`);
      }

      // Clear selection and refresh
      if (type === "skill") {
        setSelectedSkills(new Set());
        fetchSkillRequests();
      } else {
        setSelectedDemands(new Set());
        fetchDemandApprovals();
      }
    } catch (error) {
      console.error("Error in bulk approval:", error);
      toast.error(
        error instanceof Error ? error.message : "Bulk approval failed",
      );
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    const selected = rejectType === "skill" ? selectedSkills : selectedDemands;

    if (selected.size === 0) {
      toast.error("Please select items to reject");
      return;
    }

    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setBulkProcessing(true);
    setShowRejectDialog(false);

    try {
      const token = localStorage.getItem("auth_token");
      const approvals = Array.from(selected).map((id) => ({
        id: parseInt(id),
        type: rejectType,
        action: "reject" as const,
        rejection_reason: rejectReason,
      }));

      const response = await fetch("/api/approvals/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approvals }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bulk rejection failed");
      }

      const successCount = data.results.filter(
        (r: any) => r.status === "success",
      ).length;
      const errorCount = data.results.filter(
        (r: any) => r.status === "error",
      ).length;

      if (errorCount > 0) {
        toast.warning(`Rejected ${successCount} items, ${errorCount} failed`);
      } else {
        toast.success(`Successfully rejected ${successCount} items`);
      }

      // Clear selection and refresh
      setRejectReason("");
      if (rejectType === "skill") {
        setSelectedSkills(new Set());
        fetchSkillRequests();
      } else {
        setSelectedDemands(new Set());
        fetchDemandApprovals();
      }
    } catch (error) {
      console.error("Error in bulk rejection:", error);
      toast.error(
        error instanceof Error ? error.message : "Bulk rejection failed",
      );
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSkillSelection = (id: string) => {
    const newSelection = new Set(selectedSkills);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSkills(newSelection);
  };

  const toggleDemandSelection = (id: string) => {
    const newSelection = new Set(selectedDemands);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDemands(newSelection);
  };

  const toggleAllSkills = () => {
    if (selectedSkills.size === skillRequests.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(skillRequests.map((r) => r.id)));
    }
  };

  const toggleAllDemands = () => {
    if (selectedDemands.size === demandApprovals.length) {
      setSelectedDemands(new Set());
    } else {
      setSelectedDemands(new Set(demandApprovals.map((d) => d.id)));
    }
  };

  const openRejectDialog = (type: "skill" | "demand") => {
    const selected = type === "skill" ? selectedSkills : selectedDemands;
    if (selected.size === 0) {
      toast.error("Please select items to reject");
      return;
    }
    setRejectType(type);
    setRejectReason("");
    setShowRejectDialog(true);
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
      key: "select",
      header: "",
      render: (r) => (
        <Checkbox
          checked={selectedSkills.has(r.id)}
          onCheckedChange={() => toggleSkillSelection(r.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
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
      key: "select",
      header: "",
      render: (d) => (
        <Checkbox
          checked={selectedDemands.has(d.id)}
          onCheckedChange={() => toggleDemandSelection(d.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
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
        <div className="container mx-auto px-6 md:px-8 py-6">
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

      <div className="container mx-auto px-6 md:px-8 py-8">
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Skill Requests</CardTitle>
                    <CardDescription>
                      {isPM
                        ? "Approve or reject skill requests from your team members"
                        : "Approve or reject skill requests from all employees"}
                    </CardDescription>
                  </div>
                  {selectedSkills.size > 0 && (
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="px-3 py-1">
                        {selectedSkills.size} selected
                      </Badge>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleBulkApprove("skill")}
                        disabled={bulkProcessing}
                      >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Approve Selected
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openRejectDialog("skill")}
                        disabled={bulkProcessing}
                      >
                        <XOctagon className="h-4 w-4 mr-2" />
                        Reject Selected
                      </Button>
                    </div>
                  )}
                </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pending Resource Demands</CardTitle>
                      <CardDescription>
                        Fulfill or cancel resource demands from project managers
                      </CardDescription>
                    </div>
                    {selectedDemands.size > 0 && (
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="px-3 py-1">
                          {selectedDemands.size} selected
                        </Badge>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleBulkApprove("demand")}
                          disabled={bulkProcessing}
                        >
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Fulfill Selected
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openRejectDialog("demand")}
                          disabled={bulkProcessing}
                        >
                          <XOctagon className="h-4 w-4 mr-2" />
                          Cancel Selected
                        </Button>
                      </div>
                    )}
                  </div>
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

        {/* Bulk Rejection Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Selected Items</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for rejecting the selected{" "}
                {rejectType === "skill" ? "skill requests" : "demands"}. This
                will be sent to the requester(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkReject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!rejectReason.trim()}
              >
                Reject Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
