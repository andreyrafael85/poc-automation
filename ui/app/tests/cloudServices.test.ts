import { describe, expect, it } from 'vitest';

import { parseCloudType, summariseCloudServices } from '../models/cloudServices';

/**
 * Folding raw Smartscape cloud entity types into friendly service families —
 * the "which cloud services are monitored" view for the SE.
 */
describe('parseCloudType', () => {
  it('maps AWS types to their service family', () => {
    expect(parseCloudType('AWS_LAMBDA_FUNCTION')).toEqual({ provider: 'AWS', family: 'Lambda' });
    expect(parseCloudType('AWS_S3_BUCKET')).toEqual({ provider: 'AWS', family: 'S3' });
    expect(parseCloudType('AWS_DYNAMODB_TABLE')).toEqual({ provider: 'AWS', family: 'DynamoDB' });
    // Both API Gateway generations fold into one family.
    expect(parseCloudType('AWS_APIGATEWAYV2_API')?.family).toBe('API Gateway');
  });

  it('excludes config/child objects and infra inventory, keeping the primary service', () => {
    // The primary Azure PostgreSQL server counts...
    expect(parseCloudType('AZURE_MICROSOFT_DBFORPOSTGRESQL_FLEXIBLESERVERS')).toEqual({
      provider: 'Azure',
      family: 'PostgreSQL',
    });
    // ...but its CONFIGURATIONS child (thousands of them) must not.
    expect(parseCloudType('AZURE_MICROSOFT_DBFORPOSTGRESQL_FLEXIBLESERVERS_CONFIGURATIONS')).toBeNull();
    expect(parseCloudType('AZURE_MICROSOFT_CONTAINERSERVICE_MANAGEDCLUSTERS')?.family).toBe('AKS (Kubernetes)');
    // Inventory/identity/compute-host noise is not a monitored service.
    expect(parseCloudType('AWS_IAM_ROLE')).toBeNull();
    expect(parseCloudType('AWS_EC2_SECURITYGROUP')).toBeNull();
    expect(parseCloudType('AWS_EC2_INSTANCE')).toBeNull();
    expect(parseCloudType('AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES')).toBeNull();
  });

  it('maps GCP Apigee and ignores non-cloud types', () => {
    expect(parseCloudType('GOOGLE_CLOUD_APIGEE_PROXY')?.provider).toBe('GCP');
    expect(parseCloudType('CONTAINER')).toBeNull();
    expect(parseCloudType('HOST')).toBeNull();
  });
});

describe('summariseCloudServices', () => {
  it('aggregates resources by provider and family, folding API Gateway generations', () => {
    const summary = summariseCloudServices([
      { type: 'AWS_LAMBDA_FUNCTION', resources: 87 },
      { type: 'AWS_S3_BUCKET', resources: 53 },
      { type: 'AWS_APIGATEWAY_RESTAPI', resources: 27 },
      { type: 'AWS_APIGATEWAYV2_API', resources: 25 },
      { type: 'AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS', resources: 16 },
      { type: 'AWS_IAM_ROLE', resources: 999 }, // inventory noise, must be excluded
      { type: 'CONTAINER', resources: 999 }, // ignored (not cloud)
    ]);
    const apiGw = summary.services.find((s) => s.family === 'API Gateway');
    expect(apiGw?.resources).toBe(52); // 27 + 25 merged
    expect(summary.providerCount).toBe(2); // AWS + Azure
    expect(summary.byProvider.AWS.length).toBeGreaterThan(0);
    // IAM roles and non-cloud types never inflate the count.
    expect(summary.totalResources).toBe(87 + 53 + 52 + 16);
    // Sorted by resource count, Lambda leads.
    expect(summary.services[0]!.family).toBe('Lambda');
  });

  it('returns an empty, honest summary for no cloud services', () => {
    const summary = summariseCloudServices([]);
    expect(summary.serviceFamilyCount).toBe(0);
    expect(summary.totalResources).toBe(0);
    expect(summary.providerCount).toBe(0);
  });
});
