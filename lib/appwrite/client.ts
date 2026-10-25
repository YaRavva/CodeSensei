import { Account, Client, TablesDB, Users } from "node-appwrite";
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  assertAppwriteConfig,
} from "@/lib/appwrite/config";

let adminClient: Client | null = null;

/** Server SDK client with an API key. Bypasses table/row permissions. */
export function getAdminClient(): Client {
  if (adminClient) return adminClient;

  assertAppwriteConfig();

  adminClient = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY as string);

  // If using internal direct IP/proxy, ensure correct Host & Proto headers are set
  if (APPWRITE_ENDPOINT.includes("100.89.46.62") || APPWRITE_ENDPOINT.includes("172.")) {
    adminClient.addHeader("Host", "appwrite.ravva.su");
    adminClient.addHeader("X-Forwarded-Proto", "https");
  }

  return adminClient;
}

/** TablesDB service backed by the admin client. */
export function getTablesDB(): TablesDB {
  return new TablesDB(getAdminClient());
}

export function getAdminAccount(): Account {
  return new Account(getAdminClient());
}

/**
 * Account bound to the PUBLIC Appwrite endpoint, used only for generating
 * OAuth2 provider URLs. Appwrite builds the provider redirect_uri from the
 * host it sees; when reached via the internal Tailscale/docker endpoint it
 * emits callback URLs on the private IP (e.g. https://100.89.46.62/...),
 * which external providers (GitHub) reject. Going through the public domain
 * makes Appwrite emit https://appwrite.ravva.su/... callbacks instead.
 * Server-only; the API key never reaches the browser.
 */
export function getOAuthAdminAccount(): Account {
  assertAppwriteConfig();

  // The OAuth2 token request must reach Appwrite through its PUBLIC domain.
  // Appwrite renders the provider redirect_uri from the host it sees; when
  // asked via an internal/Tailscale endpoint it emits callback URLs on the
  // private IP (e.g. https://100.89.46.62/...), which external providers
  // (GitHub, Google) reject because the registered callback is on
  // appwrite.ravva.su. Prefer an explicit OAuth endpoint, then any public
  // Appwrite URL from the env, and finally fall back to the known public
  // domain of this deployment.
  const candidate =
    process.env.APPWRITE_OAUTH_ENDPOINT ??
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
    process.env.APPWRITE_ENDPOINT ??
    "";

  const isPublicAppwrite =
    candidate.startsWith("https://") && candidate.includes("appwrite.ravva.su");

  const publicEndpoint = isPublicAppwrite
    ? candidate
    : process.env.APPWRITE_OAUTH_ENDPOINT || "https://appwrite.ravva.su/v1";

  const client = new Client()
    .setEndpoint(publicEndpoint)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY as string);

  // Belt-and-suspenders: keep the URL builder on the public domain even if a
  // proxy would otherwise rewrite the host back to an internal address.
  if (!publicEndpoint.includes("appwrite.ravva.su")) {
    client.addHeader("Host", "appwrite.ravva.su");
    client.addHeader("X-Forwarded-Proto", "https");
  }

  return new Account(client);
}

export function getAdminUsers(): Users {
  return new Users(getAdminClient());
}

/** Client that acts on behalf of a user session (no API key). */
export function getSessionClient(secret: string): Client {
  assertAppwriteConfig();

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setSession(secret);

  if (APPWRITE_ENDPOINT.includes("100.89.46.62") || APPWRITE_ENDPOINT.includes("172.")) {
    client.addHeader("Host", "appwrite.ravva.su");
    client.addHeader("X-Forwarded-Proto", "https");
  }

  return client;
}

export function getSessionAccount(secret: string): Account {
  return new Account(getSessionClient(secret));
}
