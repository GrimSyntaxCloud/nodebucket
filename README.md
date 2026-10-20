# Nodebucket

An Angular task board with an Express/Node.js backend and MongoDB-compatible
storage. Originally built as WEB 450 coursework by Andres Macias.

The Azure version is a **shared public demo**: enter **1007** to add, move and
remove sample tasks. All visitors share the same board. This is not a private
account system; do not enter personal information.

## Status

Deployment uses Azure Static Web Apps Free with its included Node.js API and
Cosmos DB. The deployment workflow is enabled only after infrastructure is ready
and the GitHub deployment secret is configured.

## Local development

Use Node 22 (`.nvmrc`):

```sh
npm ci
npm ci --prefix server
npm run build
node server/test/preview.cjs
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
npm run build
npm run package
```

The package contains the built frontend and the independently locked production
backend. Angular build tooling, test databases, credentials and Git history are
excluded. Integration tests cover persistent task operations, malformed requests,
concurrent edits, task limits, and request throttling.

The Angular 14 frontend remains legacy code; a successful Node 22 build does not
make it an officially supported Angular version. See the setup guide for limits.

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

The original database config was removed from current code. Rotate any old
credentials that were committed; the old values remain in Git history.
