# DengueVision surveillance dashboard

DengueVision manages mosquito larvae inspections, manual verification, field tasks, alerts, surveillance reports, and model evaluation. It uses the root Next.js `app/` directory.

## Local setup

Use Node.js 24 and install the locked dependencies with `npm ci`. For a new checkout, copy `.env.example` to `.env.development.local`, fill in the required values, and run `npm run dev`. Use `BETTER_AUTH_URL=http://localhost:3000` and an isolated development replica set. Keep `.env` free of environment-specific values because Next.js loads it in both development and production.

Generate a distinct Better Auth secret for each environment with `openssl rand -hex 32`. Save the output directly in the environment's secret store or ignored local configuration. Keep an existing deployment secret when moving configuration so active sessions remain valid.

## Staging and production configuration

Inject production secrets through the hosting environment. For a local production-mode run, `.env.production.local` can hold production-mode settings. Use the exact public HTTPS origin for `BETTER_AUTH_URL`, with no path, query, or fragment. Better Auth requires HTTPS in production and uses secure cookies. Configure staging separately with its own HTTPS origin, auth secret, and isolated MongoDB database and credentials.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Required. MongoDB connection string for the selected environment. |
| `MONGODB_DB` | Optional for the app. Defaults to `DengueStickDB`. Set it explicitly for staging and index migrations. |
| `BETTER_AUTH_URL` | Required in production. Set the exact application origin. |
| `BETTER_AUTH_SECRET` | Required in production. Use a high-entropy secret of at least 32 characters. It also keys the hashed rate-limit identifiers. |
| `AUTH_TRUSTED_IP_HEADER` | Optional. Configure only if ingress overwrites the header with one client address and direct callers cannot bypass ingress. |
| `MONGODB_TEST_URI` | Optional. Export it when running the opt-in integration test against a dedicated local replica set. |
| `INFERENCE_API_URL` | Optional. Server-configured HTTPS endpoint for a future FastAPI service. |
| `INFERENCE_API_TOKEN` | Required if the inference endpoint is configured. |

Accounts are provisioned by administrators through the Administration module. Bootstrap the first administrator through the deployment's database provisioning process. The dashboard protects existing administrators from changes through account administration.

### Local production build verification

When a deployment domain or staging database is unavailable, use process-level overrides for a compile-only check:

```bash
BETTER_AUTH_URL=https://dashboard.example.test \
BETTER_AUTH_SECRET="$(openssl rand -hex 32)" \
MONGODB_URI='mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=1000' \
MONGODB_DB=dengue_build_only \
npm run build
```

The reserved HTTPS hostname and deliberately unreachable database are for this build check only. They do not verify TLS, sign-in, or database connectivity. Replace them with the real environment configuration before starting or deploying the application.

## Database initialization

From the repository root, set `MONGODB_URI` and `MONGODB_DB` for the intended database, then run:

```bash
npm run db:indexes
```

The command reads exported variables only. It does not load application env files. The application and index script both select the database through `MONGODB_DB` and default to `DengueStickDB` when it is unset. Export both the URI and database name for the intended staging target before invoking the command. Rehearse the migration on staging first. It checks existing index definitions, creates missing indexes, and stops on conflicts or duplicate data. Review and reconcile conflicts separately before rerunning. The command never drops indexes or deletes records.

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

## Private inspection images and model service

The inspection form supports file selection, drag-and-drop, local previews, progress, cancellation, retry, and removal. An inspection can have up to ten images, combining managed uploads and existing HTTPS image references. Managed JPEG, PNG, and WebP uploads are limited to 4 MiB each. Sharp decodes the actual content, rejects multiple frames and excessive dimensions, applies orientation, and re-encodes to WebP without preserving metadata.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the server environment, using a dedicated product environment. The provider uses authenticated assets with signed server requests. Signed delivery URLs and credentials stay on the server. The browser loads same-origin image URLs after the app checks permission and inspection scope. Restrict any Cloudinary upload presets in the product environment separately. [Cloudinary authenticated media](https://cloudinary.com/documentation/control_access_to_media)

Use an authorized active region before uploading. The image metadata lives in `inspection_images`. Its managed URL is linked or detached in the same transaction as the inspection changes. Dashboard administrators can run bounded image cleanup in **Settings**. Removal revokes application access immediately. Cleanup retries expired or detached provider objects in batches. Draft uploads expire after 24 hours, and interrupted uploads become eligible for cleanup after 30 minutes. Do not attach a MongoDB TTL index to these records because provider deletion must precede metadata deletion. The application preserves existing external image URLs and does not fetch them server-side.

| Route | Access and purpose |
| --- | --- |
| `GET /api/inspection-images` | Inspect configured storage availability for inspection creators. |
| `POST /api/inspection-images?region=<id>` | Upload one authenticated raw image. Send its MIME type and file extension in `Content-Type` and `X-Image-Extension`. |
| `GET /api/inspection-images/<id>` | Serve an authorized inspection image or the uploader's unexpired draft. |
| `DELETE /api/inspection-images/<id>` | Queue removal of the uploader's unattached draft. Remove attached evidence through the inspection edit form. |
| `POST /api/inspection-images/cleanup` | Administrator-only, bounded cleanup of expired and detached objects. |

The server-only FastAPI transport supports `INFERENCE_API_URL`, `INFERENCE_API_TOKEN`, `INFERENCE_TIMEOUT_MS`, and an optional same-origin `INFERENCE_HEALTH_PATH`. It sends multipart field `image`, a bearer credential, and an `Idempotency-Key`; it rejects redirects and validates a bounded JSON response. The contract supports detection, count, confidence, prediction ID, model metadata, latency, normalized bounding boxes, and an opaque annotated image identifier. The client does not fetch model-supplied image URLs or automatically retry prediction requests. A worker must reuse the request ID for a retry, and the service must honor it. Reviewers can queue a prediction for managed evidence. Dispatch requires a separate worker secret, a configured health check, healthy storage and inference services, and an external scheduler.

AI Review serves original evidence, validated boxes, optional authorized annotations, processing state, and model provenance when present. It labels absent prediction data as unavailable. Manual verification remains separate from automated predictions. Larvae detection confidence does not estimate human infection risk.

For an approved staging release, export staging-only `MONGODB_URI` and `MONGODB_DB=DengueStickStagingDB`, then run `npm run db:indexes` twice. Check the `inspection_images` indexes on `inspectionId` and `expiresAt`. Live Cloudinary verification should cover unauthorized reads, cross-region attachments, malformed uploads, cancellation, edit and delete cleanup, concurrent draft attachment, and abandoned uploads. Run the existing staged auth suite separately after approval.


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

The CSP blocks inline JavaScript event-handler attributes. It retains inline script elements for Next.js partial prerendering and inline styles for the theme, charts, and maps. A strict nonce-based script policy requires a separate rendering change. Email notifications, MFA, and live inference remain unavailable. Managed image storage requires Cloudinary configuration and staging verification.

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

## Phase 01 staging authentication integration

The staging harness runs the actual Next.js pages and API routes against Better Auth and MongoDB. It is separate from the ordinary automated suite and does not load staging configuration during `npm run dev` or production startup. No public signup or native admin endpoint is enabled.

Create the ignored local configuration if it does not already exist:

```bash
test -e .env.staging.local || (umask 077 && cp .env.staging.example .env.staging.local)
```

Fill in `STAGING_MONGODB_URI` with a staging-only MongoDB account whose privileges are restricted to `DengueStickStagingDB`. The URI must explicitly include `/DengueStickStagingDB` as its database path. If credential authentication requires a separate database, preserve the appropriate URI `authSource` parameter. Keep `STAGING_MONGODB_DB=DengueStickStagingDB`, generate a separate `STAGING_BETTER_AUTH_SECRET` with `openssl rand -hex 32`, and save it in the ignored file. The scripts refuse production mode, an incompatible ambient `MONGODB_DB`, other database names, missing staging collections, and a missing full unique user email index.

Set `STAGING_AUTH_ADMIN_EMAIL` to a dedicated `@example.test` address and `STAGING_AUTH_ADMIN_PASSWORD` to a strong password between 12 and 128 characters. Store the credentials in the ignored file or inject them through your secret manager. The reusable provisioner verifies an existing matching administrator without resetting its password, changing its role, or enabling a banned account. Use a different fixture address if the existing account no longer matches.

After approving staging writes, provision the manual test account and start the loopback staging app:

```bash
npm run auth:staging:provision -- --allow-staging-writes
npm run auth:staging:serve -- --allow-staging-writes
```

Open `http://127.0.0.1:3100/login` for manual login and profile testing. The launcher explicitly supplies staging credentials and an isolated Next.js build directory. Keep the server on loopback. The production HTTPS and cookie configuration remains in effect for deployed production-mode builds.

Run the integration checks after approving writes:

```bash
npm run auth:staging:test -- --allow-staging-writes
```

The runner launches its own loopback instance on an ephemeral port and checks all 13 authentication and profile cases through real HTTP requests. It creates two disposable administrator fixtures with random in-memory passwords. It changes one fixture's profile and password, verifies the original and second sessions lose access, checks logout, and tests an existing session and a new login for the banned fixture. The runner attempts to disable its disposable users at the end, including after a test failure. It retains user records and never edits the reusable administrator. Better Auth invalidates only the suite's test sessions during password change and logout. No staging index migration is run by these commands.


### Diagnose staging provisioning without writes

```bash
npm run auth:staging:provision -- --check
```

This checks the staging target, collection and user-index access, and administrator input format. It does not initialize the Better Auth adapter or test transaction write privileges. If you get an SRV DNS error, compare the staging URI hostname with the Atlas **Connect** dialog and verify DNS from the same machine. Keep the required staging database path. For a MongoDB authentication error, check the database user and its auth source. Use the auth source issued by your provider. After the preflight passes and staging writes are approved, rerun provisioning with `--allow-staging-writes`.

## Dashboard continuation checklist

- [x] **A — Managed inspection evidence.** Private Cloudinary uploads, authorization, attachment, and scheduled-by-operator cleanup are implemented. Live provider checks remain.
- [x] **B — Durable prediction workflow.** MongoDB records queues, attempts, leases, and safe failures. Reviewers can queue, retry, and cancel pending or expired jobs. Workers recheck requester scope, fence stale results, and reuse the same idempotency key when retrying the same evidence. Completed predictions retain their input and remain separate from manual review. AI Review shows original evidence, boxes and optional annotations. A real scheduler and inference contract still need staging validation.
- [x] **C — Core map, search and history.** The map filters by authorized region, district, date, detection, and status before loading a bounded set. The browser supports clusters, grid-based inspection density and fullscreen. Dashboard search uses Cmd/Ctrl+K and scoped results. Inspection history shows an allowlisted subset of audit events. Remaining work includes viewport bounding-box filtering, continuous heatmaps, search indexing for high-volume data, deep links for modules without detail routes, and histories for tasks and alerts.
- [x] **D — Core notification, analytics, evaluation and scheduling work.** Added a notification panel, scoped bulk read, transactional task assignment alerts, and due-soon alerts on existing synchronization. Added Dhaka custom dates and equal-duration previous-period comparisons, model version comparisons, and MAE/RMSE for paired counts. Scheduled surveillance reports support daily, weekly and monthly periods. Existing PDF and CSV exports remain available. Category-level preferences, redesigned exports and automated alert polling infrastructure remain.
- [x] **E — Managed avatars and individual session revocation.** Avatars are size-bounded, normalized WebP records in MongoDB, served only to the active account. Legacy avatar URLs remain the fallback. Individual revocation uses Better Auth and exposes no session token to the browser.
- [ ] **E — Password recovery, approved email delivery, TOTP and recovery codes.** Public Better Auth endpoints remain restricted. Next work should add delivery configuration and a generic, rate-limited recovery flow, then integrate enrollment, login challenges and recovery codes with the installed Better Auth plugin. Keep each disabled until complete.
- [x] **F — Targeted UI improvements.** New dialogs use Base UI, search receives initial keyboard focus, map controls have labels, and loading animation respects reduced motion. Full dashboard-wide device, keyboard, contrast and performance checks remain.
- [x] **G — Local security, docs and schema preparation.** New endpoints apply scoped authorization or separate worker credentials. Index definitions and example configuration are updated.
- [ ] **G — Staging and deployment validation.** Run the standard build on the release host. Once approved, apply staging indexes, prove worker idempotency and access isolation against live dependencies, and run the staging authentication and browser suites.

### Worker and API configuration

| API route | Controls and behavior |
| --- | --- |
| `POST /api/ai-review/:id/prediction` | A reviewer with inspection scope queues or retries a managed image. Duplicate requests return the existing active job. |
| `DELETE /api/ai-review/:id/prediction` | The same scope can cancel pending jobs or processing jobs after their lease expires. |
| `POST /api/ai-review/worker` | A scheduler sends `Authorization: Bearer <INFERENCE_WORKER_SECRET>`. The worker processes at most one job per invocation and requires healthy inference. |
| `GET /api/ai-review/:id/annotation` | Applies inspection read permissions and proxies bounded, re-encoded annotation bytes from the configured inference origin. |
| `GET /api/search?q=<prefix>` | Bounded, rate-limited results. Returns inspection detail links and module links for other records. |
| `POST /api/alerts/read` | Marks at most ten accessible alert IDs as read for the current account. |
| `GET/POST/PATCH /api/reports/schedules` | View, create, pause or resume your schedules within the current report scope. Schedules generate surveillance summaries through the existing report snapshot format. |
| `POST /api/reports/worker` | A scheduler sends `Authorization: Bearer <REPORT_WORKER_SECRET>`. Each invocation claims at most one schedule, checks current owner permissions, and commits the immutable report and schedule advance together. |
| `GET/POST/DELETE /api/account/avatar` | Read, upload or remove your managed avatar. JPEG, PNG and WebP intake is capped at 512 KiB; output is 320px-bounded WebP. |
| `DELETE /api/account/sessions/:id` | Uses Better Auth to revoke another session belonging to the caller. Tokens stay server-side. |

Use separate high-entropy `INFERENCE_WORKER_SECRET` and `REPORT_WORKER_SECRET` values of at least 32 characters. Only set a worker secret when deploying its scheduler. For predictions, also set `INFERENCE_API_URL`, `INFERENCE_API_TOKEN`, and `INFERENCE_HEALTH_PATH`, and configure managed image storage. If supported by the service, set `INFERENCE_ANNOTATION_PATH` to the same-origin path prefix serving an opaque annotation ID. The inference service must honor `Idempotency-Key` across retries of the same image. The README deployment instructions assume a scheduler that can perform authenticated POST requests. No scheduler is registered by this change.

Report periods use Asia/Dhaka calendar boundaries. A delayed run produces a summary of the most recent complete period and skips older missed periods. A worker failure leaves the lease for a later retry. Ownership changes pause schedules whose saved region no longer matches the account.

### Approved staging checklist

1. Export staging-only MongoDB credentials and explicitly set `MONGODB_DB=DengueStickStagingDB`. After migration approval, run `npm run db:indexes` twice. Check the prediction claim and lease indexes, inspection activity index, and report schedule due-time and uniqueness indexes. Managed avatars use the built-in unique `_id` index.
2. Verify duplicate queue requests, lease takeover, stale result rejection, attempt limits, account or region revocation, and manual review conflicts. Confirm no prediction is written when the provider is unavailable or returns invalid data.
3. Verify annotation access by role, legacy inspection images, and missing or corrupt provider images. Verify that researchers cannot enter the map API or retrieve private records through search.
4. Check assignment and deadline notifications, per-user read state, schedule pause and resume, duplicate dispatch, and Dhaka date boundaries with real records. Check model comparisons only with eligible, paired observations.
5. Verify avatar replacement and deletion, session revocation, responsive and keyboard behavior, and real export files. Follow the separate approved staging authentication procedure.

Verified larvae observations are surveillance records. Manual checks are reference observations for the evaluation workflow. Neither larvae detections nor model confidence estimate human infection risk.
