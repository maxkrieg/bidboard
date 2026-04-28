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
  isOwner?: boolean;
}

export function ProjectCard({ project, isOwner = true }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="relative overflow-hidden border border-zinc-200 bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
        <div className={`absolute inset-x-0 top-0 h-[3px] ${isOwner ? "bg-indigo-500" : "bg-zinc-300"}`} />
        <CardHeader className="pb-2 pt-5">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-[15px] font-semibold text-zinc-900 leading-tight">
              {project.name}
            </CardTitle>
            <Badge className="shrink-0 text-xs bg-indigo-600 text-white hover:bg-indigo-600 border-0 font-medium tabular-nums">
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
