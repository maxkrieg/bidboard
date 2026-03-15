import Link from "next/link";
import { MapPin, Calendar, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project & {
    bid_count: { count: number }[];
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const bidCount = project.bid_count?.[0]?.count ?? 0;

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="border border-zinc-200 bg-white hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-zinc-900 leading-tight">
              {project.name}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {bidCount} {bidCount === 1 ? "bid" : "bids"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-zinc-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
          {project.target_budget !== null && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="size-3.5 shrink-0" />
              <span>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(project.target_budget)}
              </span>
            </div>
          )}
          {project.target_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              <span>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(project.target_date))}
              </span>
            </div>
          )}
          {project.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 pt-1">
              {project.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
