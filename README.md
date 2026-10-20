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

- **Frontend:** Angular 14, TypeScript, Angular Material, and CDK drag-and-drop.
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

| Location | Purpose |
| --- | --- |
| `src/app/pages/home/` | Task board and interaction state |
| `src/app/shared/services/` | Angular API clients |
| `server/tasks.js`, `server/models/` | Task operations and data model |
| `server/app.js` | Local Express adapter |
| `server/function-handler.js`, `server/functions.js` | Azure Functions adapter |
| `server/database.js` | Database connection and non-destructive seed |
| `server/test/` | Database integration tests and disposable preview |
| `infra/`, `.github/workflows/azure.yml` | Hosting configuration and CI/CD |

Azure Static Web Apps Free hosts the frontend and included Node.js API. Cosmos DB
provides MongoDB-compatible storage. GitHub Actions validates pull requests and
deploys `main` when the deployment variable and secret are configured.

## Local development

Use Node 22 (`.nvmrc`):

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
npm run test:server
npm run test:ui
npm run build
npm run package
```

The package contains the built frontend and the independently locked production
backend. Angular build tooling, test databases, credentials and Git history are
excluded. Integration tests cover persistent task operations, malformed requests,
concurrent edits (including stale browser tabs), task limits, JSON validation,
and request throttling. Browser tests cover opening the demo, submitting board
versions, and preventing duplicate saves. Browser tests require Chrome/Chromium.

The Angular 14 frontend has outstanding dependency advisories; a successful
Node 22 build does not make it a supported or fully patched framework. Upgrading
Angular and its UI libraries remains separate modernization work. The deployed
API has its own dependency lockfile. See the setup guide for limits.

## Azure setup and deployment

Read [the setup guide](docs/azure-setup.md) for the account handoff, billing
boundaries, provisioning, GitHub variables, and live verification checklist.

- Azure Static Web Apps **Free**, including a managed Node.js 22 Functions API.
- Cosmos DB **MongoDB API**, free tier enabled, one region, one 400 RU/s collection,
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
