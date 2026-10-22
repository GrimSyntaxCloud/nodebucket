# Nodebucket

An Angular task board with an Express/Node.js backend and MongoDB-compatible
storage. Originally built as WEB 450 coursework by Andres Macias.

The Azure version is a **shared public demo**: enter **1007** to add, move and
remove sample tasks. All visitors share the same board. This is not a private
account system; do not enter personal information.

**[Open the live demo](https://red-mushroom-0f3c1260f.1.azurestaticapps.net)** ·
[Portfolio](https://grimsyntaxcloud.github.io/)

## Try it

1. Open the demo with employee ID **1007**. This is a demo selector, not a password.
2. Add a sample task (3–35 characters), then drag it between **Todo** and **Done**.
3. Reload to verify persistence, then delete your sample task.

The board supports up to 50 tasks. Another visitor may change it while you are
using it; conflicting saves display an error and reload the latest board.

## How it works

```text
Angular browser app → /api → Node.js Azure Functions → Cosmos DB (MongoDB API)
                              ↳ Express adapter for local development
```

- **Frontend:** Angular 22, TypeScript, Angular Material, and CDK drag-and-drop.
  Angular services load tasks and send create, move/reorder, and delete requests.
- **API:** `server/tasks.js` implements the task operations shared by the local
  Express adapter and the deployed Azure Functions adapter. Only the fixed demo
  employee document is accessible.
- **Persistence:** Mongoose stores task subdocuments in the `todo` and `done`
  arrays of one `employees` document. Seeding creates that document only if it is
  absent, so restarting the app does not erase tasks.
- **Concurrent editing:** each move sends the board version the visitor loaded.
  The API rejects stale versions and Mongoose protects the subsequent save. This
  prevents an older tab from silently undoing another visitor’s move.
- **Validation:** the API checks task length, IDs, permitted operations, request
  size, and the 50-task limit. Writes require JSON. Rate limits apply per running
  process/Functions instance, not per authenticated user.

| Location                                            | Purpose                                           |
| --------------------------------------------------- | ------------------------------------------------- |
| `src/app/pages/home/`                               | Task board and interaction state                  |
| `src/app/shared/services/`                          | Angular API clients                               |
| `server/tasks.js`, `server/models/`                 | Task operations and data model                    |
| `server/app.js`                                     | Local Express adapter                             |
| `server/function-handler.js`, `server/functions.js` | Azure Functions adapter                           |
| `server/database.js`                                | Database connection and non-destructive seed      |
| `server/test/`                                      | Database integration tests and disposable preview |
| `infra/`, `.github/workflows/azure.yml`             | Hosting configuration and CI/CD                   |

Azure Static Web Apps Free hosts the frontend and included Node.js API. Cosmos DB
provides MongoDB-compatible storage. GitHub Actions validates pull requests and
deploys `main` when the deployment variable and secret are configured.

## Local development

Use Node 22.22.3 or newer within Node 22 (`.nvmrc`):

```sh
npm ci
npm ci --prefix server
npm run build
npm run preview
```

The preview runs at `http://127.0.0.1:3107` using a disposable local MongoDB
instance. It downloads a MongoDB test binary on first use and deletes the local
database on shutdown. It never connects to Azure or the original database.

For an existing local MongoDB database, copy `.env.example` to `.env`, set its
connection string, create the `employees` collection, and run `npm run dev`.
The server seeds one demo document without overwriting its tasks on restart.

## Verification and packaging

```sh
npm audit
npm audit --prefix server
npm run test:server
npm run test:ui
npm run build
npm run package
```

The package contains the built frontend and the independently locked production
backend. Angular build tooling, test databases, credentials and Git history are
excluded. Integration tests cover persistent task operations, malformed requests,
concurrent edits (including stale browser tabs), task limits, JSON validation,
and request throttling. Vitest tests cover opening the demo, submitting board
versions, preventing duplicate saves, and real Angular/Material template
rendering. Tests use jsdom; Chrome is not required.

Angular 22 and its UI libraries use patched, locked dependencies. CI audits the
complete frontend toolchain and the independently locked API. A clean audit covers
known dependency advisories, not every possible application vulnerability. See
the setup guide for limits.

## Framework maintenance

The frontend uses Angular 22.2, Material/CDK 22.2, TypeScript 6.0,
and Angular’s application builder. Native CSS replaces retired Flex Layout.
NgModules, zone-based updates, the original routes, and the existing API remain.
The build output stays in `dist/nodebucket`, preserving local and Azure packaging.

The npm overrides pin Vite 8.3.5 and the Angular CLI’s MCP SDK 1.32.1 to
patched compatible versions. Recheck those overrides when upgrading the CLI.

## Azure setup and deployment

Read [the setup guide](docs/azure-setup.md) for the account handoff, billing
boundaries, provisioning, GitHub variables, and live verification checklist.

- Azure Static Web Apps **Free**, including a managed Node.js 22 Functions API.
- Cosmos DB **MongoDB API**, free tier enabled, one region, a shared 400 RU/s database pool,
  1,000 RU/s account cap.
- GitHub Actions tests and builds pull requests. Deployment requires an explicitly
  enabled variable and the `azure` environment; it uses an app-specific deployment
  token stored in GitHub Actions secrets and verifies Cosmos connectivity afterward.
- No Azure resources are created by CI. Infrastructure provisioning is separate.

## Credentials and limitations

`MONGODB_URI` is a server-only Azure application setting. The app-specific
`AZURE_STATIC_WEB_APPS_API_TOKEN` is a GitHub Actions secret. Keep real values out
of source and the browser; local `.env` files are ignored. Cosmos uses its MongoDB
API here, not a separately hosted MongoDB Atlas cluster.

There is no private-account authentication, real-time synchronization, or task
history. The browser cookies are display/navigation conveniences, not access
controls. A private multi-user version would require an authentication and data
ownership design. Free Trial expiration may interrupt Azure hosting; keep the
subscription spending limit enabled and do not upgrade it automatically.

The original database config was removed from current code. Rotate any old
credentials that were committed; the old values remain in Git history.

## Shared demo database and 96-hour retention

Azure uses `portfolio-demos`, a single **400 RU/s manual shared pool** for Nodebucket, BCRS, and Pets-R-Us. Collections share capacity, while separate MongoDB roles restrict each app to its own collections. The account remains free-tier, single-region, capped at 1,000 RU/s; the subscription spending limit stays enabled. Do not upgrade the trial when it expires. The infrastructure template references an existing pool and requires a private scoped credential; it does not create dedicated allocations.

Visitor data expires 96 hours after creation. Edits and task moves do not renew the deadline. BCRS accounts and their invoices expire together; invoices added to its shared guest preview have their own deadline. Nodebucket keeps its employee board and permanent sample task. Server-owned `isDemo` flags protect the fictional samples from cleanup and deletion.

The API rejects expired data at the deadline. `.github/workflows/cleanup.yml` also runs hourly using the `azure` environment secret `DEMO_CLEANUP_MONGODB_URI` and repository variable `DEMO_CLEANUP_ENABLED=true`. It logs counts only. GitHub can delay schedules or disable them after 60 days of repository inactivity, so physical deletion happens on the next successful cleanup, usually within an hour; API requests provide another cleanup opportunity. Check Actions when maintaining the demo.

`DEMO_MAINTENANCE=true` returns HTTP 503 before database access during backups or migration. Existing unclassified visitor data receives a one-time 96-hour grace period during migration. Database credentials stay in server application settings and protected Actions secrets, never frontend code or committed configuration. Local setup instructions and local database defaults above remain unchanged.

## Productivity studio interface

The interface uses a graphite and warm-paper workspace with lilac accents, a compact task board, tactile task slips, and a completion indicator calculated from the current Todo and Done lists. The asymmetric demo entry, About, Contact, and missing-page views share the same visual system. All UI typography and decorative artwork are local/system resources; no paid assets or animation service is required. Existing About photography retains its attribution.

Tasks can still be dragged with Angular CDK. Each task also has a keyboard- and touch-accessible Complete or Back to Todo button that uses the same versioned API operation. Creation, deletion confirmation, disabled pending states, and polite status feedback remain available. Animations respect reduced-motion preferences. The sample contact details and company story are explicitly labeled fictional.

This redesign does not change the API, MongoDB collections, shared 400 RU/s database allocation, 50-task bound, permanent sample protection, or fixed 96-hour visitor-task cleanup. It installs no new dependencies.

### Coordinated frontend updates

Use Node.js 22.22.3 or newer in the Node 22 release line. The frontend uses Angular 22 with TypeScript 6.0; Angular, Material/CDK, and (where used) ngx-cookie-service must stay compatible. Dependabot groups their minor/patch updates. Future framework majors require a reviewed `ng update` migration, and TypeScript 6.1+ is deferred until the Angular compiler supports it. Other compatible updates and security scanning remain enabled.

Before merging an upgrade, require the pull-request workflow to pass dependency audits, existing tests, and the production build. Main-branch deployment also waits for those checks. The hosting tier, backend, demo seed data, and 96-hour visitor-data cleanup are unchanged.

PrimeNG has been removed: inline messages use Angular templates, tables use semantic HTML, confirmations use Angular Material, and BCRS charts use Chart.js directly. These replacements require no license key, paid account, or annual renewal.
