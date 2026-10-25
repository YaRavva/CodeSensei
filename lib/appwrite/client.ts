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
