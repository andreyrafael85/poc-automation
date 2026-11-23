import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_FIELDS,
  containsSensitiveData,
  redactText,
  sanitizeRecord,
  sanitizeRecords,
} from '../utils/sanitize';

/**
 * Hard gate on the export path.
 *
 * The shapes tested here are the ones actually present in the Grail records this
 * app reads: `user.email` and `user.id` on billing and query-execution events,
 * and a tenant URL in any free text. If this suite fails, the export is not safe
 * to share and the build must not pass.
 */

describe('redactText', () => {
  it('removes email addresses', () => {
    const output = redactText('Query run by someone.person@example.com at 10:00');
    expect(output).not.toContain('someone.person@example.com');
    expect(output).toContain('[redacted]');
  });

  it('removes Dynatrace environment URLs before other patterns can partially match them', () => {
    const output = redactText('See https://abc12345.apps.dynatrace.com/ui/apps/my.app for detail');
    expect(output).not.toContain('abc12345');
    expect(output).not.toContain('dynatrace.com');
  });

  it('removes API tokens and bearer credentials', () => {
    expect(redactText('Authorization: Bearer eyJhbGciOiJI.abc-123')).not.toContain('eyJhbGciOiJI');
    // A synthetic token, assembled at run time so secret scanners do not flag the fixture itself.
    expect(redactText(`token ${['dt0c01', 'ABC123DEF456'].join('.')}`)).not.toContain('ABC123DEF456');
  });

  it('removes UUIDs, which identify users and workflow executions', () => {
    const output = redactText('user 00000000-1111-2222-3333-444444444444 ran this');
    expect(output).not.toContain('00000000-1111-2222-3333-444444444444');
  });

  it('removes IPv4 addresses', () => {
    expect(redactText('host at 10.42.13.7 responded')).not.toContain('10.42.13.7');
  });

  it('redacts secrets written as a key and its value, keeping the key (3.2.4, S6)', () => {
    const line = 'GET /login?user=ana&password=hunter2&next=/home api_key: "abc 123" token=eyJ0 secret=\'s3\'';
    const output = redactText(line);
    for (const secret of ['hunter2', 'abc 123', 'eyJ0', "s3'"]) expect(output).not.toContain(secret);
    expect(output).toContain('password=[redacted]');
    expect(output).toContain('next=/home');
    expect(redactText('auth-token-service answered 200')).toBe('auth-token-service answered 200');
  });

  it('leaves ordinary technical text untouched', () => {
    const input = 'Workload sqs-demo restarted 681 times in cluster loan-app-dynakube';
    expect(redactText(input)).toBe(input);
  });
});

describe('sanitizeRecord', () => {
  it('drops every forbidden field', () => {
    const record = {
      'user.email': 'someone@example.com',
      'user.id': '99999999-8888-7777-6666-555555555555',
      environment: 'abc12345',
      query_string: 'fetch logs | filter secret == "value"',
      table: 'logs',
      scanned_bytes: 12345,
    };
    const output = sanitizeRecord(record);

    for (const field of FORBIDDEN_FIELDS) {
      expect(output).not.toHaveProperty(field);
    }
    // Non-sensitive fields survive, otherwise the export would be useless.
    expect(output.table).toBe('logs');
    expect(output.scanned_bytes).toBe(12345);
  });

  it('redacts sensitive content inside surviving string fields', () => {
    const output = sanitizeRecord({ note: 'raised by ops@example.com' });
    expect(String(output.note)).not.toContain('ops@example.com');
  });

  it('redacts sensitive content inside array fields', () => {
    const output = sanitizeRecord({
      affected_entity_names: ['svc-a', 'contact admin@example.com'],
    });
    expect(JSON.stringify(output)).not.toContain('admin@example.com');
    expect(JSON.stringify(output)).toContain('svc-a');
  });

  it('preserves non-string scalar types rather than stringifying them', () => {
    const output = sanitizeRecord({ count: 42, flag: true, missing: null });
    expect(output.count).toBe(42);
    expect(output.flag).toBe(true);
    expect(output.missing).toBeNull();
  });
});

describe('sanitizeRecords', () => {
  it('produces output that no longer trips the sensitivity check', () => {
    const records = [
      { 'user.email': 'a@example.com', detail: 'see https://xyz98765.apps.dynatrace.com/x' },
      { 'user.email': 'b@example.com', detail: 'contact b@example.com' },
    ];
    const output = sanitizeRecords(records);
    expect(containsSensitiveData(JSON.stringify(output))).toBe(false);
  });
});

describe('containsSensitiveData', () => {
  it('detects each category it is meant to guard against', () => {
    expect(containsSensitiveData('a@b.co')).toBe(true);
    expect(containsSensitiveData('https://abc12345.apps.dynatrace.com')).toBe(true);
    expect(containsSensitiveData('Bearer abc.def')).toBe(true);
  });

  it('does not flag clean technical text', () => {
    expect(containsSensitiveData('68 hosts, 71 services, 6 clusters')).toBe(false);
  });
});
