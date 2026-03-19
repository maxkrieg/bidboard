import { redirect } from "next/navigation";
import { verifyInviteToken } from "@/lib/jwt";
import { createServerClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/actions/collaborators";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          Invalid invite link
        </h1>
        <p className="text-zinc-500">
          This invite link is missing or malformed. Please request a new invite.
        </p>
      </div>
    );
  }

  const payload = await verifyInviteToken(token);

  if (!payload) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          Invite link expired
        </h1>
        <p className="text-zinc-500">
          This invite link has expired or is invalid. Please ask the project
          owner to send a new invite.
        </p>
      </div>
    );
  }

  const { invitedEmail } = payload;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite?token=${encodeURIComponent(token)}`);
  }

  if (user.email?.toLowerCase() !== invitedEmail.toLowerCase()) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          Wrong account
        </h1>
        <p className="text-zinc-500">
          This invite was sent to{" "}
          <span className="font-medium text-zinc-900">{invitedEmail}</span>.
          Please sign in with that email address to accept the invite.
        </p>
      </div>
    );
  }

  const result = await acceptInvite(token);

  if (!result.success) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          Could not accept invite
        </h1>
        <p className="text-zinc-500">{result.error}</p>
      </div>
    );
  }

  redirect(`/projects/${result.data.projectId}`);
}
