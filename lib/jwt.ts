import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.INVITE_JWT_SECRET!);

export async function signInviteToken(
  projectId: string,
  invitedEmail: string
): Promise<string> {
  return new SignJWT({ projectId, invitedEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyInviteToken(
  token: string
): Promise<{ projectId: string; invitedEmail: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      projectId: payload.projectId as string,
      invitedEmail: payload.invitedEmail as string,
    };
  } catch {
    return null;
  }
}
