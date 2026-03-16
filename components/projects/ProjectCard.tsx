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
    bid_count: number;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="border border-zinc-200 border-l-2 border-l-indigo-500 bg-white shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-150 cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-zinc-900 leading-tight">
              {project.name}
            </CardTitle>
            <Badge className="shrink-0 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-0">
              {project.bid_count} {project.bid_count === 1 ? "bid" : "bids"}
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
