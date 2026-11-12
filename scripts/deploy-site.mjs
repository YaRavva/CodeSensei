import { Client, Sites } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const sites = new Sites(client);

sites
  .createDeployment({
    siteId: "codesensei",
    code: InputFile.fromPath("C:/Users/ravva/CodeSensei-deploy.tar.gz", "CodeSensei-deploy.tar.gz"),
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
