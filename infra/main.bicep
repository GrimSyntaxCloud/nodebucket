targetScope = 'resourceGroup'

@description('Region must support both Linux F1 App Service and Cosmos DB. No paid fallback.')
param location string = resourceGroup().location

@description('Globally unique web app name, for example nodebucket-amdev-1234.')
@minLength(3)
@maxLength(40)
param appName string

@description('Globally unique lowercase Cosmos DB account name.')
@minLength(3)
@maxLength(40)
param cosmosName string

param githubRepository string = 'GrimSyntaxCloud/nodebucket'

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: '${appName}-free'
  location: location
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource site 'Microsoft.Web/sites@2024-11-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server/index.js'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
    }
  }
}

resource scmAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-11-01' = {
  parent: site
  name: 'scm'
  properties: {
    allow: false
  }
}

resource ftpAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-11-01' = {
  parent: site
  name: 'ftp'
  properties: {
    allow: false
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: cosmosName
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    capacity: {
      totalThroughputLimit: 1000
    }
    apiProperties: {
      serverVersion: '4.2'
    }
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Local'
      }
    }
    // Only this web app's possible outbound addresses can reach the DB.
    ipRules: map(split(site.properties.possibleOutboundIpAddresses, ','), ip => {
      ipAddressOrRange: ip
    })
    publicNetworkAccess: 'Enabled'
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-11-15' = {
  parent: cosmos
  name: 'nodebucket'
  properties: {
    resource: {
      id: 'nodebucket'
    }
  }
}

resource employees 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases/collections@2024-11-15' = {
  parent: database
  name: 'employees'
  properties: {
    resource: {
      id: 'employees'
      indexes: [
        {
          key: {
            keys: ['_id']
          }
          options: {
            unique: true
          }
        }
      ]
    }
    options: {
      throughput: 400
    }
  }
}

resource settings 'Microsoft.Web/sites/config@2024-11-01' = {
  parent: site
  name: 'appsettings'
  properties: {
    NODE_ENV: 'production'
    MONGODB_DATABASE: database.name
    MONGODB_URI: cosmos.listConnectionStrings().connectionStrings[0].connectionString
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
    WEBSITE_RUN_FROM_PACKAGE: '1'
  }
  dependsOn: [employees]
}

resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${appName}-github'
  location: location
}

resource federation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deployIdentity
  name: 'github-azure-environment'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:${githubRepository}:environment:azure'
    audiences: ['api://AzureADTokenExchange']
  }
}

// Website Contributor, scoped to this app rather than the subscription.
resource deployRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(site.id, deployIdentity.id, 'website-contributor')
  scope: site
  properties: {
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'de139f84-1756-47ae-9be6-808fbbe84772')
  }
}

output appUrl string = 'https://${site.properties.defaultHostName}'
output azureClientId string = deployIdentity.properties.clientId
output azureTenantId string = tenant().tenantId
output azureSubscriptionId string = subscription().subscriptionId
output azureWebAppName string = site.name
