"use client";

import { useActionState } from "react";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, Project } from "@/types";

const initialState: ActionResult<Project> | null = null;

export function ProjectForm() {
  const [state, formAction, isPending] = useActionState(
    createProject,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.success && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Kitchen Renovation"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          name="location"
          required
          placeholder="Austin, TX"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Brief description of the work..."
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="target_date">Target Date</Label>
          <Input id="target_date" name="target_date" type="date" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {isPending ? "Creating…" : "Create Project"}
      </Button>
    </form>
  );
}
