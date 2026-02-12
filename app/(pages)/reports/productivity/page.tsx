"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeeklyEmployee {
  emp_id: string;
  employee_code: string;
  full_name: string;
  total_hours: number;
  billable_hours: number;
  projects_count: number;
}

interface WeeklyData {
  week_start: string;
  week_end: string;
  employees: WeeklyEmployee[];
}

export default function TeamProductivityPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range defaults (last 8 weeks)
  const getDefaultDates = () => {
    const today = new Date();
    const end = today.toISOString().split("T")[0];
    const start = new Date(today.setDate(today.getDate() - 56))
      .toISOString()
      .split("T")[0];
    return { start, end };
  };

  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);

  // Check access - only HR and PM allowed
  useEffect(() => {
    if (authLoading) return;

    if (
      !user ||
      (user.employee_role !== "hr_executive" &&
        user.employee_role !== "project_manager")
    ) {
      router.push("/tasks");
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchProductivityData();
  }, [startDate, endDate, authLoading, user]);

  const fetchProductivityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      const response = await fetch(
        `/api/dashboard/team/productivity?${params.toString()}`,
        { headers },
      );

      if (response.ok) {
        const data = await response.json();
        setWeeklyData(data.weekly_data || []);
        setSelectedWeek(0);
      } else {
        setError("Failed to load productivity data");
      }
    } catch (err) {
      console.error("Error fetching productivity data:", err);
      setError("Failed to load productivity data");
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  // Prepare chart data
  const chartData = weeklyData.map((week, index) => {
    const totalHours = week.employees.reduce(
      (sum, emp) => sum + emp.total_hours,
      0,
    );
    const billableHours = week.employees.reduce(
      (sum, emp) => sum + emp.billable_hours,
      0,
    );
    const nonBillableHours = totalHours - billableHours;

    return {
      week: `Week ${index + 1}`,
      dateRange: formatDateRange(week.week_start, week.week_end),
      totalHours: parseFloat(totalHours.toFixed(1)),
      billableHours: parseFloat(billableHours.toFixed(1)),
      nonBillableHours: parseFloat(nonBillableHours.toFixed(1)),
      employeeCount: week.employees.length,
    };
  });

  // Calculate totals
  const totalTeamHours = chartData.reduce(
    (sum, week) => sum + week.totalHours,
    0,
  );
  const totalBillableHours = chartData.reduce(
    (sum, week) => sum + week.billableHours,
    0,
  );
  const billablePercentage =
    totalTeamHours > 0
      ? ((totalBillableHours / totalTeamHours) * 100).toFixed(1)
      : "0";

  const currentWeek = weeklyData[selectedWeek];
  const avgHoursPerEmployee = currentWeek
    ? (
        currentWeek.employees.reduce((sum, emp) => sum + emp.total_hours, 0) /
        currentWeek.employees.length
      ).toFixed(1)
    : "0";

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-2">
                Team Productivity
              </h1>
              <div className="flex items-center gap-2 text-white/90">
                <BarChart3 className="h-4 w-4" />
                <p className="text-sm font-medium">
                  Weekly team performance and hours tracking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchProductivityData} className="w-full">
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Hours
                      </p>
                      <p className="text-2xl font-bold">
                        {totalTeamHours.toFixed(1)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Billable Hours
                      </p>
                      <p className="text-2xl font-bold">
                        {totalBillableHours.toFixed(1)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Billable %
                      </p>
                      <p className="text-2xl font-bold">
                        {billablePercentage}%
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-violet-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg Hours/Emp
                      </p>
                      <p className="text-2xl font-bold">
                        {avgHoursPerEmployee}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Trend Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Weekly Hours Trend</CardTitle>
                <CardDescription>
                  Billable vs Non-Billable hours over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No data available for selected period
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold mb-2">
                                  {data.dateRange}
                                </p>
                                <div className="space-y-1 text-sm">
                                  <p className="text-emerald-600">
                                    Billable: {data.billableHours}h
                                  </p>
                                  <p className="text-amber-600">
                                    Non-Billable: {data.nonBillableHours}h
                                  </p>
                                  <p className="font-medium">
                                    Total: {data.totalHours}h
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="billableHours"
                        name="Billable Hours"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="nonBillableHours"
                        name="Non-Billable Hours"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Week Selector and Employee Details */}
            {weeklyData.length > 0 && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Select Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {weeklyData.map((week, index) => (
                        <Button
                          key={index}
                          variant={
                            selectedWeek === index ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedWeek(index)}
                        >
                          Week {index + 1}
                          <br />
                          <span className="text-xs">
                            {formatDateRange(week.week_start, week.week_end)}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Employee Details for Selected Week */}
                {currentWeek && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Team Members - Week {selectedWeek + 1}
                      </CardTitle>
                      <CardDescription>
                        {formatDateRange(
                          currentWeek.week_start,
                          currentWeek.week_end,
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currentWeek.employees.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No employee data for this week
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Total Hours
                                </TableHead>
                                <TableHead className="text-right">
                                  Billable Hours
                                </TableHead>
                                <TableHead className="text-right">
                                  Projects
                                </TableHead>
                                <TableHead className="text-right">
                                  Billable %
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentWeek.employees.map((emp) => {
                                const billablePerc =
                                  emp.total_hours > 0
                                    ? (
                                        (emp.billable_hours / emp.total_hours) *
                                        100
                                      ).toFixed(0)
                                    : "0";
                                return (
                                  <TableRow key={emp.emp_id}>
                                    <TableCell className="font-medium">
                                      {emp.employee_code}
                                    </TableCell>
                                    <TableCell>{emp.full_name}</TableCell>
                                    <TableCell className="text-right">
                                      {emp.total_hours.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {emp.billable_hours.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {emp.projects_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge
                                        variant={
                                          parseInt(billablePerc) >= 75
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {billablePerc}%
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
