"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressCardProps {
  title: string;
  description?: string;
  value: number;
  max: number;
  showPercentage?: boolean;
  color?: "default" | "success" | "warning" | "danger";
}

export function ProgressCard({
  title,
  description,
  value,
  max,
  showPercentage = true,
  color = "default",
}: ProgressCardProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const getColorClass = () => {
    switch (color) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "danger":
        return "bg-red-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {value} / {max}
            </span>
            {showPercentage && (
              <span className="font-medium">{percentage.toFixed(0)}%</span>
            )}
          </div>
          <div className="relative">
            <Progress value={percentage} className="h-2" />
            <style jsx>{`
              :global(.progress-indicator) {
                ${getColorClass()}
              }
            `}</style>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
