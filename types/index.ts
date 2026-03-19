export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ProjectStatus = "active" | "archived";
export type CollaboratorStatus = "pending" | "accepted";
export type BidStatus = "pending" | "accepted" | "rejected";

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

export interface Contractor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  address: string | null;
  bbb_rating: string | null;
  bbb_accredited: boolean | null;
  license_number: string | null;
  license_status: string | null;
  enriched_at: string | null;
  created_at: string;
}

export interface BidLineItem {
  id: string;
  bid_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  created_at: string;
}

export interface BidDocument {
  id: string;
  bid_id: string;
  filename: string;
  storage_path: string;
  created_at: string;
}

export interface Bid {
  id: string;
  project_id: string;
  contractor_id: string;
  total_price: number;
  bid_date: string;
  expiry_date: string | null;
  estimated_days: number | null;
  notes: string | null;
  status: BidStatus;
  created_at: string;
}

export interface BidWithMeta extends Bid {
  contractor: Contractor;
  line_items: BidLineItem[];
  documents: BidDocument[];
}

export interface ProjectWithMeta extends Project {
  collaborators: CollaboratorWithUser[];
  bid_count: number;
  bids: BidWithMeta[];
}

export interface BidAnalysisBid {
  bid_id: string;
  contractor_name: string;
  highlights: string[];
  red_flags: string[];
  questions: string[];
}

export interface BidAnalysis {
  summary: string;
  bids: BidAnalysisBid[];
}

export interface BidAnalysisRecord {
  id: string;
  project_id: string;
  summary: string;
  analysis: BidAnalysisBid[];
  created_at: string;
}
