import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const from = process.env.FROM_EMAIL!;
const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  projectName: string,
  token: string
): Promise<void> {
  const inviteUrl = `${appUrl}/invite?token=${token}`;
  try {
    console.log("[resend] sendInviteEmail to:", to, "inviteUrl:", inviteUrl);
    const result = await resend.emails.send({
      from,
      to,
      subject: `${inviterName} invited you to collaborate on "${projectName}"`,
      html: `
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to collaborate on the project <strong>"${projectName}"</strong> in BidBoard.</p>
        <p><a href="${inviteUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invite</a></p>
        <p>This link expires in 7 days.</p>
        <p>If you weren't expecting this invitation, you can ignore this email.</p>
      `,
    });
    console.log("[resend] sendInviteEmail result:", result);
  } catch (err) {
    console.error("[resend] sendInviteEmail error:", err);
  }
}

export async function sendBidAddedEmail(
  to: string[],
  adderName: string,
  projectName: string,
  contractorName: string,
  amount: string,
  bidUrl: string
): Promise<void> {
  if (to.length === 0) return;
  try {
    await resend.emails.send({
      from,
      to,
      subject: `New bid added to "${projectName}"`,
      html: `
        <p>${adderName} added a new bid from <strong>${contractorName}</strong> for <strong>$${Number(amount).toLocaleString()}</strong> on the project <strong>"${projectName}"</strong>.</p>
        <p><a href="${bidUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Bid</a></p>
      `,
    });
  } catch (err) {
    console.error("[resend] sendBidAddedEmail error:", err);
  }
}

export async function sendCommentAddedEmail(
  to: string[],
  commenterName: string,
  projectName: string,
  excerpt: string,
  commentUrl: string
): Promise<void> {
  if (to.length === 0) return;
  try {
    await resend.emails.send({
      from,
      to,
      subject: `New comment on "${projectName}"`,
      html: `
        <p><strong>${commenterName}</strong> posted a comment on a bid in <strong>"${projectName}"</strong>:</p>
        <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${excerpt}</blockquote>
        <p><a href="${commentUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Comment</a></p>
      `,
    });
  } catch (err) {
    console.error("[resend] sendCommentAddedEmail error:", err);
  }
}

export async function sendMessageAddedEmail(
  to: string[],
  senderName: string,
  projectName: string,
  excerpt: string,
  projectUrl: string
): Promise<void> {
  if (to.length === 0) return;
  try {
    await resend.emails.send({
      from,
      to,
      subject: `New message in "${projectName}"`,
      html: `
        <p><strong>${senderName}</strong> sent a message in <strong>"${projectName}"</strong>:</p>
        <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${excerpt}</blockquote>
        <p><a href="${projectUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Messages</a></p>
      `,
    });
  } catch (err) {
    console.error("[resend] sendMessageAddedEmail error:", err);
  }
}

export async function sendAnalysisReadyEmail(
  to: string[],
  projectName: string,
  projectUrl: string
): Promise<void> {
  if (to.length === 0) return;
  try {
    await resend.emails.send({
      from,
      to,
      subject: `AI analysis ready for "${projectName}"`,
      html: `
        <p>The AI bid analysis for <strong>"${projectName}"</strong> is ready. Review the summary, highlights, and red flags for each bid.</p>
        <p><a href="${projectUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Analysis</a></p>
      `,
    });
  } catch (err) {
    console.error("[resend] sendAnalysisReadyEmail error:", err);
  }
}
