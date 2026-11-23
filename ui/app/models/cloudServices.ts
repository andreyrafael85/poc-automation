import { num, str, type GrailRecord } from '../utils/records';
import { type CloudProvider } from './cloud';

/**
 * Monitored cloud services, folded out of the raw Smartscape entity types.
 *
 * The topology exposes thousands of provider-specific nodes, but most are cloud
 * INVENTORY/CSPM objects — configurations, patch results, IAM roles, security
 * groups, network interfaces, volumes, backups — not services Dynatrace is
 * monitoring. Counting those inflates the estate and misrepresents it. So this
 * model uses an ALLOW-LIST of primary managed-service types (Lambda, RDS, SQS,
 * App Service, PostgreSQL, AKS, Apigee, ...): only a primary service resource is
 * counted, its config/child objects are ignored, and compute hosts (EC2 / VMs /
 * GCE) are excluded because they are counted as hosts elsewhere. The result is
 * an honest "which cloud services are monitored" view that holds on any tenant.
 */

export interface CloudService {
  provider: CloudProvider;
  /** Friendly service family, e.g. "Lambda", "PostgreSQL", "Apigee". */
  family: string;
  /** Number of monitored resources of this family. */
  resources: number;
}

export interface CloudServicesSummary {
  services: CloudService[];
  byProvider: Record<CloudProvider, CloudService[]>;
  providerCount: number;
  /** Distinct (provider, family) pairs — the count of monitored service families. */
  serviceFamilyCount: number;
  totalResources: number;
  topServices: CloudService[];
}

/**
 * Allow-list of PRIMARY managed-service entity types → friendly family.
 *
 * Keyed by the exact Smartscape type so config/child objects (…_CONFIGURATIONS,
 * …_BACKUPS, …_PATCHINSTALLATIONRESULTS) and infra/identity/networking inventory
 * (IAM, security groups, volumes, subnets, load-balancer children) never count.
 * Compute hosts (EC2 instances, Azure VMs, GCE instances) are deliberately
 * absent — they are counted as hosts, not as services.
 */
const MONITORED_SERVICE: Record<string, string> = {
  // ---- AWS
  AWS_LAMBDA_FUNCTION: 'Lambda',
  AWS_S3_BUCKET: 'S3',
  AWS_RDS_DBINSTANCE: 'RDS',
  AWS_DYNAMODB_TABLE: 'DynamoDB',
  AWS_SQS_QUEUE: 'SQS',
  AWS_SNS_TOPIC: 'SNS',
  AWS_ELASTICACHE_CACHECLUSTER: 'ElastiCache',
  AWS_ELASTICACHE_SERVERLESSCACHE: 'ElastiCache',
  AWS_EKS_CLUSTER: 'EKS (Kubernetes)',
  AWS_ECS_CLUSTER: 'ECS',
  AWS_ECS_SERVICE: 'ECS',
  AWS_ECR_REPOSITORY: 'ECR (registry)',
  AWS_APIGATEWAY_RESTAPI: 'API Gateway',
  AWS_APIGATEWAYV2_API: 'API Gateway',
  AWS_CLOUDFRONT_DISTRIBUTION: 'CloudFront',
  AWS_ELASTICLOADBALANCINGV2_LOADBALANCER: 'Load Balancing',
  AWS_ELASTICLOADBALANCING_LOADBALANCER: 'Load Balancing',
  AWS_KINESIS_STREAM: 'Kinesis',
  AWS_KINESISFIREHOSE_DELIVERYSTREAM: 'Kinesis Firehose',
  AWS_EFS_FILESYSTEM: 'EFS',
  AWS_MSK_CLUSTER: 'MSK (Kafka)',
  AWS_ATHENA_WORKGROUP: 'Athena',
  AWS_BEDROCK_AGENT: 'Bedrock',
  AWS_CODEBUILD_PROJECT: 'CodeBuild',
  AWS_ELASTICBEANSTALK_APPLICATION: 'Elastic Beanstalk',
  AWS_EVENTS_RULE: 'EventBridge',
  AWS_EVENTS_EVENTBUS: 'EventBridge',
  AWS_CASSANDRA_KEYSPACE: 'Keyspaces',
  AWS_APPRUNNER_SERVICE: 'App Runner',
  AWS_STEPFUNCTIONS_STATEMACHINE: 'Step Functions',
  AWS_SECRETSMANAGER_SECRET: 'Secrets Manager',
  AWS_KMS_KEY: 'KMS',
  AWS_ROUTE53_HOSTEDZONE: 'Route 53',
  // ---- Azure (Microsoft.<service>_<primary>)
  AZURE_MICROSOFT_WEB_SITES: 'App Service',
  AZURE_MICROSOFT_WEB_SERVERFARMS: 'App Service',
  AZURE_MICROSOFT_DBFORPOSTGRESQL_FLEXIBLESERVERS: 'PostgreSQL',
  AZURE_MICROSOFT_DBFORMYSQL_FLEXIBLESERVERS: 'MySQL',
  AZURE_MICROSOFT_SQL_SERVERS: 'SQL Database',
  AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS: 'Storage',
  AZURE_MICROSOFT_CONTAINERSERVICE_MANAGEDCLUSTERS: 'AKS (Kubernetes)',
  AZURE_MICROSOFT_CONTAINERREGISTRY_REGISTRIES: 'Container Registry',
  AZURE_MICROSOFT_DOCUMENTDB_MONGOCLUSTERS: 'Cosmos DB',
  AZURE_MICROSOFT_KEYVAULT_VAULTS: 'Key Vault',
  AZURE_MICROSOFT_SERVICEBUS_NAMESPACES: 'Service Bus',
  AZURE_MICROSOFT_EVENTHUB_NAMESPACES: 'Event Hubs',
  AZURE_MICROSOFT_APP_CONTAINERAPPS: 'Container Apps',
  AZURE_MICROSOFT_APP_MANAGEDENVIRONMENTS: 'Container Apps',
  AZURE_MICROSOFT_COGNITIVESERVICES_ACCOUNTS: 'Cognitive Services',
  AZURE_MICROSOFT_LOGIC_WORKFLOWS: 'Logic Apps',
  AZURE_MICROSOFT_EVENTGRID_SYSTEMTOPICS: 'Event Grid',
  AZURE_MICROSOFT_CACHE_REDIS: 'Cache / Redis',
};

/**
 * GCP monitored services keyed by a token found in the type. GCP uses several
 * type forms (`GCP_…`, `GOOGLE_CLOUD_…`, `cloud:gcp:…`); compute/Kubernetes
 * nodes are hosts and are excluded here.
 */
const GCP_SERVICE_TOKEN: { token: string; family: string }[] = [
  { token: 'APIGEE', family: 'Apigee' },
  { token: 'PUBSUB', family: 'Pub/Sub' },
  { token: 'CLOUD_RUN', family: 'Cloud Run' },
  { token: 'FUNCTION', family: 'Cloud Functions' },
  { token: 'BIGQUERY', family: 'BigQuery' },
  { token: 'SPANNER', family: 'Spanner' },
  { token: 'FILESTORE', family: 'Filestore' },
  { token: 'FIRESTORE', family: 'Firestore' },
  { token: 'CLOUDSQL', family: 'Cloud SQL' },
  { token: 'BUCKET', family: 'Cloud Storage' },
  { token: 'GCS', family: 'Cloud Storage' },
];

/** True when a GCP type is a compute/Kubernetes host, not a managed service. */
function isGcpHostType(upper: string): boolean {
  return (
    upper.includes('COMPUTE') ||
    upper.includes('INSTANCE') ||
    upper.includes('GKE') ||
    upper.includes('KUBERNETES') ||
    upper.includes('K8S')
  );
}

/**
 * Parses a Smartscape entity type into a provider and a friendly service family,
 * returning null for anything that is not a primary monitored cloud service
 * (inventory/config objects, infra primitives and compute hosts all yield null).
 */
export function parseCloudType(type: string): { provider: CloudProvider; family: string } | null {
  const family = MONITORED_SERVICE[type];
  if (family !== undefined) {
    const provider: CloudProvider = type.startsWith('AWS_') ? 'AWS' : 'Azure';
    return { provider, family };
  }
  const upper = type.toUpperCase();
  const isGcp = upper.startsWith('GCP_') || upper.startsWith('GOOGLE_') || upper.startsWith('CLOUD:GCP:');
  if (isGcp && !isGcpHostType(upper)) {
    for (const { token, family: gcpFamily } of GCP_SERVICE_TOKEN) {
      if (upper.includes(token)) return { provider: 'GCP', family: gcpFamily };
    }
  }
  return null;
}

const EMPTY_BY_PROVIDER = (): Record<CloudProvider, CloudService[]> => ({
  AWS: [],
  Azure: [],
  GCP: [],
  Other: [],
});

export function summariseCloudServices(records: readonly GrailRecord[]): CloudServicesSummary {
  const byKey = new Map<string, CloudService>();
  for (const record of records) {
    const type = str(record, 'type');
    if (type === null) continue;
    const parsed = parseCloudType(type);
    if (parsed === null) continue;
    const key = `${parsed.provider}::${parsed.family}`;
    const existing = byKey.get(key);
    const resources = num(record, 'resources') ?? 0;
    if (existing === undefined) {
      byKey.set(key, { provider: parsed.provider, family: parsed.family, resources });
    } else {
      existing.resources += resources;
    }
  }

  const services = [...byKey.values()].sort((a, b) => b.resources - a.resources);
  const byProvider = EMPTY_BY_PROVIDER();
  for (const service of services) byProvider[service.provider].push(service);

  const providers = (Object.keys(byProvider) as CloudProvider[]).filter(
    (provider) => byProvider[provider].length > 0,
  );

  return {
    services,
    byProvider,
    providerCount: providers.length,
    serviceFamilyCount: services.length,
    totalResources: services.reduce((sum, service) => sum + service.resources, 0),
    topServices: services.slice(0, 8),
  };
}
