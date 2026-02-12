"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  List,
  Grid3x3,
  ArrowUpDown,
  Filter,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Task {
  id: string;
  description: string;
  due_on: string;
  status: string;
  entity_type: string;
  entity_id: string;
  owner_name: string;
  assigned_by: string;
  created_at: string;
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"my_tasks" | "assigned_by_me">(
    "my_tasks",
  );
  const router = useRouter();

  // Helper function to get quick action for a task
  const getTaskQuickAction = (task: Task) => {
    if (!task.entity_type || task.status === "COMPLETED") return null;

    // Include task ID in all redirect URLs
    const taskIdParam = `taskId=${task.id}`;

    switch (task.entity_type) {
      case "EMPLOYEE_SKILL":
        if (
          user?.employee_role === "hr_executive" ||
          user?.employee_role === "project_manager"
        ) {
          return {
            label: "Review",
            href: `/approvals?type=skill&${taskIdParam}`,
          };
        }
        break;

      case "DEMAND":
        const isAllocationTask =
          task.description.includes("Allocate resources");
        const isApprovalTask = task.description.includes(
          "Review resource demand",
        );

        if (isApprovalTask && user?.employee_role === "hr_executive") {
          return {
            label: "Review",
            href: `/approvals?type=demand&${taskIdParam}`,
          };
        }

        if (isAllocationTask && user?.employee_role === "hr_executive") {
          return { label: "Allocate", href: `/allocations?${taskIdParam}` };
        }
        break;

      case "DAILY_PROJECT_LOG":
        return { label: "Log Work", href: `/logs?${taskIdParam}` };

      case "REPORT":
        return { label: "Submit Report", href: `/reports?${taskIdParam}` };
    }

    return null;
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, activeTab]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      let url = `/api/tasks?view=${activeTab}`;
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DUE":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredTasks = tasks.filter((task) =>
    task.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        {(user?.employee_role === "project_manager" ||
          user?.employee_role === "hr_executive") && (
          <Link href="/tasks/new">
            <Button className="bg-black text-white hover:bg-black/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </Link>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Pending Tasks
                </p>
                <p className="text-2xl font-semibold">
                  {tasks.filter((t) => t.status === "DUE").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-semibold">
                  {tasks.filter((t) => t.status === "COMPLETED").length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-700"
          onClick={() => router.push("/logs")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  Log Work
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Quick action →
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 hover:border-purple-400 dark:hover:border-purple-700"
          onClick={() => router.push("/reports")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">
                  Submit Report
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Quick action →
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for My Tasks and Tasks I Assigned */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "my_tasks" | "assigned_by_me")
        }
      >
        <TabsList>
          <TabsTrigger value="my_tasks">My Tasks</TabsTrigger>
          {(user?.employee_role === "project_manager" ||
            user?.employee_role === "hr_executive") && (
            <TabsTrigger value="assigned_by_me">Tasks I Assigned</TabsTrigger>
          )}
        </TabsList>

        {/* My Tasks Tab Content */}
        <TabsContent value="my_tasks" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-1 items-center gap-4 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort By
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Due Date</DropdownMenuItem>
                  <DropdownMenuItem>Status</DropdownMenuItem>
                  <DropdownMenuItem>Project</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("DUE")}>
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("COMPLETED")}
                  >
                    Completed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {viewMode === "list" ? (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Task</TableHead>
                      {/* <TableHead>Entity Type</TableHead> */}
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No tasks found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task) => {
                        const quickAction = getTaskQuickAction(task);
                        return (
                          <TableRow key={task.id}>
                            <TableCell>
                              <Checkbox checked={task.status === "COMPLETED"} />
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/tasks/${task.id}`}
                                className="text-sm hover:underline font-medium"
                              >
                                {task.description}
                              </Link>
                            </TableCell>
                            {/* <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {task.entity_type}
                            </Badge>
                          </TableCell> */}
                            <TableCell className="text-sm text-muted-foreground">
                              {task.owner_name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(task.due_on)}
                            </TableCell>
                            <TableCell>{getStatusBadge(task.status)}</TableCell>
                            <TableCell>
                              {quickAction && task.status === "DUE" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(quickAction.href)}
                                  className="h-8"
                                >
                                  {quickAction.label}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No tasks found
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Checkbox checked={task.status === "COMPLETED"} />
                        {getStatusBadge(task.status)}
                      </div>
                      <CardTitle className="text-base mt-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="hover:underline"
                        >
                          {task.description}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Entity Type:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {task.entity_type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Assigned To:
                        </span>
                        <span className="font-medium">{task.owner_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Deadline:</span>
                        <span className="font-medium">
                          {formatDate(task.due_on)}
                        </span>
                      </div>
                      {(() => {
                        const quickAction = getTaskQuickAction(task);
                        return quickAction && task.status === "DUE" ? (
                          <div className="pt-2 border-t">
                            <Button
                              onClick={() => router.push(quickAction.href)}
                              size="sm"
                              className="w-full"
                            >
                              {quickAction.label}
                              <ExternalLink className="ml-2 h-3 w-3" />
                            </Button>
                          </div>
                        ) : null;
                      })()}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Tasks I Assigned Tab Content */}
        <TabsContent value="assigned_by_me" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Tasks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("DUE")}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("COMPLETED")}>
                  Completed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Task Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <span className="font-medium">{task.owner_name}</span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-sm hover:underline"
                          >
                            {task.description}
                          </Link>
                        </TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(task.due_on)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
