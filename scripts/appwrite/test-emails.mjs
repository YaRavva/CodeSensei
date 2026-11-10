/**
 * Smoke-test the auth emails (verification + recovery) against the live
 * Appwrite instance. Sends ONLY to the designated test address and restores
 * the account's verification state afterwards.
 *
 * Usage:
 *   pnpm appwrite:test-emails
 */

import { Account, Client, Query, Users } from "node-appwrite";

const TEST_EMAIL = "ya.ravva@yandex.ru";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://codesensei.ravva.su";

const required = ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const adminClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(adminClient);
const adminAccount = new Account(adminClient);

async function main() {
  const list = await users.list([Query.equal("email", TEST_EMAIL)]);
  const user = list.users[0];
  if (!user) {
    console.error(`Test user ${TEST_EMAIL} not found`);
    process.exit(1);
  }
  console.log(`Test user: ${user.$id} (emailVerification=${user.emailVerification})`);

  // 1. Recovery email — uses the custom `recovery` template.
  await adminAccount.createRecovery({
    email: TEST_EMAIL,
    url: `${SITE_URL}/reset-password`,
  });
  console.log(`+ recovery email queued -> ${TEST_EMAIL}`);

  // 2. Verification email — createEmailVerification needs a user session,
  //    so mint a short-lived one via the admin API. If the account is already
  //    verified, temporarily flip the flag and restore it after sending.
  const wasVerified = user.emailVerification;
  let session = null;
  try {
    if (wasVerified) {
      await users.updateEmailVerification({ userId: user.$id, emailVerification: false });
    }
    session = await users.createSession({ userId: user.$id });
    const sessionClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setSession(session.secret);
    await new Account(sessionClient).createEmailVerification({
      url: `${SITE_URL}/verify-email`,
    });
    console.log(`+ verification email queued -> ${TEST_EMAIL}`);
  } finally {
    if (session) {
      await users
        .deleteSession({ userId: user.$id, sessionId: session.$id })
        .catch(() => undefined);
    }
    if (wasVerified) {
      await users.updateEmailVerification({ userId: user.$id, emailVerification: true });
      console.log("  emailVerification restored to true");
    }
  }

  console.log("\nDone. Check the inbox (and Spam) of the test address.");
}

main().catch((error) => {
  console.error(`\nEmail test failed: ${error.type ?? ""} ${error.message ?? error}`);
  process.exit(1);
});