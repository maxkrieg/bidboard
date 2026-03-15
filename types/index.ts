export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ProjectStatus = "active" | "archived";
export type CollaboratorStatus = "pending" | "accepted";

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  location: string;
  target_budget: number | null;
  target_date: string | null;
  status: ProjectStatus;
  created_at: string;
}

export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string | null;
  invited_email: string;
  status: CollaboratorStatus;
  created_at: string;
}

export interface CollaboratorWithUser extends ProjectCollaborator {
  users: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface ProjectWithMeta extends Project {
  collaborators: CollaboratorWithUser[];
  bid_count: number;
}
