# Nodebucket on Azure: free-tier demo

## What this setup does

The Angular frontend and Express backend run together on one Azure App Service
Linux F1 plan. Express talks to one Cosmos DB account using its MongoDB 4.2 API
through Mongoose 8. GitHub Actions builds and tests the app, packages only the
runtime files, and deploys the package after checks pass.

The portfolio stays on GitHub Pages. Add this app's actual Azure URL to its
Nodebucket project entry only after the live checks below pass.

## Cost boundaries

- App Service is hardcoded to **F1 / Free**, without Always On or paid scaling.
  F1 has shared compute, daily quotas and idle shutdown. This is a portfolio demo.
- Cosmos uses **provisioned throughput**, `enableFreeTier: true`, **one region**,
  a **1,000 RU/s account ceiling**, and one collection at **400 RU/s**. If free
  tier is already used elsewhere in the subscription, stop; do not disable it.
- There is no serverless Cosmos account, paid App Service fallback, VM,
  Application Insights, Log Analytics workspace, or paid deployment slot.
- The app writes only one fixed demo document, with at most 50 short tasks.
  Visitors cannot create users, collections, or arbitrary documents through the API.
- The 1,000 RU/s and 25 GB allowances belong to the Cosmos account, not each app.
  Do not add other projects, regions, databases, or retention settings without
  checking the total cost.
- These choices target $0 within Microsoft's allowances; they are **not a
  subscription-wide spending cap**. Budget alerts do not stop charges. Storage,
  data transfer, backups, configuration changes, and other resources must remain
  within applicable allowances.
- New Azure free accounts normally require an upgrade to pay-as-you-go after
  30 days or trial-credit exhaustion to continue using services. Keep the trial
  spending limit enabled. Do not upgrade automatically; decide separately
  whether that billing arrangement fits your $0 requirement.

Official references:
[App Service](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/),
[Cosmos free tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier),
[throughput cap](https://learn.microsoft.com/en-us/azure/cosmos-db/limit-total-account-throughput),
[free account lifecycle](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/avoid-charges-free-account).

## Account setup: the part you must do

1. Create an [Azure free account](https://azure.microsoft.com/free/). Complete
   sign-in and Microsoft's identity/card verification yourself. Never paste a
   password, card number, or database key into chat or GitHub.
2. Keep the trial spending limit enabled.
3. Once signup is complete, the remaining provisioning can be done with your
   signed-in Azure CLI session. No resources have been provisioned merely by
   adding these files to GitHub.

## Provision when ready

Use a dedicated, empty resource group. The following commands are examples for
an authenticated Azure CLI; replace the example app/account names with unique
lowercase names. Validate F1 availability in the selected region before creating
resources. If Azure rejects the region or quota, stop and choose another free-tier
region—never upgrade the SKU to make the deployment succeed.

```sh
az login
az account show --query '{name:name,id:id}' --output table
az appservice list-locations --sku F1 --linux-workers-enabled --output table
az provider register --namespace Microsoft.Web --wait
az provider register --namespace Microsoft.DocumentDB --wait
az provider register --namespace Microsoft.ManagedIdentity --wait
az group create --name nodebucket-demo --location eastus
az deployment group validate \
  --resource-group nodebucket-demo \
  --template-file infra/main.bicep \
  --parameters appName=YOUR-UNIQUE-APP cosmosName=YOUR-UNIQUE-COSMOS
az deployment group what-if \
  --resource-group nodebucket-demo \
  --template-file infra/main.bicep \
  --parameters appName=YOUR-UNIQUE-APP cosmosName=YOUR-UNIQUE-COSMOS
```

Review the plan: F1, free Cosmos, one region, one 400 RU/s collection, account cap
1,000. `what-if` is a resource preview, not a price quotation.

Then run:

```sh
az deployment group create \
  --resource-group nodebucket-demo \
  --name nodebucket-free \
  --template-file infra/main.bicep \
  --parameters appName=YOUR-UNIQUE-APP cosmosName=YOUR-UNIQUE-COSMOS \
  --query properties.outputs --output json
```

The template creates the database and collection before configuring the app.
Its connection string is passed directly to App Service settings and is never
output or stored in the repository. Cosmos permits only the app's possible
outbound IP addresses; local machines and GitHub runners cannot access it.
Redeploy the template if those outbound addresses change.

No paid cloud resources are required for the deployment identity. GitHub uses a
short-lived OpenID Connect token, limited to Website Contributor on this app.
The identity cannot create infrastructure or increase the plan tier.

## Enable automatic deployment

In GitHub repository settings, create an environment named **azure** and restrict
deployment branches to **main**. Add these repository Actions variables using
the non-secret deployment outputs:

| Variable | Template output |
| --- | --- |
| `AZURE_CLIENT_ID` | `azureClientId` |
| `AZURE_TENANT_ID` | `azureTenantId` |
| `AZURE_SUBSCRIPTION_ID` | `azureSubscriptionId` |
| `AZURE_WEBAPP_NAME` | `azureWebAppName` |
| `AZURE_DEPLOY_ENABLED` | Set to `true` only after provisioning |

Run **Nodebucket checks and Azure deploy** on `main` from the Actions tab.
Future pushes to `main` will test, build, and deploy. Pull requests run checks only.
The workflow does not provision infrastructure, and deployment stays skipped
while `AZURE_DEPLOY_ENABLED` is unset.

## Verify the live demo

1. Visit `/health` on the real app URL and check for `{"status":"ok"}`.
2. Open the demo with employee ID **1007**.
3. Add a sample task, reload, move it to Done, reload, and delete it.
4. Verify that another employee ID is rejected and that tasks never exceed 50.
5. Restart the web app and confirm tasks survive.
6. Check the Azure portal: F1 plan, Cosmos free-tier enabled, one region,
   400 RU/s collection, 1,000 RU/s cap, and no unexpected resources/charges.
7. Only then add the verified demo URL to the portfolio.

Local MongoDB integration tests verify application behavior, not Cosmos protocol
compatibility or Azure permissions. Bicep compilation validates the template
syntax/types, not regional F1 availability or the account's quota.

## Demo limitations and legacy code

Employee ID 1007 is **not authentication**. Every visitor shares one board, can
see/change its tasks, and may encounter concurrent-edit messages. Cookies only
remember that the visitor opened the demo. Do not store personal information.
Real accounts would need a separate authentication and authorization design.

The original Angular 14 frontend remains legacy code. Building it with Node 22
is a practical compatibility check, not an official Angular 14 support guarantee.
The deployed backend uses its own current dependency lockfile; it does not
install the old root server dependencies. A frontend framework upgrade is
separate work.

The old repository contained a database connection string in
`server/data/config.json`. That file is removed from current code. Revoke or
rotate any credentials that appeared there: deleting it does not remove Git
history or copies already downloaded. This demo uses a newly created Cosmos
database, never the old database.
