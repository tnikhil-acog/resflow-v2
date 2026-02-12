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
  proficiency_level: string;
  status: string;
  approved_at?: string;
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
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

  useEffect(() => {
    fetchProfile();
    fetchAllocations();
    fetchSkills();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch profile");

      const data = await response.json();
      setProfile(data);
      setResumeUrl(data.resume_url || "");
      setCollege(data.college || "");
      setDegree(data.degree || "");
      setEducationalStream(data.educational_stream || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      setAllocationsLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/allocations?employee_id=${user?.id}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } },
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
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/employee-skills?emp_id=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Not authenticated");

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
      setIsEditing(false);
      fetchProfile();
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
    setResumeUrl(profile?.resume_url || "");
    setCollege(profile?.college || "");
    setDegree(profile?.degree || "");
    setEducationalStream(profile?.educational_stream || "");
    setIsEditing(false);
  };

  // Separate allocations
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1600px] mx-auto p-6 min-w-0">
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
                        {profile.full_name
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
                    {profile.full_name}
                  </h2>
                  <p className="text-base text-muted-foreground font-medium mb-3">
                    {profile.employee_design}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{profile.employee_code}</span>
                  </div>
                </div>

                <Separator />

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="text-2xl font-bold text-primary">
                      {profile.experience_years}
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
                      {profile.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {profile.department_name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {profile.working_location}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Joined{" "}
                      {new Date(profile.joined_on).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      profile.status === "ACTIVE" ? "success" : "secondary"
                    }
                    className="text-xs px-3 py-1"
                  >
                    {profile.status}
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
                {user?.employee_role === "hr_executive" && (
                  <>
                    <TabsTrigger
                      value="departments"
                      className="gap-2 px-6 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="font-semibold">Departments</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="clients"
                      className="gap-2 px-6 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
                    >
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">Clients</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Combined Information Card */}
                <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-card/50">
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">
                          Profile Information
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Personal and employment details
                        </p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Employee Code
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.employee_code}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Full Name
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.full_name}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Email Address
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {profile.email}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          LDAP Username
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.ldap_username}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Employee Type
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.employee_type}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Role
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.employee_role
                            .replace("_", " ")
                            .toUpperCase()}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Designation
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.employee_design}
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Location
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.working_location}
                        </p>
                      </div>
                      {profile.department_name && (
                        <div className="group">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                            Department
                          </p>
                          <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {profile.department_name}
                          </p>
                        </div>
                      )}
                      {profile.reporting_manager_name && (
                        <div className="group">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                            Reporting Manager
                          </p>
                          <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {profile.reporting_manager_name}
                          </p>
                        </div>
                      )}
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Experience
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile.experience_years} years
                        </p>
                      </div>
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Joined On
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {new Date(profile.joined_on).toLocaleDateString(
                            "en-US",
                            { month: "short", year: "numeric" },
                          )}
                        </p>
                      </div>
                      {profile.gender && (
                        <div className="group">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                            Gender
                          </p>
                          <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {profile.gender}
                          </p>
                        </div>
                      )}
                      <div className="group">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                          Status
                        </p>
                        <Badge
                          variant={
                            profile.status === "ACTIVE"
                              ? "success"
                              : "secondary"
                          }
                          className="text-xs px-3 py-0.5 font-bold"
                        >
                          {profile.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Editable Professional Information */}
                <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-card/50">
                  <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent p-5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center ring-2 ring-violet-500/10">
                          <GraduationCap className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">
                            Professional Information
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Educational background and credentials
                          </p>
                        </div>
                      </div>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="shrink-0 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-5">
                    {error && (
                      <Alert
                        variant="destructive"
                        className="border-none shadow-md"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="resume_url"
                          className="text-xs font-bold uppercase tracking-wider"
                        >
                          Resume URL
                        </Label>
                        {isEditing ? (
                          <Input
                            id="resume_url"
                            type="url"
                            placeholder="https://example.com/resume.pdf"
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            className="h-10 text-sm"
                          />
                        ) : (
                          <div className="h-10 flex items-center px-3 rounded-lg border bg-muted/50">
                            {profile.resume_url ? (
                              <a
                                href={profile.resume_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm truncate font-semibold"
                              >
                                {profile.resume_url}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Not provided
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="college"
                          className="text-xs font-bold uppercase tracking-wider"
                        >
                          College/University
                        </Label>
                        {isEditing ? (
                          <Input
                            id="college"
                            type="text"
                            placeholder="e.g., MIT, Stanford"
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            className="h-10 text-sm"
                          />
                        ) : (
                          <div className="h-10 flex items-center px-3 rounded-lg border bg-muted/50">
                            <span className="text-sm font-semibold truncate">
                              {profile.college || (
                                <span className="text-muted-foreground">
                                  Not provided
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="degree"
                          className="text-xs font-bold uppercase tracking-wider"
                        >
                          Degree
                        </Label>
                        {isEditing ? (
                          <Input
                            id="degree"
                            type="text"
                            placeholder="e.g., B.S. Computer Science"
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                            className="h-10 text-sm"
                          />
                        ) : (
                          <div className="h-10 flex items-center px-3 rounded-lg border bg-muted/50">
                            <span className="text-sm font-semibold truncate">
                              {profile.degree || (
                                <span className="text-muted-foreground">
                                  Not provided
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="educational_stream"
                          className="text-xs font-bold uppercase tracking-wider"
                        >
                          Educational Stream
                        </Label>
                        {isEditing ? (
                          <Input
                            id="educational_stream"
                            type="text"
                            placeholder="e.g., Computer Science, IT"
                            value={educationalStream}
                            onChange={(e) =>
                              setEducationalStream(e.target.value)
                            }
                            className="h-10 text-sm"
                          />
                        ) : (
                          <div className="h-10 flex items-center px-3 rounded-lg border bg-muted/50">
                            <span className="text-sm font-semibold truncate">
                              {profile.educational_stream || (
                                <span className="text-muted-foreground">
                                  Not provided
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          size="sm"
                          className="shadow-md hover:shadow-lg transition-shadow"
                        >
                          {saving ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="shadow-sm hover:shadow-md transition-shadow"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Projects & Allocations Tab */}
              <TabsContent value="projects" className="space-y-6">
                {/* Current Allocations */}
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Current Projects ({currentAllocations.length})
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Total Allocation: {totalCurrentAllocation}%
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {allocationsLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : currentAllocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No current allocations
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Allocation</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Billable</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentAllocations.map((allocation) => (
                            <TableRow
                              key={allocation.id}
                              className="cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/projects/${allocation.project_id}`,
                                )
                              }
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {allocation.project_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {allocation.project_code}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{allocation.role}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Percent className="h-4 w-4 text-muted-foreground" />
                                  {allocation.allocation_percentage}%
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(
                                    allocation.start_date,
                                  ).toLocaleDateString()}
                                  {allocation.end_date && (
                                    <>
                                      {" "}
                                      -{" "}
                                      {new Date(
                                        allocation.end_date,
                                      ).toLocaleDateString()}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    allocation.is_billable
                                      ? "success"
                                      : "secondary"
                                  }
                                >
                                  {allocation.is_billable
                                    ? "Billable"
                                    : "Non-Billable"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Past Allocations */}
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Past Projects ({pastAllocations.length})
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Completed project assignments
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {allocationsLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : pastAllocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No past allocations
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Allocation</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Billable</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastAllocations.map((allocation) => (
                            <TableRow
                              key={allocation.id}
                              className="cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/projects/${allocation.project_id}`,
                                )
                              }
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {allocation.project_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {allocation.project_code}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{allocation.role}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Percent className="h-4 w-4 text-muted-foreground" />
                                  {allocation.allocation_percentage}%
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(
                                    allocation.start_date,
                                  ).toLocaleDateString()}
                                  {allocation.end_date && (
                                    <>
                                      {" "}
                                      -{" "}
                                      {new Date(
                                        allocation.end_date,
                                      ).toLocaleDateString()}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    allocation.is_billable
                                      ? "success"
                                      : "secondary"
                                  }
                                >
                                  {allocation.is_billable
                                    ? "Billable"
                                    : "Non-Billable"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          My Skills ({skills.length})
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Your approved and pending skills
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {skillsLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : skills.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          No skills added yet
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => router.push("/skills")}
                        >
                          Browse Skills
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Proficiency</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Approved On</TableHead>
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
                                      : "warning"
                                  }
                                >
                                  {skill.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {skill.approved_at ? (
                                  new Date(
                                    skill.approved_at,
                                  ).toLocaleDateString()
                                ) : (
                                  <span className="text-muted-foreground">
                                    Pending
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* HR Tabs */}
              {user?.employee_role === "hr_executive" && (
                <>
                  <TabsContent value="departments" className="space-y-6">
                    <div className="w-full overflow-x-auto">
                      <DepartmentsTab />
                    </div>
                  </TabsContent>
                  <TabsContent value="clients" className="space-y-6">
                    <div className="w-full overflow-x-auto">
                      <ClientsTab />
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
