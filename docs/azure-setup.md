# Nodebucket on Azure: free-tier demo

## Architecture

Azure Static Web Apps **Free** serves the Angular frontend and includes a managed
Node.js 22 Functions API under `/api`. The API stores tasks in Cosmos DB's MongoDB
4.2 API through Mongoose 8. The same task operations also run through Express for
local development. The portfolio stays on GitHub Pages and links to the demo.

We selected Static Web Apps because the subscription's App Service F1 quota was
zero in East US, East US 2 and West US 2. This setup provisions no App Service plan,
VM, separate Function App, or separate function storage account.

## Cost boundaries

- Static Web Apps SKU is hardcoded to **Free**. Its included managed API does not
  require upgrading to Standard or provisioning a separate paid Functions plan.
  Preview deployments are disabled. Included bandwidth is 100 GB per subscription
  per month, with no overage bandwidth on Free.
- Cosmos has **free tier enabled**, **one region**, a **1,000 RU/s account cap**,
  and **one collection at 400 RU/s**. It uses provisioned throughput, not serverless.
- Cosmos's ongoing free allowance is 1,000 RU/s and 25 GB for the account. Do not
  add databases, regions, throughput, or extra retained backups without reviewing
  the aggregate cost. The app stores one fixed demo document with at most 50 tasks.
- No Application Insights, Log Analytics, paid deployment slots, or paid hosting
  fallback is provisioned.
- Keep the Free Trial subscription's **spending limit On**. The services target
  free allowances; this is not a permanent subscription-wide spending guarantee.
  Azure normally requires a separate pay-as-you-go decision when the trial ends.
  Do not automatically upgrade or remove the spending limit.
- Budget alerts notify; they do not stop spending. Storage, data transfer, and
  any resources added outside this template also need to remain within allowances.

Official references:
[Static Web Apps plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans),
[Static Web Apps quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas),
[Cosmos free tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier),
[throughput cap](https://learn.microsoft.com/en-us/azure/cosmos-db/limit-total-account-throughput),
[free account lifecycle](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/avoid-charges-free-account).

## Provisioning

Use an authenticated Azure CLI and a dedicated resource group. Verify the active
subscription is your intended Free Trial and its spending limit remains enabled.
The default resource location is East US 2. Names must be available.

```sh
az login
az account show --query '{name:name,id:id}' --output table
az provider register --namespace Microsoft.Web --wait
az provider register --namespace Microsoft.DocumentDB --wait
az group create --name nodebucket-demo --location eastus
az deployment group validate \
  --resource-group nodebucket-demo --template-file infra/main.bicep \
  --parameters appName=YOUR-APP-NAME cosmosName=YOUR-COSMOS-NAME
az deployment group what-if \
  --resource-group nodebucket-demo --template-file infra/main.bicep \
  --parameters appName=YOUR-APP-NAME cosmosName=YOUR-COSMOS-NAME
az deployment group create \
  --resource-group nodebucket-demo --name nodebucket-free \
  --template-file infra/main.bicep \
  --parameters appName=YOUR-APP-NAME cosmosName=YOUR-COSMOS-NAME \
  --query properties.outputs --output json
```

The template configures the database connection directly in the API's Azure app
settings. It never outputs the connection string. Managed Static Web Apps APIs
have no dedicated outbound IP; Cosmos uses a public TLS endpoint protected by its
key, which stays server-side. No database key goes into the browser bundle or Git.

## Automatic deployment

The GitHub workflow tests and builds pull requests. It deploys `main` only when
`AZURE_DEPLOY_ENABLED=true`, using the GitHub environment named `azure`, restricted
to the `main` branch.

Store the app-specific Azure Static Web Apps deployment token in GitHub Actions
secret `AZURE_STATIC_WEB_APPS_API_TOKEN`. Transfer it directly using secure tools;
do not paste it into source, logs, or chat. This token can deploy this static app,
not provision additional Azure infrastructure. Rotate it if exposed.

The artifact includes a prebuilt frontend and locked production API dependencies.
The workflow uploads both, then checks `/api/health` until a real Cosmos database
ping succeeds. No infrastructure is created by CI.

## Live verification

1. Open `/api/health` on the template's actual app URL and expect `{"status":"ok"}`.
2. Enter **1007** on the demo page.
3. Add a sample task, reload, move it to Done, reload, and delete it.
4. Verify another employee ID is rejected and more than 50 tasks are rejected.
5. Check Azure: Static Web Apps Free, Cosmos free tier, one region, collection
   throughput 400, account cap 1,000, and subscription spending limit On.
6. Add the verified app URL to the portfolio only after the live checks pass.

## Demo limitations

This is a **shared public board**, not an authentication system. Employee ID 1007
and browser cookies only open the demo. Everyone can see and change its sample
tasks. Do not store personal information. Real accounts need a separate design.

The API validates input, limits task storage, uses optimistic concurrency, and
throttles requests per warm Functions instance. This is not an account-wide rate
limit; Cosmos's provisioned throughput cap remains independent of API scaling.

Angular 14 remains legacy code. A successful Node 22 build is a compatibility
check, not an official Angular 14 support guarantee. The backend has its own
modern, locked dependencies. Framework modernization is separate work.

The original `server/data/config.json` contained database credentials. It is
removed from current code, but old values remain in Git history. Rotate any still
active credentials. This deployment uses a newly created Cosmos database and
never connects to the original database.
