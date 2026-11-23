import { describe, expect, it } from 'vitest';

import { summariseRca, parseRcaNarrative, buildProblemLink, buildLogsLink, buildIncidentLogsDql, incidentLogWindow, summariseIncidentLogs } from '../models/rca';

/**
 * The War Room selects one incident deterministically and never invents a field
 * the platform did not populate.
 */
describe('summariseRca', () => {
  const incidentA = {
    displayId: 'P-1',
    name: 'Response time degradation',
    category: 'SLOWDOWN',
    status: 'CLOSED',
    severity: 3,
    impact: ['Services'],
    affectedNames: ['svcA', 'svcB', 'svcC', 'svcD', 'svcE'],
    affectedTypes: ['dt.entity.service'],
    relatedNames: ['pod-1', 'host-1'],
    affectedIds: ['SERVICE-4CA8A383F8400A11', 'SERVICE-735D88A54ACBBC95'],
    relatedIds: ['HOST-D60FBA23F0A373E4', 'KUBERNETES_CLUSTER-19DCC3FB70584AD9'],
    rootCauseName: 'offer_service',
    rootCauseId: 'SERVICE-1',
    eventId: '-123_456V2',
    start: '2026-08-26T18:48:00.000000000Z',
    end: '2026-08-26T19:43:00.000000000Z',
    durationNs: 3_300_000_000_000,
    affectedCount: 5,
    cluster: ['loan-app'],
    namespace: ['easytrade'],
    workload: ['offerservice'],
    description: '# Response time degradation\n\nA root-cause was detected:\n\n**Service, offer_service**\n\n- unexpected load',
  };
  const incidentB = { ...incidentA, displayId: 'P-2', affectedCount: 2, rootCauseName: null, namespace: ['other'] };

  it('picks the first (highest-impact) incident and lists the rest as others', () => {
    const rca = summariseRca([incidentA, incidentB], [{ total: 100, rootCaused: 40, active: 5, resolved: 95, avgAffected: 1.2 }], []);
    expect(rca.hasData).toBe(true);
    expect(rca.incident?.displayId).toBe('P-1');
    expect(rca.incident?.rootCauseName).toBe('offer_service');
    expect(rca.incident?.affectedNames.length).toBe(5);
    expect(rca.others.map((o) => o.displayId)).toEqual(['P-2']);
    expect(rca.kpi.total).toBe(100);
    expect(rca.kpi.rootCaused).toBe(40);
  });

  it('flags the log namespace that matches the incident', () => {
    const rca = summariseRca(
      [incidentA],
      [],
      [
        { namespace: 'easytrade', errors: 498, warnings: 12 },
        { namespace: 'kube-system', errors: 3, warnings: 0 },
      ],
    );
    const match = rca.logs.find((row) => row.namespace === 'easytrade');
    expect(match?.matchesIncident).toBe(true);
    expect(rca.logs.find((row) => row.namespace === 'kube-system')?.matchesIncident).toBe(false);
  });

  it('is an honest empty state with no problems', () => {
    const rca = summariseRca([], [], []);
    expect(rca.hasData).toBe(false);
    expect(rca.incident).toBeNull();
  });

  it('builds the KPI sparkline series from the daily trend, keeping the last 7 points', () => {
    const days = Array.from({ length: 9 }, (_, i) => ({
      day: `2026-09-0${i + 1}`,
      opened: 800 + i,
      rootCaused: i,
      avgAffected: 1 + i / 100,
    }));
    const rca = summariseRca([incidentA], [], [], 15, days);
    expect(rca.trend.opened.length).toBe(7);
    expect(rca.trend.opened[0]).toBe(802);
    expect(rca.trend.opened[6]).toBe(808);
    expect(rca.trend.rootCaused.length).toBe(7);
    expect(rca.trend.avgAffected[6]).toBeCloseTo(1.08, 5);
  });

  it('yields empty sparkline series when no trend is supplied', () => {
    const rca = summariseRca([incidentA], [], []);
    expect(rca.trend.opened).toEqual([]);
    expect(rca.trend.rootCaused).toEqual([]);
    expect(rca.trend.avgAffected).toEqual([]);
  });

  it('parses the top error signatures and the problem category mix', () => {
    const rca = summariseRca(
      [incidentA],
      [],
      [],
      15,
      [],
      [
        { signature: 'java.lang.OutOfMemoryError: Metaspace', count: 1441 },
        { signature: '', count: 5 },
        { signature: 'ignored', count: 0 },
      ],
      [
        { category: 'ERROR', count: 2665 },
        { category: 'SLOWDOWN', count: 634 },
        { category: 'NONE', count: 0 },
      ],
    );
    expect(rca.errorSignatures.length).toBe(1);
    expect(rca.errorSignatures[0]?.signature).toContain('OutOfMemoryError');
    expect(rca.categoryMix.map((row) => row.category)).toEqual(['ERROR', 'SLOWDOWN']);
  });
});

describe('parseRcaNarrative', () => {
  it('parses the Davis markdown into headings, labels and bullets, stripping asterisks', () => {
    const blocks = parseRcaNarrative('# Response time degradation\n\n**Service, offer_service**\n\n- unexpected high load\n- unexpected low load');
    expect(blocks[0]).toEqual({ kind: 'heading', text: 'Response time degradation' });
    expect(blocks.some((b) => b.kind === 'label' && b.text.includes('offer_service'))).toBe(true);
    expect(blocks.filter((b) => b.kind === 'bullet').length).toBe(2);
    // No raw markdown asterisks survive.
    expect(blocks.every((b) => b.kind === 'table' || !b.text.includes('**'))).toBe(true);
  });

  it('returns nothing for an absent narrative', () => {
    expect(parseRcaNarrative(null)).toEqual([]);
    expect(parseRcaNarrative('   ')).toEqual([]);
  });

  it('localizes the templated narrative to Portuguese, keeping the numbers', () => {
    const blocks = parseRcaNarrative(
      'The problem affects 5 entities overall.\nEndpoint GET api/Products has a slowdown.\n... and 11 more.',
      'pt-BR',
    );
    const text = blocks.map((b) => (b.kind === 'table' ? '' : b.text)).join(' | ');
    expect(text).toContain('O problema afeta 5 entidades no total.');
    expect(text).toContain('apresenta lentidão');
    expect(text).toContain('e mais 11');
  });
});

describe('buildProblemLink', () => {
  it('builds a Problems deep-link with window and id filter, url-encoded', () => {
    const link = buildProblemLink('-123_456V2', 'P-26086733', 15);
    expect(link).toContain('dynatrace.davis.problems/problem/-123_456V2');
    expect(link).toContain('from=now%28%29-15d');
    expect(link).toContain('to=now%28%29');
    expect(link).toContain('filters=ID+%3D+P-26086733');
    expect(buildProblemLink(null, 'P-1', 15)).toBeNull();
  });
});

describe('buildLogsLink', () => {
  it('builds an entity-scoped Logs-app deep link for the incident', () => {
    const rca = summariseRca(
      [
        {
          displayId: 'P-1',
          name: 'Response time degradation',
          category: 'SLOWDOWN',
          status: 'CLOSED',
          eventId: '-123_456V2',
          start: '2026-08-26T18:48:00.000Z',
          end: '2026-08-26T19:43:00.000Z',
          affectedIds: ['SERVICE-4CA8A383F8400A11', 'SERVICE-735D88A54ACBBC95'],
          relatedIds: ['HOST-D60FBA23F0A373E4', 'KUBERNETES_CLUSTER-19DCC3FB70584AD9'],
        },
      ],
      [],
      [],
    );
    const link = buildLogsLink(rca.incident);
    expect(link).not.toBeNull();
    const state = JSON.parse(decodeURIComponent(link!.replace('dynatrace.logs/#', '')));
    expect(state['dt.query']).toContain('SERVICE-4CA8A383F8400A11');
    expect(state['dt.query']).toContain('HOST-D60FBA23F0A373E4');
    expect(state['dt.query']).toContain('isServiceOfProcessGroup');
    expect(state['dt.query']).toContain('status == "ERROR" OR status == "WARN"');
    expect(state['dt.problem']['event.id']).toBe('-123_456V2');
    expect(state.analysisMode).toBe('logs');
  });
});

describe('incident logs', () => {
  const incidentA = {
    displayId: 'P-1',
    name: 'x',
    category: 'ERROR',
    status: 'CLOSED',
    eventId: '-1_2V2',
    start: '2026-09-10T04:42:00.000Z',
    end: '2026-09-10T04:54:00.000Z',
    affectedIds: ['SERVICE-E1990917A56EB6C5'],
    relatedIds: ['PROCESS_GROUP-6491D03AB3C97E13'],
  };

  it('builds an entity-scoped incident-logs query, or null without ids', () => {
    const dql = buildIncidentLogsDql(summariseRca([incidentA], [], []).incident);
    expect(dql).not.toBeNull();
    expect(dql).toContain('SERVICE-E1990917A56EB6C5');
    expect(dql).toContain('isServiceOfProcessGroup');
    expect(dql).toContain('status == "ERROR" or status == "WARN"');
    // The totals are counted in a second pass over the same scope, never from the listed signatures.
    expect(dql).toContain('| append [');
    expect(dql).toContain('fieldsAdd isTotal = true');
    expect(buildIncidentLogsDql(summariseRca([{ ...incidentA, affectedIds: [], relatedIds: [] }], [], []).incident)).toBeNull();
  });

  it('lets only well-formed entity ids reach the query text (Q6)', () => {
    const dql = buildIncidentLogsDql(
      summariseRca([{ ...incidentA, affectedIds: ['SERVICE-E1990917A56EB6C5', 'SERVICE-1") | fetch secrets'], relatedIds: ['not-an-id'] }], [], [])
        .incident,
    );
    expect(dql).toContain('SERVICE-E1990917A56EB6C5');
    expect(dql).not.toContain('fetch secrets');
    expect(dql).not.toContain('not-an-id');
    expect(
      buildIncidentLogsDql(summariseRca([{ ...incidentA, affectedIds: ['SERVICE-1'], relatedIds: [] }], [], []).incident),
    ).toBeNull();
  });

  it('reads at most six hours of logs, whether the problem is still open or lasted days (Q6)', () => {
    const now = Date.parse('2026-09-12T00:00:00.000Z');
    const open = incidentLogWindow({ ...summariseRca([incidentA], [], []).incident!, endIso: null }, now);
    expect(Date.parse(open.endIso) - Date.parse(open.startIso)).toBe(6 * 3_600_000);
    const short = incidentLogWindow(summariseRca([incidentA], [], []).incident, now);
    // The incident's own window, padded: well under the cap.
    expect(Date.parse(short.endIso) - Date.parse(short.startIso)).toBeLessThan(6 * 3_600_000);
    expect(short.startIso).toBe(new Date(Date.parse(incidentA.start as string) - 25 * 60_000).toISOString());
  });

  it('takes the totals from the tagged totals row, not by adding the listed signatures', () => {
    // 1,488 error/warn logs in the incident, of which the eight listed signatures cover 133.
    const logs = summariseIncidentLogs([
      { sig: 'Connection refused', count: 50, errors: 0, isTotal: null },
      { sig: 'Read timed out', count: 83, errors: 83, isTotal: null },
      { sig: null, count: 1488, errors: 841, isTotal: true },
    ]);
    expect(logs.total).toBe(1488);
    expect(logs.errors).toBe(841);
    expect(logs.warnings).toBe(647);
    expect(logs.signatures).toHaveLength(2);
  });

  it('redacts personal data and strips control characters from log signatures before they reach the page or the deck', () => {
    // The first line of a raw log is customer text; it travels into the customer PPTX (3.2.1).
    const logs = summariseIncidentLogs([
      { sig: '\u001b[31mLogin failed for ana@cliente.example from 10.2.3.4', count: 3, errors: 3 },
    ]);
    const signature = logs.signatures[0]?.signature ?? '';
    expect(signature).not.toContain('ana@cliente.example');
    expect(signature).not.toContain('10.2.3.4');
    expect(signature).not.toMatch(/[\u0000-\u001f]/);
    expect(signature).toContain('Login failed for');
  });

  it('reports content, no-content and no-rows honestly', () => {
    const withContent = summariseIncidentLogs([
      { sig: 'java.lang.OutOfMemoryError: Metaspace', count: 12, errors: 12 },
      { sig: '', count: 4, errors: 0 },
    ]);
    expect(withContent.hasContent).toBe(true);
    expect(withContent.signatures[0]?.signature).toContain('OutOfMemoryError');
    expect(withContent.errors).toBe(12);
    expect(withContent.warnings).toBe(4);

    const noContent = summariseIncidentLogs([{ sig: '', count: 10, errors: 6 }]);
    expect(noContent.hasRows).toBe(true);
    expect(noContent.hasContent).toBe(false);

    const noRows = summariseIncidentLogs([]);
    expect(noRows.hasRows).toBe(false);
    expect(noRows.hasContent).toBe(false);
  });
});

describe('parseRcaNarrative — markdown beyond headings and bullets', () => {
  const doc = [
    '# Slow checkout',
    '',
    'A baseline was exceeded:',
    '',
    '| Signal | Baseline | Observed |',
    '| --- | :---: | ---: |',
    '| p95 latency | 120 ms | **480 ms** |',
    '| error rate | 0.1 % | 2.4 % |',
    '',
    '```',
    'fetch spans | filter dt.entity.service == "SERVICE-1"',
    '```',
    '',
    '- the `checkout` service restarted',
  ].join('\n');

  it('reads a pipe table as a header and body rows, without the separator or the pipes', () => {
    const table = parseRcaNarrative(doc).find((block) => block.kind === 'table');
    expect(table).toEqual({
      kind: 'table',
      header: ['Signal', 'Baseline', 'Observed'],
      rows: [
        ['p95 latency', '120 ms', '480 ms'],
        ['error rate', '0.1 %', '2.4 %'],
      ],
    });
  });

  it('keeps a fenced block verbatim as code, not as text lines', () => {
    const code = parseRcaNarrative(doc).find((block) => block.kind === 'code');
    expect(code).toEqual({ kind: 'code', text: 'fetch spans | filter dt.entity.service == "SERVICE-1"' });
  });

  it('leaves no table row, separator or fence behind as stray text', () => {
    const texts = parseRcaNarrative(doc).filter((block) => block.kind === 'text').map((block) => (block as { text: string }).text);
    expect(texts.join('\n')).not.toMatch(/\||---|```/);
  });

  it('keeps the surrounding structure: heading, label, bullet', () => {
    const kinds = parseRcaNarrative(doc).map((block) => block.kind);
    expect(kinds).toEqual(['heading', 'label', 'table', 'code', 'bullet']);
  });

  it('keeps inline code in the text for the renderer', () => {
    const bullet = parseRcaNarrative(doc).find((block) => block.kind === 'bullet') as { text: string };
    expect(bullet.text).toBe('the `checkout` service restarted');
  });

  it('treats a lone pipe line without a separator as ordinary text, not a table', () => {
    const blocks = parseRcaNarrative('| not | a table |');
    expect(blocks.map((block) => block.kind)).toEqual(['text']);
  });

  it('survives an unterminated fence', () => {
    const blocks = parseRcaNarrative('```\nlast line');
    expect(blocks).toEqual([{ kind: 'code', text: 'last line' }]);
  });
});
