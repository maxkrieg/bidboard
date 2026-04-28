import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessRequestEmail } from "@/lib/resend";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Gate access: check user status and notify admin on first sign-in
  const {
    data: { user: authedUser },
  } = await supabase.auth.getUser();
  const isAdmin = authedUser?.email === process.env.ADMIN_EMAIL;

  if (!isAdmin && authedUser) {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("status, notification_sent")
      .eq("id", authedUser.id)
      .single();

    if (profile?.status === "pending") {
      // Auto-approve users who arrived via a project collaborator invite.
      // The handle_new_user trigger already linked and accepted their invite row,
      // so a matching accepted collaborator row means a trusted user invited them.
      const { data: collaboratorRow } = await adminClient
        .from("project_collaborators")
        .select("id")
        .eq("user_id", authedUser.id)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

      if (collaboratorRow) {
        await adminClient
          .from("users")
          .update({ status: "approved", notification_sent: true })
          .eq("id", authedUser.id);
        // Fall through to normal redirect — invite flow proceeds as expected
      } else {
        if (!profile.notification_sent && process.env.ADMIN_EMAIL) {
          await sendAccessRequestEmail(
            process.env.ADMIN_EMAIL,
            authedUser.email!,
            `${origin}/admin`
          );
          await adminClient
            .from("users")
            .update({ notification_sent: true })
            .eq("id", authedUser.id);
        }
        return NextResponse.redirect(new URL("/pending", origin));
      }
    }

    if (profile?.status === "rejected") {
      return NextResponse.redirect(new URL("/rejected", origin));
    }
  }

  // Respect `next` query param for post-login redirect
  const next = searchParams.get("next");
  if (next && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Check for a pending invite token stored before login
  const inviteToken = cookieStore.get("invite_token")?.value;
  if (inviteToken) {
    const response = NextResponse.redirect(
      new URL(`/invite?token=${inviteToken}`, origin)
    );
    // Clear the invite cookie
    response.cookies.set("invite_token", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.redirect(new URL("/dashboard", origin));
}
