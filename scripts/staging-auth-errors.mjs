import { APIError } from "better-auth/api";
import { MongoNetworkError, MongoServerSelectionError, MongoTransactionError } from "mongodb";

export class StagingError extends Error {
  constructor(message, category = "staging workflow") {
    super(message);
    this.category = category;
  }
}

const networkCodes = new Set([
  "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ENODATA", "ETIMEDOUT",
  "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH", "EPERM", "EACCES",
  "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID",
]);

export function describeStagingError(error, phase) {
  if (error instanceof StagingError) return `[${error.category}] ${error.message}`;

  const seen = new Set();
  const pending = [error];
  let auth = false;
  let permission = false;
  let duplicate = false;
  let transaction = false;
  let network = false;
  let betterAuth = false;
  let networkCode;
  let dnsLookup;
  while (pending.length && seen.size < 20) {
    const item = pending.shift();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    const { code, codeName, message, body, reason } = item;
    const text = typeof message === "string" ? message : "";
    auth ||= code === 18 || codeName === "AuthenticationFailed" ||
      (code === 8000 && /bad auth|authentication failed/i.test(text));
    permission ||= code === 13 || codeName === "Unauthorized" ||
      (code === 8000 && /not authorized|unauthorized/i.test(text));
    duplicate ||= code === 11000 || code === 11001 ||
      (item instanceof APIError && body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
    transaction ||= item instanceof MongoTransactionError ||
      [112, 244, 251, 263].includes(code) ||
      (code === 20 && /transaction|replica set/i.test(text)) ||
      (Array.isArray(item.errorLabels) && item.errorLabels.some(
        (label) => label === "TransientTransactionError" || label === "UnknownTransactionCommitResult",
      ));
    network ||= item instanceof MongoNetworkError || item instanceof MongoServerSelectionError || networkCodes.has(code);
    if (networkCodes.has(code)) networkCode ??= code;
    if (item.syscall === "querySrv" || item.syscall === "queryTxt") dnsLookup ??= item.syscall;
    betterAuth ||= item instanceof APIError || item.name === "BetterAuthError";
    pending.push(item.cause, item.errorResponse, reason?.error);
    if (reason?.servers instanceof Map) {
      for (const server of reason.servers.values()) pending.push(server.error);
    }
  }

  if (auth) return "[MongoDB authentication] Credentials were rejected. Verify the staging database user, URI-escaped credentials, and authSource.";
  if (permission) {
    const operation = phase === "staging preflight"
      ? "Check permission to list staging collections and inspect the user email index."
      : "Check staging user and account permissions for provisioning.";
    return `[MongoDB permissions] The database user is missing a required privilege. ${operation}`;
  }
  if (duplicate) return "[duplicate account] The email is already in use. Use the original matching fixture credentials or a new reserved address.";
  if (transaction) return "[MongoDB transaction] Provisioning could not complete its transaction. Check replica-set support and transaction connectivity. Verify the account before retrying.";
  if (dnsLookup) {
    const record = dnsLookup === "querySrv" ? "SRV" : "TXT";
    return `[MongoDB connectivity] Staging DNS ${record} lookup failed${networkCode ? ` (${networkCode})` : ""}. Compare the SRV hostname with Atlas Connect and check the local DNS resolver.`;
  }
  if (network) return `[MongoDB connectivity] Could not reach staging${networkCode ? ` (${networkCode})` : ""}. Check SRV DNS, network access, TLS, and the Atlas IP access list.`;
  if (betterAuth || phase === "Better Auth initialization") return "[Better Auth configuration] The server-side provisioning API failed. Verify the installed Better Auth adapter, admin plugin, and staging auth settings.";
  return phase === "staging preflight"
    ? "[MongoDB preflight] The staging database checks failed without a recognized error code."
    : null;
}

export function isDuplicateAccountError(error) {
  return describeStagingError(error)?.startsWith("[duplicate account]") ?? false;
}
