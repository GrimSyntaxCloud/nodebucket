targetScope = 'resourceGroup'

@description('Region must support Free Static Web Apps and Cosmos DB.')
param location string = 'eastus2'

@minLength(3)
@maxLength(40)
param appName string

@minLength(3)
@maxLength(40)
param cosmosName string

resource site 'Microsoft.Web/staticSites@2024-11-01' = {
  name: appName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Disabled'
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
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
    // Managed Static Web Apps APIs have no dedicated outbound IP.
    // Cosmos requires TLS and its key; the key stays in API app settings.
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


resource settings 'Microsoft.Web/staticSites/config@2024-11-01' = {
  parent: site
  name: 'appsettings'
  properties: {
    MONGODB_DATABASE: database.name
    MONGODB_URI: cosmos.listConnectionStrings().connectionStrings[0].connectionString
  }
  dependsOn: [employees]
}

output appUrl string = 'https://${site.properties.defaultHostname}'
output azureStaticWebAppName string = site.name
