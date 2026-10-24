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

  return new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setSession(secret);
}

export function getSessionAccount(secret: string): Account {
  return new Account(getSessionClient(secret));
}
