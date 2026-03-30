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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  User,
  Building2,
  Users,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  GraduationCap,
  FileText,
  Pencil,
  Percent,
  Save,
  X,
} from "lucide-react";
import { DepartmentsTab } from "@/components/settings/departments-tab";
import { ClientsTab } from "@/components/settings/clients-tab";

interface UserProfile {
  id: string;
  employee_code: string;
  ldap_username: string;
  full_name: string;
  email: string;
  gender: string | null;
  employee_type: string;
  employee_role: string;
  employee_design: string;
  working_location: string;
  department_id: string;
  department_name?: string;
  reporting_manager_id: string | null;
  reporting_manager_name: string | null;
  experience_years: number;
  resume_url: string | null;
  college: string | null;
  degree: string | null;
  educational_stream: string | null;
  status: string;
  joined_on: string;
  exited_on: string | null;
}
import type { Allocation, EmployeeSkill as Skill } from "@/lib/types";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { user, authenticatedFetch } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [resumeUrl, setResumeUrl] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [educationalStream, setEducationalStream] = useState("");

  // Fetch user profile
  useEffect(() => {
    fetchProfile();
    fetchAllocations();
    fetchSkills();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");


      const response = await authenticatedFetch("/api/auth/me", {
        headers: {
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      console.log("[Profile] User data:", data);

      setProfile(data);
      setResumeUrl(data.resume_url || "");
      setCollege(data.college || "");
      setDegree(data.degree || "");
      setEducationalStream(data.educational_stream || "");
    } catch (err) {
      console.error("[Profile] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      setAllocationsLoading(true);

      const response = await authenticatedFetch(
        `/api/allocations?employee_id=${user?.id}&limit=100`,
        {
        },
      );

      if (response.ok) {
        const data = await response.json();
        setAllocations(data.allocations || []);
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
    } finally {
      setAllocationsLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      setSkillsLoading(true);

      const response = await authenticatedFetch(`/api/employee-skills?emp_id=${user?.id}`, {
      });

      if (response.ok) {
        const data = await response.json();
        setSkills(data.employee_skills || []);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setSkillsLoading(false);
    }
  };
  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");

    try {

      const response = await authenticatedFetch("/api/employees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: profile?.id,
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

      toast.success("Profile updated successfully");
      setIsEditing(false);
      fetchProfile(); // Refresh profile data
    } catch (err) {
      console.error("Error updating profile:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setResumeUrl(profile?.resume_url || "");
    setCollege(profile?.college || "");
    setDegree(profile?.degree || "");
    setEducationalStream(profile?.educational_stream || "");
    setIsEditing(false);
  };

  // Separate allocations into current and past
  const today = new Date();
  const currentAllocations = allocations.filter((a) => {
    const endDate = a.end_date ? new Date(a.end_date) : null;
    return !endDate || endDate >= today;
  });

  const pastAllocations = allocations.filter((a) => {
    const endDate = a.end_date ? new Date(a.end_date) : null;
    return endDate && endDate < today;
  });

  if (loading) {
    return <LoadingPage />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Failed to load profile"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">My Profile</h1>
              <p className="text-muted-foreground mt-1">
                View and manage your professional profile
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="projects">
              <Briefcase className="h-4 w-4 mr-2" />
              Projects & Allocations
            </TabsTrigger>
            <TabsTrigger value="skills">
              <GraduationCap className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            {user?.employee_role === "hr_executive" && (
              <>
                <TabsContent value="departments">
                  <Building2 className="h-4 w-4 mr-2" />
                  Departments
                </TabsContent>
                <TabsContent value="clients">
                  <Users className="h-4 w-4 mr-2" />
                  Clients
                </TabsContent>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Read-only Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your basic account details (read-only)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Employee Code
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.employee_code}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      LDAP Username
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.ldap_username}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Full Name
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.full_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Email
                    </Label>
                    <p className="text-sm font-medium mt-1">{profile.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Employee Type
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.employee_type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Role
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.employee_role}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Designation
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.employee_design}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Location
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {profile.working_location}
                    </p>
                  </div>
                  {profile.reporting_manager_name && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Reporting Manager
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {profile.reporting_manager_name}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Status
                    </Label>
                    <p className="text-sm font-medium mt-1">{profile.status}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Joined On
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {new Date(profile.joined_on).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>
                  Update your professional details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="resume_url">Resume URL</Label>
                  <Input
                    id="resume_url"
                    type="url"
                    placeholder="https://example.com/resume.pdf"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="college">College/University</Label>
                  <Input
                    id="college"
                    type="text"
                    placeholder="e.g., MIT, Stanford"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="degree">Degree</Label>
                  <Input
                    id="degree"
                    type="text"
                    placeholder="e.g., B.S. Computer Science"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educational_stream">Educational Stream</Label>
                  <Input
                    id="educational_stream"
                    type="text"
                    placeholder="e.g., Computer Science, IT, Electronics"
                    value={educationalStream}
                    onChange={(e) => setEducationalStream(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab - HR Only */}
          {user?.employee_role === "hr_executive" && (
            <TabsContent value="departments">
              <DepartmentsTab />
            </TabsContent>
          )}

          {/* Clients Tab - HR Only */}
          {user?.employee_role === "hr_executive" && (
            <TabsContent value="clients">
              <ClientsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
