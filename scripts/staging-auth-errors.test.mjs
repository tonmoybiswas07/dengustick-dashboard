import assert from "node:assert/strict";
import test from "node:test";
import { APIError } from "better-auth/api";
import { MongoTransactionError } from "mongodb";
import { describeStagingError } from "./staging-auth-errors.mjs";
import { ensureStagingAdministrator, validateStagingCredentials } from "./staging-auth-fixtures.mjs";

test("classifies nested MongoDB and Better Auth errors without leaking their contents", () => {
  const privateText = "mongodb://private:password@internal.example secret";
  const cases = [
    [{ code: "ENOTFOUND", syscall: "querySrv" }, /connectivity.*SRV.*ENOTFOUND/],
    [{ reason: { servers: new Map([["private", { error: { code: 18 } }]]) } }, /MongoDB authentication/],
    [{ code: 8000, message: "bad auth" }, /MongoDB authentication/],
    [{ code: 13 }, /MongoDB permissions.*list staging collections/],
    [{ cause: new MongoTransactionError(privateText) }, /MongoDB transaction/],
    [{ errorResponse: { code: 11000 } }, /duplicate account/],
    [new APIError("INTERNAL_SERVER_ERROR", { message: privateText }), /Better Auth configuration/],
  ];
  for (const [error, expected] of cases) {
    const result = describeStagingError({ message: privateText, cause: error }, "staging preflight");
    assert.match(result, expected);
    assert.ok(!result.includes(privateText));
  }
});

test("administrator input and pre-existing credential failures are categorized", async () => {
  assert.throws(() => validateStagingCredentials({ email: "user@example.com", password: "sample-password-for-test" }),
    (error) => error.category === "administrator credentials");
  const existing = {
    $context: Promise.resolve({
      internalAdapter: {
        findUserByEmail: async () => ({ user: { id: "fixture", name: "Fixture", role: "admin" } }),
        findCredentialAccount: async () => ({ password: "sample-hash" }),
      },
      password: { verify: async () => false },
    }),
  };
  await assert.rejects(ensureStagingAdministrator(existing, {
    email: "user@example.test", password: "sample-password-for-test",
  }, "Fixture"), (error) => error.category === "administrator credentials");
});

test("a failed write preserves the original non-duplicate error", async () => {
  const transactionError = new MongoTransactionError("private transaction detail");
  let lookups = 0;
  const auth = {
    $context: Promise.resolve({
      internalAdapter: { findUserByEmail: async () => { lookups++; return null; } },
      password: {},
    }),
    api: { createUser: async () => { throw transactionError; } },
  };
  await assert.rejects(ensureStagingAdministrator(auth, {
    email: "user@example.test", password: "sample-password-for-test",
  }, "Fixture"), (error) => error === transactionError);
  assert.equal(lookups, 1);
});
