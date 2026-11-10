import { getAdminAccount, getSessionAccount } from "@/lib/appwrite/client";

export interface VerificationSendResult {
  sent: boolean;
  alreadyVerified: boolean;
}

/**
 * Sends the email-verification link using a short-lived session, because
 * Appwrite's createEmailVerification acts on the signed-in user only. The
 * temporary session is always closed so registration/resend never leaves the
 * caller authenticated.
 */
export async function sendVerificationEmail(
  email: string,
  password: string,
  url: string
): Promise<VerificationSendResult> {
  const session = await getAdminAccount().createEmailPasswordSession({ email, password });
  const account = getSessionAccount(session.secret);

  try {
    const user = await account.get();
    if (user.emailVerification) return { sent: false, alreadyVerified: true };

    await account.createEmailVerification({ url });
    return { sent: true, alreadyVerified: false };
  } catch (error) {
    console.warn("Verification email failed:", error);
    return { sent: false, alreadyVerified: false };
  } finally {
    await account.deleteSession({ sessionId: "current" }).catch(() => undefined);
  }
}
