import { Client, Sites } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "http://100.89.46.62:80/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6adc4f50003202881547";
const apiKey = process.env.APPWRITE_API_KEY;

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

if (endpoint.includes("100.89.46.62") || endpoint.includes("172.")) {
  client.addHeader("Host", "appwrite.ravva.su");
  client.addHeader("X-Forwarded-Host", "appwrite.ravva.su");
  client.addHeader("X-Forwarded-Proto", "https");
  client.addHeader("X-Forwarded-Port", "443");
}

const sites = new Sites(client);
const deploymentId = process.argv[2];

async function waitForReady() {
  const deadline = Date.now() + 10 * 60_000;

  while (Date.now() < deadline) {
    const deployment = await sites.getDeployment({ siteId: "codesensei", deploymentId });
    console.log(`status=${deployment.status} buildDuration=${deployment.buildDuration ?? "-"}`);

    if (deployment.status === "ready") {
      console.log("DEPLOYMENT READY");
      return true;
    }
    if (deployment.status === "failed") {
      console.log("DEPLOYMENT FAILED");
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  console.log("DEPLOYMENT TIMEOUT");
  return false;
}

waitForReady()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((error) => {
    console.error("Poll failed:", error.message);
    process.exit(1);
  });
