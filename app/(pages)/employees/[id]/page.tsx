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
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  Building2,
  User,
  GraduationCap,
  FileText,
  Pencil,
} from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

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

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute>
      <EmployeeProfileContent />
    </ProtectedRoute>
  );
}

function EmployeeProfileContent() {
  const params = useParams();
  const employeeId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const isHR = user?.employee_role === "hr_executive";
  const isOwnProfile = user?.id === employeeId;

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch(
        `/api/employees?action=get&id=${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You don't have permission to view this employee");
          router.push("/employees");
          return;
        }
        throw new Error("Failed to fetch employee details");
      }

      const data = await response.json();
      setEmployee(data);
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee details");
      router.push("/employees");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/employees")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{employee.full_name}</h1>
              <p className="text-muted-foreground mt-1">
                {employee.employee_design}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={employee.status === "ACTIVE" ? "default" : "secondary"}
              >
                {employee.status}
              </Badge>
              {isHR && employee.status === "ACTIVE" && (
                <Button
                  onClick={() => router.push(`/employees/${employeeId}/edit`)}
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
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Employee Code
                      </p>
                      <p className="font-medium">{employee.employee_code}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        LDAP Username
                      </p>
                      <p className="font-medium">{employee.ldap_username}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{employee.email}</p>
                    </div>
                  </div>

                  {employee.gender && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium">{employee.gender}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Employee Type
                      </p>
                      <p className="font-medium">{employee.employee_type}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="font-medium">
                        {employee.employee_role.replace("_", " ").toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{employee.working_location}</p>
                    </div>
                  </div>

                  {employee.department_name && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Department
                        </p>
                        <p className="font-medium">
                          {employee.department_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {employee.reporting_manager_name && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Reporting Manager
                        </p>
                        <p className="font-medium">
                          {employee.reporting_manager_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {employee.experience_years !== null &&
                    employee.experience_years !== undefined && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Experience
                          </p>
                          <p className="font-medium">
                            {employee.experience_years} years
                          </p>
                        </div>
                      </div>
                    )}

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Joined On</p>
                      <p className="font-medium">
                        {new Date(employee.joined_on).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {employee.exited_on && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Exited On
                        </p>
                        <p className="font-medium">
                          {new Date(employee.exited_on).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Education Details */}
            {(employee.college ||
              employee.degree ||
              employee.educational_stream) && (
              <Card>
                <CardHeader>
                  <CardTitle>Education</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.college && (
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            College/University
                          </p>
                          <p className="font-medium">{employee.college}</p>
                        </div>
                      </div>
                    )}

                    {employee.degree && (
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Degree
                          </p>
                          <p className="font-medium">{employee.degree}</p>
                        </div>
                      </div>
                    )}

                    {employee.educational_stream && (
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Stream/Major
                          </p>
                          <p className="font-medium">
                            {employee.educational_stream}
                          </p>
                        </div>
                      </div>
                    )}

                    {employee.resume_url && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Resume
                          </p>
                          <a
                            href={employee.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            View Resume
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quick Links */}
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
                  onClick={() => router.push("/allocations")}
                >
                  View Allocations
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/logs")}
                >
                  View Work Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/reports")}
                >
                  View Reports
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/skills")}
                >
                  View Skills
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/tasks")}
                >
                  View Tasks
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
