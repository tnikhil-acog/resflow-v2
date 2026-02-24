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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingPage, LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  Building2,
  User,
  GraduationCap,
  FileText,
  Pencil,
  Save,
  X,
} from "lucide-react";

interface EmployeeDetails {
  id: string;
  employee_code: string;
  ldap_username: string;
  full_name: string;
  email: string;
  gender?: string;
  employee_type: string;
  employee_role: string;
  employee_design: string;
  working_location: string;
  department_id?: string;
  department_name?: string;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  experience_years?: number;
  resume_url?: string;
  college?: string;
  degree?: string;
  educational_stream?: string;
  status: string;
  joined_on: string;
  exited_on?: string;
}

interface Allocation {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  role: string;
  allocation_percentage: number;
  is_billable: boolean;
  start_date: string;
  end_date?: string;
  status: string;
}

interface Skill {
  id: string;
  skill_id: string;
  skill_name: string;
  department_name: string;
  status: string;
  requested_on: string;
  approved_on?: string;
  proficiency_level?: string;
}

export default function EmployeeDetailPage() {
  return (
    <ProtectedRoute>
      <EmployeeDetailContent />
    </ProtectedRoute>
  );
}

function EmployeeDetailContent() {
  const params = useParams();
  const employeeId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [hasShownPermissionError, setHasShownPermissionError] = useState(false);

  const [resumeUrl, setResumeUrl] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [educationalStream, setEducationalStream] = useState("");

  const isHR = user?.employee_role === "hr_executive";
  const isPM = user?.employee_role === "project_manager";
  const isEmployee = user?.employee_role === "employee";
  const isOwnProfile = user?.id === employeeId;

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
      fetchAllocations();
      fetchSkills();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setError("Not authenticated");
        return;
      }

      // If employee tries to view someone else's profile, redirect to their own
      if (isEmployee && !isOwnProfile) {
        router.push(`/employees/${user?.id}`);
        return;
      }

      const response = await fetch(
        `/api/employees?action=get&id=${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        if (response.status === 403 && !hasShownPermissionError) {
          setHasShownPermissionError(true);
          toast.error("Access Denied", {
            description:
              "You don't have permission to view this employee's details.",
          });
          router.push("/employees");
          return;
        }
        throw new Error("Failed to fetch employee");
      }

      const data = await response.json();
      // With action=get, API returns employee object directly
      const emp = data;

      if (!emp || typeof emp !== "object" || !emp.id) {
        throw new Error("Invalid employee data received");
      }

      setEmployee(emp);
      setResumeUrl(emp.resume_url || "");
      setCollege(emp.college || "");
      setDegree(emp.degree || "");
      setEducationalStream(emp.educational_stream || "");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load employee";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/allocations?employee_id=${employeeId}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setAllocations(data.allocations || []);
      }
    } catch (err) {
      console.error("Error fetching allocations:", err);
    }
  };

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/employee-skills?employee_id=${employeeId}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error("Error fetching skills:", err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/employees", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: employee?.id,
          resume_url: resumeUrl || null,
          college: college || null,
          degree: degree || null,
          educational_stream: educationalStream || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("Employee updated successfully");
      setIsEditing(false);
      fetchEmployee();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setResumeUrl(employee?.resume_url || "");
    setCollege(employee?.college || "");
    setDegree(employee?.degree || "");
    setEducationalStream(employee?.educational_stream || "");
    setIsEditing(false);
  };

  const today = new Date();
  const currentAllocations = allocations.filter((a) => {
    const endDate = a.end_date ? new Date(a.end_date) : null;
    return !endDate || endDate >= today;
  });

  const pastAllocations = allocations.filter((a) => {
    const endDate = a.end_date ? new Date(a.end_date) : null;
    return endDate && endDate < today;
  });

  const totalCurrentAllocation = currentAllocations.reduce(
    (sum, a) => sum + parseFloat(a.allocation_percentage.toString()),
    0,
  );

  if (loading) return <LoadingPage />;

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Failed to load employee"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1600px] mx-auto p-6 min-w-0">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Modern Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Profile Card */}
          <div className="xl:col-span-4">
            <Card className="sticky top-6 overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-card/50">
              {/* Gradient Header with Avatar */}
              <div className="relative h-32 bg-gradient-to-br from-primary via-primary/90 to-primary/70">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                <div className="absolute -bottom-12 left-6">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-2xl bg-white shadow-2xl flex items-center justify-center ring-4 ring-background">
                      <span className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                        {employee.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 border-4 border-background shadow-lg flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <CardContent className="pt-16 pb-6 px-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {employee.full_name}
                  </h2>
                  <p className="text-base text-muted-foreground font-medium mb-3">
                    {employee.employee_design}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{employee.employee_code}</span>
                  </div>
                </div>

                <Separator />

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="text-2xl font-bold text-primary">
                      {employee.experience_years || 0}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Years Exp
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="text-2xl font-bold text-emerald-600">
                      {currentAllocations.length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Projects
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <div className="text-2xl font-bold text-violet-600">
                      {totalCurrentAllocation}%
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Allocated
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <div className="text-2xl font-bold text-amber-600">
                      {skills.length}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      Skills
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground truncate">
                      {employee.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {employee.employee_type || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {employee.department_name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {employee.working_location}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Joined{" "}
                      {new Date(employee.joined_on).toLocaleDateString(
                        "en-US",
                        { month: "short", year: "numeric" },
                      )}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      employee.status === "ACTIVE" ? "success" : "secondary"
                    }
                    className="text-xs px-3 py-1"
                  >
                    {employee.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabs Content */}
          <div className="xl:col-span-8 min-w-0">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex h-12 items-center justify-start rounded-xl bg-card border shadow-md p-1.5 w-full overflow-x-auto">
                <TabsTrigger
                  value="overview"
                  className="gap-2 px-6 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                >
                  <User className="h-4 w-4" />
                  <span className="font-semibold">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  className="gap-2 px-6 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="font-semibold">Projects</span>
                </TabsTrigger>
                <TabsTrigger
                  value="skills"
                  className="gap-2 px-6 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="font-semibold">Skills</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Education & Details
                      </CardTitle>
                      {isHR && (
                        <Button
                          size="sm"
                          variant={isEditing ? "destructive" : "default"}
                          onClick={() =>
                            isEditing ? handleCancelEdit() : setIsEditing(true)
                          }
                          className="gap-2"
                        >
                          {isEditing ? (
                            <>
                              <X className="h-4 w-4" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6 space-y-6">
                    {isEditing && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          You are editing this employee's details
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">College</Label>
                        {isEditing ? (
                          <Input
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            placeholder="Enter college name"
                            disabled={saving}
                          />
                        ) : (
                          <p className="text-foreground">
                            {college || "Not specified"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Degree</Label>
                        {isEditing ? (
                          <Input
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                            placeholder="Enter degree"
                            disabled={saving}
                          />
                        ) : (
                          <p className="text-foreground">
                            {degree || "Not specified"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Educational Stream
                        </Label>
                        {isEditing ? (
                          <Input
                            value={educationalStream}
                            onChange={(e) =>
                              setEducationalStream(e.target.value)
                            }
                            placeholder="Enter stream"
                            disabled={saving}
                          />
                        ) : (
                          <p className="text-foreground">
                            {educationalStream || "Not specified"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Resume URL
                        </Label>
                        {isEditing ? (
                          <Input
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            placeholder="Enter resume URL"
                            disabled={saving}
                          />
                        ) : (
                          <p className="text-foreground">
                            {resumeUrl ? (
                              <a
                                href={resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all"
                              >
                                View Resume
                              </a>
                            ) : (
                              "Not uploaded"
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="gap-2"
                        >
                          {saving ? (
                            <>
                              <LoadingSpinner size="sm" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-6">
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Current Allocations
                    </CardTitle>
                    <CardDescription>
                      {currentAllocations.length} active allocation
                      {currentAllocations.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6">
                    {currentAllocations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No current allocations
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {currentAllocations.map((alloc) => (
                          <div
                            key={alloc.id}
                            className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  {alloc.project_name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {alloc.project_code} • {alloc.role}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {alloc.allocation_percentage}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Start:{" "}
                                </span>
                                {new Date(
                                  alloc.start_date,
                                ).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Billable:{" "}
                                </span>
                                {alloc.is_billable ? "Yes" : "No"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {pastAllocations.length > 0 && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        Previous Allocations
                      </CardTitle>
                      <CardDescription>
                        {pastAllocations.length} past allocation
                        {pastAllocations.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {pastAllocations.map((alloc) => (
                          <div
                            key={alloc.id}
                            className="p-4 rounded-lg border bg-card/50 opacity-60 hover:opacity-100 transition-all"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  {alloc.project_name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {alloc.project_code} • {alloc.role}
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {alloc.allocation_percentage}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Ended:{" "}
                                </span>
                                {alloc.end_date
                                  ? new Date(
                                      alloc.end_date,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Status:{" "}
                                </span>
                                {alloc.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-6">
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Skills
                    </CardTitle>
                    <CardDescription>
                      {skills.length} skill{skills.length !== 1 ? "s" : ""}{" "}
                      listed
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6">
                    {skills.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No skills listed
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Skill</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Proficiency</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {skills.map((skill) => (
                              <TableRow key={skill.id}>
                                <TableCell className="font-medium">
                                  {skill.skill_name}
                                </TableCell>
                                <TableCell>{skill.department_name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {skill.proficiency_level}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      skill.status === "APPROVED"
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {skill.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
