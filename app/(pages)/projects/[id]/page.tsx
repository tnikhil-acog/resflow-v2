"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  FileText,
  Github,
  Pencil,
  Users,
  ClipboardList,
  FolderKanban,
} from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface ProjectDetails {
  id: string;
  project_code: string;
  project_name: string;
  client_id: string;
  client_name?: string;
  project_manager_id: string;
  project_manager_name?: string;
  short_description?: string;
  long_description?: string;
  pitch_deck_url?: string;
  github_url?: string;
  status: string;
  started_on: string;
  closed_on?: string;
}

export default function ProjectDetailPage() {
  return (
    <ProtectedRoute>
      <ProjectDetailContent />
    </ProtectedRoute>
  );
}

function ProjectDetailContent() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const isHR = user?.employee_role === "hr_executive";
  const isPM = user?.employee_role === "project_manager";
  const canEdit = isHR || (isPM && project?.project_manager_id === user?.id);

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch(`/api/projects?action=get&id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You don't have permission to view this project");
          router.push("/projects");
          return;
        }
        throw new Error("Failed to fetch project details");
      }

      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project details");
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "secondary",
      ACTIVE: "default",
      ON_HOLD: "outline",
      COMPLETED: "secondary",
      CANCELLED: "destructive",
    };
    return colors[status] || "default";
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/projects")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{project.project_name}</h1>
              <p className="text-muted-foreground mt-1">
                {project.project_code}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={getStatusColor(project.status) as any}>
                {project.status.replace("_", " ")}
              </Badge>
              {canEdit && (
                <Button
                  onClick={() => router.push(`/projects/${projectId}/edit`)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">
                        {project.client_name || "Not assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Project Manager
                      </p>
                      <p className="font-medium">
                        {project.project_manager_name || "Not assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Started On
                      </p>
                      <p className="font-medium">
                        {new Date(project.started_on).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {project.closed_on && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Closed On
                        </p>
                        <p className="font-medium">
                          {new Date(project.closed_on).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {project.short_description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Short Description
                      </p>
                      <p className="text-sm">{project.short_description}</p>
                    </div>
                  </>
                )}

                {project.long_description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Detailed Description
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {project.long_description}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Links */}
            {(project.pitch_deck_url || project.github_url) && (
              <Card>
                <CardHeader>
                  <CardTitle>Project Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.pitch_deck_url && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Pitch Deck
                        </p>
                        <a
                          href={project.pitch_deck_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Pitch Deck
                        </a>
                      </div>
                    </div>
                  )}

                  {project.github_url && (
                    <div className="flex items-center gap-3">
                      <Github className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          GitHub Repository
                        </p>
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Repository
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Team Allocations - Link to Filtered View */}
            <Card>
              <CardHeader>
                <CardTitle>Team Allocations</CardTitle>
                <CardDescription>
                  View team members allocated to this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    View detailed allocation information including team members,
                    percentages, and timelines
                  </p>
                  <Button
                    onClick={() =>
                      router.push(`/allocations?project=${projectId}`)
                    }
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Project Allocations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Links & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Navigate to related sections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/projects/${projectId}/phases`)}
                >
                  <FolderKanban className="h-4 w-4 mr-2" />
                  View Phases
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(`/allocations?project=${projectId}`)
                  }
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Team Allocations
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/logs?project=${projectId}`)}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View Work Logs
                </Button>
                {(isPM || isHR) && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/demands?project=${projectId}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Resource Demands
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
