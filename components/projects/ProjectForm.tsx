"use client";

import { useActionState } from "react";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, Project } from "@/types";

const initialState: ActionResult<Project> | null = null;

interface ProjectFormProps {
  project?: Project;
  action?: (
    prev: ActionResult<Project> | null,
    fd: FormData
  ) => Promise<ActionResult<Project>>;
}

export function ProjectForm({ project, action }: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(
    action ?? createProject,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.success && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Kitchen Renovation"
          defaultValue={project?.name}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          name="location"
          required
          placeholder="Austin, TX"
          defaultValue={project?.location}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Brief description of the work..."
          defaultValue={project?.description ?? undefined}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[80px] transition-shadow duration-150"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="target_budget">Target Budget</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
              $
            </span>
            <Input
              id="target_budget"
              name="target_budget"
              type="number"
              min="0"
              step="1"
              placeholder="25000"
              className="pl-7"
              defaultValue={project?.target_budget ?? undefined}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="target_date">Target Date</Label>
          <Input
            id="target_date"
            name="target_date"
            type="date"
            defaultValue={project?.target_date ?? undefined}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? project
            ? "Saving…"
            : "Creating…"
          : project
            ? "Save Changes"
            : "Create Project"}
      </Button>
    </form>
  );
}
