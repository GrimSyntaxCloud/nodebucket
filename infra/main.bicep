targetScope = 'resourceGroup'
param location string = 'eastus2'
param appName string = 'nodebucket-grimsyntaxcloud'
param existingCosmosName string = 'nodebucket-grimsyntaxcloud'
@secure()
@description('Collection-scoped MongoDB credential, supplied privately by the operator.')
param mongodbUri string
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' existing = { name: existingCosmosName }
resource database 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-11-15' existing = { parent: cosmos, name: 'portfolio-demos' }
resource site 'Microsoft.Web/staticSites@2024-11-01' = {
 name: appName
 location: location
 sku: { name: 'Free', tier: 'Free' }
 properties: {
  stagingEnvironmentPolicy: 'Disabled'
  buildProperties: { skipGithubActionWorkflowGeneration: true }
 }
}
resource settings 'Microsoft.Web/staticSites/config@2024-11-01' = {
 parent: site
 name: 'appsettings'
 properties: {
  MONGODB_DATABASE: database.name
  MONGODB_COLLECTION: 'employees'
  MONGODB_URI: mongodbUri
 }
}
output appUrl string = 'https://${site.properties.defaultHostname}'
