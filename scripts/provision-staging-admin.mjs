import { reportStagingError, stagingConfig, verifyStagingDatabase } from "./staging-auth-config.mjs";
import { ensureStagingAdministrator, stagingAuth, validateStagingCredentials } from "./staging-auth-fixtures.mjs";

const args = process.argv.slice(2);
const readOnly = args.includes("--check");
let config;
let phase = "environment";
try {
  config = stagingConfig(args, { readOnly });
  const input = { email: config.adminEmail?.trim().toLowerCase(), password: config.adminPassword };
  if (!readOnly) {
    phase = "administrator credentials";
    validateStagingCredentials(input);
  }
  phase = "staging preflight";
  await verifyStagingDatabase(config);
  if (readOnly) {
    console.log("Read-only staging connection and database preflight passed.");
    validateStagingCredentials(input);
    console.log("Staging administrator credentials have the expected format.");
  } else {
    phase = "Better Auth initialization";
    const auth = stagingAuth(config);
    await auth.$context;
    phase = "account provisioning";
    const result = await ensureStagingAdministrator(auth, input, "Staging Test Administrator");
    console.log(result.created ? "Staging test administrator created." : "Matching staging test administrator already exists.");
  }
} catch (error) {
  reportStagingError(error, `Staging administrator command failed during ${phase}.`, phase);
} finally {
  try {
    await config?.client.close();
  } catch {
    reportStagingError(null, "The staging connection could not be closed cleanly.");
  }
}
