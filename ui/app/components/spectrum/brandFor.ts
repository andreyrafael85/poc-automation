import type { BrandGlyph } from './brandGlyphs';

/**
 * Which official glyph names a vendor or a technology as the platform reports it (3.2.3), or
 * `null` when the gallery has none — then the caller draws the functional icon of the kind
 * (database, queue, process), never an invented logo.
 */

/** A database vendor as `databaseVendor` reports it ("SQL Server", "PostgreSQL"…). */
export function databaseGlyph(vendor: string): BrandGlyph | null {
  const name = vendor.toLowerCase();
  if (/sql\s*server|mssql|microsoft sql/.test(name)) return 'sqlServer';
  if (name.includes('postgre')) return 'postgresql';
  if (name.includes('mariadb')) return 'mariadb';
  if (name.includes('mysql')) return 'mysql';
  if (name.includes('oracle')) return 'oracle';
  if (name.includes('mongo')) return 'mongodb';
  if (name.includes('redis')) return 'redis';
  if (name.includes('cassandra')) return 'cassandra';
  if (name.includes('db2')) return 'db2';
  return null;
}

/** An observability vendor found running next to OneAgent (`models/competitor.ts` names them). */
export function vendorGlyph(vendor: string): BrandGlyph | null {
  const name = vendor.toLowerCase();
  if (name.includes('new relic') || name.includes('newrelic')) return 'newRelic';
  if (name.includes('appdynamics')) return 'appDynamics';
  if (name.includes('splunk')) return 'splunk';
  if (name.includes('elastic')) return 'elastic';
  return null;
}
