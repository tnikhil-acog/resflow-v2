"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Circle,
  Plus,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { format } from "date-fns";

interface Phase {
  id: string;
  project_id: string;
  phase_name: string;
  phase_description: string | null;
  created_at: string;
  reports: PhaseReport[];
}

interface PhaseReport {
  id: string;
  phase_id: string;
  content: string;
  submitted_by: string;
  submitted_at: string;
  submitter: {
    id: string;
    employee_name: string;
    employee_code: string;
  };
}

interface Project {
  id: string;
  project_name: string;
  project_code: string;
}

export default function ProjectPhasesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [canManage, setCanManage] = useState(false);

  // Dialog states
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);

  // Form data
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseDescription, setNewPhaseDescription] = useState("");
  const [reportContent, setReportContent] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchUserRole();
      fetchProject();
      fetchPhases();
    }
  }, [projectId]);

  async function fetchUserRole() {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.employee_role);
        setCanManage(
          data.employee_role === "hr_executive" ||
            data.employee_role === "project_manager",
        );
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }

  async function fetchProject() {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    }
  }

  async function fetchPhases() {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/phases?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch phases");
      }

      const data = await response.json();
      setPhases(data);
    } catch (error) {
      console.error("Error fetching phases:", error);
      toast({
        title: "Error",
        description: "Failed to fetch project phases.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhase() {
    if (!newPhaseName.trim()) {
      toast({
        title: "Validation Error",
        description: "Phase name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          phase_name: newPhaseName,
          phase_description: newPhaseDescription || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create phase");
      }

      toast({
        title: "Success",
        description: "Phase created successfully.",
      });

      setAddPhaseOpen(false);
      setNewPhaseName("");
      setNewPhaseDescription("");
      fetchPhases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create phase.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReport() {
    if (!reportContent.trim() || !selectedPhase) {
      toast({
        title: "Validation Error",
        description: "Report content is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/phase-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase_id: selectedPhase.id,
          content: reportContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit phase report");
      }

      toast({
        title: "Success",
        description: "Phase report submitted successfully.",
      });

      setReportDialogOpen(false);
      setReportContent("");
      setSelectedPhase(null);
      fetchPhases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit phase report.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openReportDialog(phase: Phase) {
    setSelectedPhase(phase);
    setReportDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Phases</h1>
          {project && (
            <p className="text-muted-foreground mt-1">
              {project.project_code} - {project.project_name}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {canManage && (
            <Dialog open={addPhaseOpen} onOpenChange={setAddPhaseOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phase
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Phase</DialogTitle>
                  <DialogDescription>
                    Create a new phase for this project (e.g., Planning, Design,
                    Development, Testing, Deployment)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="phase-name">
                      Phase Name <span className="text-destructive">*</span>
                    </Label>
                    <input
                      id="phase-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      placeholder="e.g., Planning, Design, Development"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phase-description">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="phase-description"
                      value={newPhaseDescription}
                      onChange={(e) => setNewPhaseDescription(e.target.value)}
                      placeholder="Brief description of this phase"
                      disabled={submitting}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setAddPhaseOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddPhase} disabled={submitting}>
                    {submitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                    Create Phase
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline">Back to Project</Button>
          </Link>
        </div>
      </div>

      {phases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No phases have been created for this project yet.
            </p>
            {canManage && (
              <Button onClick={() => setAddPhaseOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Phase
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {phases.map((phase, index) => (
            <Card key={phase.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {phase.reports.length > 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div>
                      <CardTitle className="text-xl">
                        {phase.phase_name}
                      </CardTitle>
                      {phase.phase_description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {phase.phase_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        phase.reports.length > 0 ? "default" : "secondary"
                      }
                    >
                      {phase.reports.length}{" "}
                      {phase.reports.length === 1 ? "Report" : "Reports"}
                    </Badge>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReportDialog(phase)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {phase.reports.length > 0 && (
                <CardContent>
                  <div className="space-y-4">
                    {phase.reports.map((report) => (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{report.submitter.employee_name}</span>
                            <span className="text-xs">
                              ({report.submitter.employee_code})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(
                                new Date(report.submitted_at),
                                "MMM dd, yyyy HH:mm",
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {report.content}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Submit Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Phase Report</DialogTitle>
            <DialogDescription>
              {selectedPhase &&
                `Submit a completion report for: ${selectedPhase.phase_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-content">
                Report Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="report-content"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="Describe what was accomplished in this phase, key deliverables, challenges faced, and next steps..."
                disabled={submitting}
                rows={8}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setReportDialogOpen(false);
                setReportContent("");
                setSelectedPhase(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={submitting}>
              {submitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
