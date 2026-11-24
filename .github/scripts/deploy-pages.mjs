import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Use the uploader's exact artifact ID instead of the artifact name lookup,
// which can return missing or duplicate uploads during Pages deployments.
export async function deployPages(env = process.env, request = fetch, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  const artifactId = env.PAGES_ARTIFACT_ID;
  if (!/^\d+$/.test(artifactId || "")) throw new Error("Missing Pages artifact ID from the upload step.");
  const api = env.GITHUB_API_URL || "https://api.github.com";
  const repository = env.GITHUB_REPOSITORY;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "wedding-wardrobe-pages-deployment"
  };

  async function json(url, options) {
    const response = await request(url, options);
    if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}) at ${new URL(url).pathname}.`);
    return response.json();
  }

  const identity = await json(env.ACTIONS_ID_TOKEN_REQUEST_URL, {
    headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }
  });
  if (!identity.value) throw new Error("GitHub did not issue a deployment identity token.");

  const deployment = await json(`${api}/repos/${repository}/pages/deployments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      artifact_id: Number(artifactId),
      pages_build_version: env.GITHUB_SHA,
      oidc_token: identity.value
    })
  });
  const deploymentId = deployment.id || deployment.status_url?.split("/").pop();
  if (!deploymentId) throw new Error("GitHub did not return a deployment ID.");
  console.log(`Created Pages deployment ${deploymentId} from artifact ${artifactId}.`);

  for (let attempt = 0; attempt < 120; attempt++) {
    await pause(5000);
    const result = await json(`${api}/repos/${repository}/pages/deployments/${deploymentId}`, { headers });
    if (result.status === "succeed") {
      if (deployment.page_url && env.GITHUB_OUTPUT) {
        appendFileSync(env.GITHUB_OUTPUT, `page_url=${deployment.page_url}\n`);
      }
      console.log("GitHub Pages deployment succeeded.");
      return deployment;
    }
    if (["deployment_failed", "deployment_content_failed", "deployment_cancelled", "deployment_lost"].includes(result.status)) {
      throw new Error(`GitHub Pages deployment ended with status ${result.status}.`);
    }
  }
  throw new Error("Timed out waiting for GitHub Pages deployment.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deployPages().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
