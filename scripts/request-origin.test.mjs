import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    return next(specifier, context);
  },
});

const { isTrustedRequest } = await import("../lib/request-security.ts");
const local = "http://127.0.0.1:3001";
const publicOrigin = "https://dashboard.example.test";
const request = (method, headers = {}, origin = local) =>
  new Request(`${origin}/api/inspections/regions`, { method, headers });

function withOrigin(origin, run) {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = origin;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previous;
  }
}

test("same-origin reads work on an alternate loopback host and port", () => {
  withOrigin("http://localhost:3000", () => {
    assert.equal(isTrustedRequest(request("GET", { Origin: local, "Sec-Fetch-Site": "same-origin" })), true);
    assert.equal(isTrustedRequest(request("GET", { Referer: `${local}/inspections` })), true);
    assert.equal(isTrustedRequest(request("GET", { "Sec-Fetch-Site": "none" })), true);
    assert.equal(isTrustedRequest(request("HEAD")), true);
  });
});

test("cross-origin reads are rejected with either Origin or fetch metadata", () => {
  withOrigin(publicOrigin, () => {
    assert.equal(isTrustedRequest(request("GET", { Origin: "https://evil.example.test" }, publicOrigin)), false);
    assert.equal(isTrustedRequest(request("GET", { "Sec-Fetch-Site": "cross-site" }, publicOrigin)), false);
    assert.equal(isTrustedRequest(request("GET", { "Sec-Fetch-Site": "same-site" }, publicOrigin)), false);
    assert.equal(isTrustedRequest(request("GET", { Referer: "https://evil.example.test/inspections" }, publicOrigin)), false);
  });
});

test("mutations use the configured public origin behind a proxy", () => {
  withOrigin(publicOrigin, () => {
    assert.equal(isTrustedRequest(request("POST", { Origin: publicOrigin })), true);
    assert.equal(isTrustedRequest(request("PATCH", { Referer: `${publicOrigin}/inspections` })), true);
    assert.equal(isTrustedRequest(request("POST", { Origin: local })), false);
    assert.equal(isTrustedRequest(request("POST", { "Sec-Fetch-Site": "same-origin" })), false);
    assert.equal(isTrustedRequest(request("DELETE", { Origin: "null", Referer: `${publicOrigin}/inspections` })), false);
  });
});

test("cross-site mutations and forged forwarding headers do not establish trust", () => {
  withOrigin(publicOrigin, () => {
    assert.equal(isTrustedRequest(request("POST", { Origin: publicOrigin, "Sec-Fetch-Site": "cross-site" })), false);
    assert.equal(isTrustedRequest(request("PATCH", {
      Origin: "https://evil.example.test",
      "X-Forwarded-Host": "evil.example.test",
      "X-Forwarded-Proto": "https",
      Forwarded: "host=evil.example.test;proto=https",
    })), false);
  });
});
