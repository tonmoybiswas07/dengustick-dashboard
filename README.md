# DengueVision surveillance dashboard

DengueVision manages mosquito larvae inspections, manual verification, field tasks, alerts, surveillance reports, and model evaluation. It uses the root Next.js `app/` directory.

## Local setup

Use Node.js 24 and install the locked dependencies with `npm ci`. Put local or staging configuration in `.env`, then run `npm run dev`. Use an isolated MongoDB replica set or Atlas database for development, testing, and index rehearsal.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. Use a secret store in production. |
| `MONGODB_DB` | Database name. Defaults to `DengueStickDB`. Set a distinct name for staging. |
| `BETTER_AUTH_URL` | Exact application origin. Production requires an HTTPS origin. |
| `BETTER_AUTH_SECRET` | High-entropy secret of at least 32 characters. It also keys the hashed rate-limit identifiers. |
| `AUTH_TRUSTED_IP_HEADER` | Optional header containing the client address as supplied by a trusted ingress. Configure only if ingress overwrites the header and direct callers cannot supply it. Set this in staging and production when ingress supplies a single canonical IP. Without it, authentication keeps the per-account limit and relies on ingress for IP-based protection. |
| `INFERENCE_API_URL` | Optional, server-configured HTTPS endpoint for the future FastAPI service. |
| `INFERENCE_API_TOKEN` | Service credential required when the inference endpoint is configured. |

Accounts are provisioned by administrators through the Administration module. Bootstrap the first administrator through the deployment's database provisioning process. The dashboard protects existing administrators from changes through account administration.

## Database initialization

From the repository root, set `MONGODB_URI` and `MONGODB_DB` for the intended database, then run:

```bash
npm run db:indexes
```

The command also loads `.env` when present. Explicit environment variables take precedence. Rehearse the migration on staging first. It checks existing index definitions, creates missing indexes, and stops on conflicts or duplicate data. Review and reconcile conflicts separately before rerunning. The command never drops indexes or deletes records.

The application indexes cover regional and owner-scoped reads, timestamp sorts, inspection and task identifiers, single-use inspection links, unique alert sources, report ownership, region codes, audit filtering, and MongoDB rate-limit expiry. Settings use unique MongoDB document IDs for both personal and system records. Better Auth may independently verify its own indexes when it first initializes.

Account administration commits user changes, applicable session revocation, and audit records in one transaction. System settings and their audit records also share a transaction. Task completion commits the inspection link and task update together. Region changes, user provisioning, task assignment and status, inspection mutations, AI review, alert resolution, and report generation commit their audit events with their database writes. Password changes, self-service session revocation, exports, and bounded denial events use best-effort audit writes. Monitor audit write failures.

Use a MongoDB replica set for transactions. Region lifecycle transactions write the same region document before checking or changing dependent state. Administrative jobs that change region membership or activation must use the same protocol. Ordinary reads verify the current active-region record. The application uses Better Auth's password hasher and installed MongoDB credential format when provisioning users transactionally.

Retain audit records for an operator-approved period. A proposed starting period is 365 days, subject to the project's retention policy. The migration does not add an audit TTL or delete audit records. Store backups or exports in access-controlled storage, restrict audit reads to authorized operators, and use a custom MongoDB runtime role that grants the audit collection find and insert only. Avoid overlapping database-wide grants that restore update or delete permissions. Use a separate migration identity for index administration.

## Account and system behavior

- Open **Profile** from the account menu to edit your full name and HTTPS avatar URL, view account details, or change your password. Password changes require the current password and sign out other sessions.
- Open **Settings** to persist your theme and toggle the in-app notification bell. Session management supports listing active sessions and signing out other sessions.
- Administrators can change the default dashboard range and enable or disable generation of new verified-positive or overdue-task alerts. Existing alerts retain their state. Alert synchronization applies the current configuration.
- Administrators can page through and filter **Audit log** entries by action and actor ID.
- Researchers have access to regional aggregates, model evaluation, and their own eligible reports. The precise map and other users' report records are restricted.

## Image storage and model service

The application currently accepts HTTPS image references. It has no managed upload endpoint or running inference integration. The image intake contract accepts JPEG, PNG, or WebP, checks the byte limits and signature, and requires a decoder that validates and re-encodes the image while stripping metadata. The storage interface expects a server-generated key and validated bytes.

For a future provider, use private object storage and configure the bucket, region or service endpoint, and a server-side identity with access to the inspection image prefix. Serve approved images through authorization-checked URLs. Add an authenticated, size-limited upload route that performs regional and ownership checks and applies the shared rate limiter before decoding or storing. A provider-specific adapter and credentials are required.

The typed FastAPI client sends validated image bytes using multipart field `image` with a service token. It rejects redirects, limits response size, and enforces a 15-second timeout. Its JSON response contract includes `result`, nullable `confidence` and `larvaeCount`, `modelVersion`, and `predictionId`. The client records the source and timestamp. It takes its endpoint from server configuration and has no user-provided fetch target. Enable network egress only to the chosen service when connecting the client to the inspection workflow. Preserve original predictions separately from manual decisions. The dashboard does not generate synthetic predictions or interpret larvae confidence as human infection risk.

## Verification and release checklist

```bash
npx next typegen
npx tsc --noEmit
npm run lint
npm test
npm run build
```

- Confirm that the default Turbopack build succeeds in an environment where its CSS worker can bind a loopback port.
- Initialize indexes on staging twice, then check query plans with representative data. Inspect legacy duplicate alert sources and reused inspection IDs if an index reports a conflict.
- Sign in with each of the five roles. Verify cross-region isolation, missing-region handling, researcher privacy, and field-worker ownership on both pages and APIs.
- Check login and logout cookies behind the production ingress. Exercise rate limits across concurrent requests and application instances.
- Update your profile and test an incorrect password, successful password change, session listing, and revocation in two browsers. Verify that the new session remains usable.
- Confirm administrators cannot modify themselves or another administrator through account administration. Verify session revocation after changing a non-admin role, region, or account status.
- Submit concurrent AI review decisions and concurrent task completions. Verify that the original AI prediction is preserved, each inspection can complete only one task, and linked inspections cannot be deleted.
- Verify alert deduplication, unread counts, report totals, CSV safety, PDF output, and audit filtering against staging data. Check date boundaries in Asia/Dhaka.
- Check desktop and mobile layouts, both themes, Leaflet tiles, avatars, and existing HTTPS image references under the production security headers.

The CSP blocks inline JavaScript event-handler attributes. It retains inline script elements for Next.js partial prerendering and inline styles for the theme, charts, and maps. A strict nonce-based script policy requires a separate rendering change. Email notifications, MFA, private image storage, and live inference are unavailable until their corresponding integrations are implemented.

### Staging checks for security hardening

- Rehearse `npm run db:indexes` twice against a staging snapshot using an explicitly selected `MONGODB_URI` and `MONGODB_DB`. Review legacy conflicts and normalized email uniqueness before enabling concurrent provisioning. Confirm `request_limits.expiresAt_1` has `expireAfterSeconds: 0`. Compare execution stats before and after migration on representative data.
- Run read-only `explain("executionStats")` checks in staging for the following representative query shapes. Inspect winning plans for intended index use, explicit sorts, documents examined, and keys examined relative to rows returned.

  | Collection | Representative filter and sort |
  | --- | --- |
  | `inspections` | `{ regionId, inspectorId }` sorted by `{ createdAt: -1, _id: -1 }`; use `{ regionId, status }` with the same sort for AI review |
  | `inspections` | `{ regionId, inspectedAt: { $gte: start, $lt: end } }` sorted by `{ inspectedAt: -1, _id: -1 }` |
  | `field_tasks` and `alerts` | `{ regionId, assignedTo }` sorted by `{ createdAt: -1, _id: -1 }` |
  | `reports` | `{ regionId, generatedBy }` sorted by `{ createdAt: -1, _id: -1 }` |
  | `user` and `audit_logs` | Compare `{ role: "field_worker", regionId }` sorted by name and ID, and audit filters by action or actor sorted by timestamp and ID |

- For the opt-in MongoDB tests, supply `MONGODB_TEST_URI` pointing to a dedicated local replica set primary. The tests accept one loopback host and create a uniquely named scratch database. Run `npm test`, then remove the scratch database through local test-environment maintenance. The ordinary suite skips this test when the variable is absent.
- Through the staging app, provision a credential account and sign in to verify Better Auth compatibility. Race deactivation against assignment, reactivation, and task creation. Verify the loser is denied or safely retried, then confirm database state and audit records agree.
- Verify 413 responses with and without Content-Length, multi-page directories, simultaneous independent settings changes, and researcher report and map restrictions from the browser.
- Test the deployed CSP against hydration, navbar, authentication, charts and Leaflet. Test the continuous rate limiter across processes using distinct accounts and addresses behind the actual ingress. Confirm client-supplied headers cannot override the ingress-provided address.
