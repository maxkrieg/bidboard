import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { searchContractorCandidates } from "@/lib/google-places";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const location = searchParams.get("location")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ candidates: [] });
  }

  const candidates = await searchContractorCandidates(q, location);
  return NextResponse.json({ candidates });
}
