import { Client, Sites } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

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
const archivePath =
  process.env.DEPLOY_ARCHIVE ||
  process.argv[2] ||
  "C:/Users/ravva/CodeSensei-deploy.tar.gz";

console.log(`Uploading deployment archive: ${archivePath}`);

sites
  .createDeployment({
    siteId: "codesensei",
    code: InputFile.fromPath(archivePath, "CodeSensei-deploy.tar.gz"),
    activate: true,
    onProgress: (progress) => console.log("progress:", JSON.stringify(progress).slice(0, 300)),
  })
  .then((deployment) => {
    console.log(`DEPLOYMENT_ID=${deployment.$id}`);
    console.log(`status=${deployment.status}`);
  })
  .catch((error) => {
    console.error("DEPLOY ERROR:", error.message);
    process.exit(1);
  });
