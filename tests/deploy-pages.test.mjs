import assert from "node:assert/strict";
import { test } from "node:test";
import { deployPages } from "../.github/scripts/deploy-pages.mjs";

const env = {
  PAGES_ARTIFACT_ID: "12345",
  GITHUB_REPOSITORY: "test/repository",
  GITHUB_SHA: "test-commit",
  GITHUB_TOKEN: "test-token",
  ACTIONS_ID_TOKEN_REQUEST_URL: "https://example.test/identity",
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "test-identity"
};

test("deploys the exact uploaded artifact and waits for success", async () => {
  const calls = [];
  const responses = [{ value: "test-oidc" }, { id: "deployment-1" }, { status: "queued" }, { status: "succeed" }];
  await deployPages(env, async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => responses.shift() };
  }, async () => {});
  assert.equal(calls.length, 4);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    artifact_id: 12345,
    pages_build_version: "test-commit",
    oidc_token: "test-oidc"
  });
  assert.ok(calls[2].url.endsWith("/pages/deployments/deployment-1"));
});

test("does not deploy without a valid upload ID", async () => {
  await assert.rejects(() => deployPages({ ...env, PAGES_ARTIFACT_ID: "" }), /Missing Pages artifact ID/);
});

test("reports terminal deployment failures", async () => {
  const responses = [{ value: "test-oidc" }, { id: "deployment-2" }, { status: "deployment_content_failed" }];
  await assert.rejects(() => deployPages(env, async () => ({
    ok: true, json: async () => responses.shift()
  }), async () => {}), /deployment_content_failed/);
});

test("reports API errors without leaking tokens", async () => {
  await assert.rejects(() => deployPages(env, async () => ({ ok: false, status: 403 })), (error) => {
    assert.match(error.message, /HTTP 403/);
    assert.ok(!error.message.includes("test-token"));
    assert.ok(!error.message.includes("test-identity"));
    return true;
  });
});
