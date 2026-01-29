"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  User,
  Building2,
  Users,
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

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable fields
  const [resumeUrl, setResumeUrl] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [educationalStream, setEducationalStream] = useState("");

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        console.log("[Settings] Fetching profile...");
        console.log("[Settings] Token exists:", !!token);

        if (!token) {
          console.error("[Settings] No auth token found");
          setError("Not authenticated");
          return;
        }

        console.log("[Settings] Making request to /api/auth/me");
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("[Settings] Response status:", response.status);
        console.log("[Settings] Response ok:", response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Settings] Error response:", errorText);
          throw new Error(
            `Failed to fetch profile: ${response.status} - ${errorText}`,
          );
        }

        const data = await response.json();
        console.log("[Settings] Profile data received:", data);

        const profileData = data.data || data;
        console.log("[Settings] Extracted profile data:", profileData);

        setProfile(profileData);
        setResumeUrl(profileData.resume_url || "");
        setCollege(profileData.college || "");
        setDegree(profileData.degree || "");
        setEducationalStream(profileData.educational_stream || "");

        console.log("[Settings] Profile loaded successfully");
      } catch (err) {
        console.error("[Settings] Error fetching profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Not authenticated");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/employees", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
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
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            {user?.employee_role === "hr_executive" && (
              <>
                <TabsTrigger value="departments">
                  <Building2 className="h-4 w-4 mr-2" />
                  Departments
                </TabsTrigger>
                <TabsTrigger value="clients">
                  <Users className="h-4 w-4 mr-2" />
                  Clients
                </TabsTrigger>
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
