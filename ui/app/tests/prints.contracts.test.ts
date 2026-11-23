import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PRINT_BUDGET } from '../features/wrapup/prints/deck/budget';
import { PRINT_DECK_KINDS, isPrintDeckSlide, type PrintDeckSlide } from '../features/wrapup/prints/deck/slides';
import {
  COMPANION_SUPPORTED,
  DOWNSCALE,
  JPEG_LADDER,
  JPEG_QUALITY,
  KIND_TEXT_KEY,
  LIMITS,
  MASK_FILL,
  MiB,
  NAV_WIDTH_CSS,
  PRINT_SPACE,
  SHOT_ID,
  THRESHOLDS,
} from '../features/wrapup/prints/constants';
import { GCP_PROJECT_MASK, HOST_IP_MASK, HOST_MASK, maskHostIp, numericTokens, parseScreenTimeframe, parseUiNumber, printText } from '../features/wrapup/prints/text';
import {
  EVIDENCE_OUTCOMES,
  EVIDENCE_SLOTS,
  type AnomalyRuleId,
  type EvidenceOutcome,
  type LinkEvidenceLevel,
  type MaskReason,
  type ShotKind,
  type SourceKind,
  type StoryStage,
} from '../features/wrapup/prints/types';
import { ALL_KEYS, translate, type StringKey } from '../i18n/strings';
import { REDACTED } from '../utils/sanitize';

/**
 * The contracts of the real-prints deck (3.2.7, WP1).
 *
 * Several work packages build this feature against `prints/types.ts`, `constants.ts`, `text.ts`
 * and the deck's slide kinds at the same time; these pin what they share: the shot id the
 * companion wrote (its ZIPs are still imported), the slide-kind dispatch, the budgets, the redaction of tenant text, the
 * reading of on-screen numbers and timeframes, and the thresholds the detector reads.
 */

const PRINTS = join(process.cwd(), 'ui/app/features/wrapup/prints');
const keys = new Set<string>(ALL_KEYS);
// ------------------------------------------------------------------ the shot id (3.3.2: the companion is retired, the ZIPs it wrote are still read)

describe('the shot id of the ZIPs the capture companion wrote', () => {
  it('accepts and refuses exactly the ids companion 1.x wrote', () => {
    const accepted = ['problem--p-260914359', 'root-cause--service-3a1b', 'k8s-cluster--k8s_cluster-87e7e0b19f2b0431', 'a', '0', `a${'b'.repeat(63)}`, 'custom--1'];
    const refused = [`a${'b'.repeat(64)}`, '', '-leading-dash', '_leading', 'Upper', 'with space', 'dot.ted', 'slash/ed', 'ünicode'];
    for (const id of accepted) expect(SHOT_ID.test(id), id).toBe(true);
    for (const id of refused) expect(SHOT_ID.test(id), id).toBe(false);
  });
});

// ------------------------------------------------------------------ slide kinds and budgets

describe('the print deck’s slide kinds', () => {
  it('recognises exactly its own kinds', () => {
    const own: Record<PrintDeckSlide['kind'], true> = { print: true, analysis: true, story: true, methodology: true };
    expect([...PRINT_DECK_KINDS].sort()).toEqual(Object.keys(own).sort());
    for (const kind of PRINT_DECK_KINDS) expect(isPrintDeckSlide({ kind }), kind).toBe(true);
  });

  it('never claims a slide of the Tech Wrapup deck', () => {
    for (const kind of ['cover', 'agenda', 'executive', 'divider', 'section', 'capture', 'end', '', 'Print', 'prints']) {
      expect(isPrintDeckSlide({ kind }), kind).toBe(false);
    }
  });
});

describe('PRINT_BUDGET', () => {
  it('holds positive whole numbers only', () => {
    for (const [name, value] of Object.entries(PRINT_BUDGET)) {
      expect(Number.isInteger(value) && value > 0, name).toBe(true);
    }
  });

  it('agrees with the limits and the slide rules', () => {
    expect(PRINT_BUDGET.pairs).toBe(LIMITS.deckPairs);
    expect(PRINT_BUDGET.pinsWithZoom).toBeLessThan(PRINT_BUDGET.pins);
    expect(PRINT_BUDGET.pins).toBe(6);
    expect(PRINT_BUDGET.kpis).toBe(4);
    expect(PRINT_BUDGET.findings).toBe(3);
    expect(PRINT_BUDGET.reco).toBe(2);
    expect(PRINT_BUDGET.storySteps).toBe(5);
    expect(PRINT_BUDGET.dqlLineChars).toBeLessThanOrEqual(PRINT_BUDGET.dqlCardChars);
    expect(PRINT_BUDGET.dqlLines).toBeLessThan(PRINT_BUDGET.dqlCardLines);
    // Cover, agenda, story, the pairs, methodology, its DQL pages (4 cards each, ≤ 3) and the end:
    // 7 pairs give 21 slides, 10 pairs 28.
    const slides = (pairs: number) => 1 + 1 + 1 + 2 * pairs + 1 + Math.min(PRINT_BUDGET.dqlPages, Math.ceil(pairs / 4)) + 1;
    expect(slides(7)).toBe(21);
    expect(slides(PRINT_BUDGET.pairs)).toBe(28);
  });

  it('leaves room for the alt text around the longest title, in both languages', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      const alt = translate('prt.deck.alt', locale, { title: 'x'.repeat(PRINT_BUDGET.title) });
      expect(alt.length, locale).toBeLessThanOrEqual(PRINT_BUDGET.alt);
    }
  });

  it('fits every anomaly headline and fallback headline in the pill (≤ 60 characters)', () => {
    const params = { minutes: '15', pct: '98,6 %', ratio: '24,9×', req: '100 %', used: '8,8 %', workload: 'kafka-broker', oom: '257', k: '4', count: '6', share: '39,4 %' };
    const headlineKeys = ALL_KEYS.filter((key) => key.startsWith('prt.anom.') || key.startsWith('prt.headline.'));
    expect(headlineKeys.length).toBeGreaterThanOrEqual(16 + 11);
    for (const key of headlineKeys) {
      for (const locale of ['en', 'pt-BR'] as const) {
        expect(translate(key, locale, params).length, `${key} / ${locale}`).toBeLessThanOrEqual(PRINT_BUDGET.headline);
      }
    }
  });
});

// ------------------------------------------------------------------ tenant text

describe('printText and maskHostIp', () => {
  const tenantUrl = 'https://abc12345.apps.dynatrace.com/ui/apps/dynatrace.services/explorer?detailsId=SERVICE-0123456789ABCDEF';
  const cloudapp = 'ag-env-public-br.2z2vq0abcdefghijklmn.bx.internal.cloudapp.net';
  const dirty = `Owner ana.silva@contoso.example on 10.1.2.3, host ip-172-31-93-120.ec2.internal and ${cloudapp}, see ${tenantUrl}`;

  it('redacts e-mails, IPs, cloud hosts and the tenant address in the Customer profile', () => {
    const text = printText(dirty, 400, 'customer');
    expect(text).not.toContain('ana.silva');
    expect(text).not.toContain('contoso.example');
    expect(text).not.toContain('10.1.2.3');
    expect(text).not.toContain('172-31-93-120');
    expect(text).not.toContain('ec2.internal');
    expect(text).not.toContain('2z2vq0');
    expect(text).not.toContain('cloudapp.net');
    expect(text).not.toContain('abc12345');
    expect(text).toContain(HOST_IP_MASK);
    expect(text).toContain(HOST_MASK);
    expect(text).toContain(REDACTED);
    expect(text.startsWith('Owner ')).toBe(true);
  });

  it('keeps host names for the SE but still redacts e-mails, IPs and the tenant URL', () => {
    const text = printText(dirty, 400, 'se');
    expect(text).toContain('ip-172-31-93-120.ec2.internal');
    expect(text).toContain(cloudapp);
    expect(text).not.toContain('ana.silva');
    expect(text).not.toContain('10.1.2.3');
    expect(text).not.toContain('abc12345');
  });

  it('masks a bare tenant host and a labs tenant for the customer only, never a public Dynatrace site', () => {
    const text = 'Captured on abc12345.apps.dynatrace.com and xyz98765.apps.dynatracelabs.com/ui/apps/x, docs on docs.dynatrace.com';
    const customer = printText(text, 400, 'customer');
    expect(customer).not.toContain('abc12345');
    expect(customer).not.toContain('xyz98765');
    expect(customer).toContain('docs.dynatrace.com');
    expect(printText(text, 400, 'se')).toContain('abc12345.apps.dynatrace.com');
  });

  it('masks a sprint/dev labs tenant whole for the customer, and redacts a labs tenant URL for the SE too', () => {
    const customer = printText('on abc12345.sprint.apps.dynatracelabs.com today', 200, 'customer');
    expect(customer).toBe(`on ${REDACTED} today`);
    const se = printText('see https://xyz98765.apps.dynatracelabs.com/ui/apps/x and https://abc12345.dev.apps.dynatracelabs.com/ui', 200, 'se');
    expect(se).not.toContain('xyz98765');
    expect(se).not.toContain('abc12345');
    expect(se).toBe(`see ${REDACTED} and ${REDACTED}`);
  });

  it('keeps a pt-BR count of a billion or more, which only looks like a dotted quad', () => {
    for (const profile of ['customer', 'se'] as const) {
      expect(printText('1.234.567.890 requisições em 7 dias', 200, profile)).toBe('1.234.567.890 requisições em 7 dias');
      expect(printText('12.344.567.890,5 (ou 2.345.678.901.234).', 200, profile)).toBe('12.344.567.890,5 (ou 2.345.678.901.234).');
      // Anything that could be an address, or that belongs to an e-mail or a secret, is still redacted.
      expect(printText('host 1.200.100.250 e 192.168.100.200', 200, profile)).toBe(`host ${REDACTED} e ${REDACTED}`);
      expect(printText('1.234.567.890@contoso.com', 200, profile)).toBe(REDACTED);
      expect(printText('token: 1.234.567.890 and password=1.234.567.890', 200, profile)).toBe(`token: ${REDACTED} and password=${REDACTED}`);
      expect(printText('at https://abc12345.apps.dynatrace.com/ui/x/1.234.567.890 now', 200, profile)).toBe(`at ${REDACTED} now`);
      // A marker forged in tenant text never brings a set-aside value back.
      expect(printText('0 1.234.567.890', 200, profile)).toBe('0 1.234.567.890');
    }
  });

  it('redacts an e-mail at a cloud host whole, local part included', () => {
    const text = printText('owner ana.silva@ip-10-0-1-2.ec2.internal, ops@node-a.us-central1.compute.internal', 200, 'customer');
    expect(text).not.toContain('ana.silva');
    expect(text).not.toContain('ops@');
  });

  it('masks an EC2 host whole, suffix included, and the other cloud-internal forms', () => {
    expect(maskHostIp('ip-172-31-93-120')).toBe(HOST_IP_MASK);
    expect(maskHostIp('ip-172-31-93-120.ec2.internal')).toBe(HOST_IP_MASK);
    expect(maskHostIp('on ip-10-0-1-2.us-east-2.compute.internal, then')).toBe(`on ${HOST_IP_MASK}, then`);
    expect(maskHostIp('node-a.us-central1.compute.internal')).toBe(HOST_MASK);
    expect(maskHostIp(cloudapp)).toBe(HOST_MASK);
    expect(maskHostIp(`${cloudapp}, then`)).toBe(`${HOST_MASK}, then`);
    expect(maskHostIp('vm-1.us-central1-a.c.contoso-prod-123.internal:8080')).toBe(`${HOST_MASK}:8080`);
    expect(maskHostIp('IP-10-0-1-2.EC2.INTERNAL')).toBe(HOST_IP_MASK);
    expect(maskHostIp('svc-ip-cache and vip-1-2-3-4')).toBe('svc-ip-cache and vip-1-2-3-4');
    expect(maskHostIp('ip-10-0-1-23456')).toBe('ip-10-0-1-23456');
  });

  it('masks public cloud, in-cluster and cut GCE names for the customer, and redacts IPv6 in both profiles (3.2.7 review PS-1)', () => {
    const names = [
      'ec2-54-210-12-34.compute-1.amazonaws.com',
      'db.abc123xyz.us-east-1.rds.amazonaws.com',
      'payments.prod.svc.cluster.local',
      'myvm.westeurope.cloudapp.azure.com',
      'shop-api.azurewebsites.net',
      'gke-ard-workshop-default-pool-6c5b1e2f-a.c.contoso-gke-lab-cut',
    ];
    for (const name of names) {
      const text = printText(`timeout calling ${name} after 30 s`, 200, 'customer');
      expect(text, name).toBe(`timeout calling ${HOST_MASK} after 30 s`);
      expect(printText(`timeout calling ${name} after 30 s`, 200, 'se'), name).toContain(name);
    }
    expect(printText('at gke-x-pool-1.c.contoso-prod.', 200, 'customer')).toBe(`at ${HOST_MASK}.`);
    // Cut inside its `.internal`: the project id still goes.
    for (const cut of ['.i', '.inter', '.interna']) {
      expect(printText(`node gke-ard-pool-#b-x#kq.c.contoso-gke-lab${cut}`, 200, 'customer'), cut).toBe(`node gke-ard-pool-#b-x#${HOST_MASK}`);
    }
    expect(maskHostIp('mirror.c.example.in.example.org')).toBe('mirror.c.example.in.example.org');
    // A GCP resource path names the project too (live on the lab tenant: kubelet's devices_linux.go line).
    const kubelet = 'W# #:#:#.# # devices_linux.go:#] Error evaluating symlink for volume projects/contoso-gke-lab/zon';
    expect(printText(kubelet, 200, 'customer')).toBe(`W# #:#:#.# # devices_linux.go:#] Error evaluating symlink for volume ${GCP_PROJECT_MASK}/zon`);
    expect(printText(kubelet, 200, 'se')).toContain('projects/contoso-gke-lab/zon');
    // Not a GCE fragment: a name that goes on after `.c.<label>`, and code that only has the shape.
    expect(maskHostIp('mirror.c.example.org')).toBe('mirror.c.example.org');
    for (const profile of ['customer', 'se'] as const) {
      expect(printText('peer fe80::1ff:fe23:4567:890a refused', 200, profile)).toBe(`peer ${REDACTED} refused`);
      expect(printText('from 2001:db8:85a3::8a2e:370:7334, retry', 200, profile)).toBe(`from ${REDACTED}, retry`);
      expect(printText('full 2001:0db8:85a3:0000:0000:8a2e:0370:7334', 200, profile)).toBe(`full ${REDACTED}`);
      // Clocks, MAC-like runs, C++/Ruby scopes and loopback stay.
      expect(printText('at 12:30:45 and 2026-09-22T22:44:00Z', 200, profile)).toBe('at 12:30:45 and 2026-09-22T22:44:00Z');
      expect(printText('std::vector Foo::Bar Db::Add 00:1a:2b:3c:4d:5e ::1', 200, profile)).toBe('std::vector Foo::Bar Db::Add 00:1a:2b:3c:4d:5e ::1');
    }
  });

  it('strips control characters, collapses blanks and cuts with an ellipsis', () => {
    expect(printText('a\u0007b\u001b[0m   c', 40, 'se')).toBe('ab[0m c');
    const cut = printText('word '.repeat(40), 30, 'customer');
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith('…')).toBe(true);
  });
});

// ------------------------------------------------------------------ numbers and windows read on a screen

describe('numbers read next to an anchor', () => {
  it('keeps numeric tokens only, never an IPv4, at most four', () => {
    expect(numericTokens('30 Users')).toEqual(['30']);
    expect(numericTokens('10.1.2.3')).toEqual([]);
    expect(numericTokens('10.100.200.250')).toEqual([]);
    expect(numericTokens('30 Users · 46 Sessions · 5 Events')).toEqual(['30', '46', '5']);
    expect(numericTokens('1.25K requests 8,559 calls 2.8% failed 13.7 cores 1 2 3')).toEqual(['1.25K', '8,559', '2.8%', '13.7']);
    expect(numericTokens('P-260914359 v1.2.3-beta')).toEqual([]);
  });


  it('parses the platform’s number forms', () => {
    expect(parseUiNumber('1.25K')).toBe(1250);
    expect(parseUiNumber('8,559')).toBe(8559);
    expect(parseUiNumber('13.7')).toBe(13.7);
    expect(parseUiNumber('30')).toBe(30);
    expect(parseUiNumber('1.1K')).toBe(1100);
    expect(parseUiNumber('2.5M')).toBe(2_500_000);
    expect(parseUiNumber('2.8%')).toBe(2.8);
    expect(parseUiNumber('1,234,567')).toBe(1_234_567);
    expect(parseUiNumber('1,234.5')).toBe(1234.5);
    expect(parseUiNumber('1.234,5')).toBe(1234.5);
    expect(parseUiNumber('13,7')).toBe(13.7);
    expect(parseUiNumber(' 46 ')).toBe(46);
  });

  it('returns null for anything that is not one number', () => {
    for (const raw of ['', 'Users', '10.1.2.3', '30 Users', '-5', '1e3', 'NaN', '12345', '1.2.3']) {
      expect(parseUiNumber(raw), raw).toBeNull();
    }
  });
});

describe('the screen’s own timeframe label', () => {
  it('reads the platform’s relative timeframes in minutes', () => {
    expect(parseScreenTimeframe('Last 30 minutes')).toBe(30);
    expect(parseScreenTimeframe('Last 2 hours')).toBe(120);
    expect(parseScreenTimeframe('Last 7 days')).toBe(10080);
    expect(parseScreenTimeframe('Last minute')).toBe(1);
    expect(parseScreenTimeframe('Last hour')).toBe(60);
    expect(parseScreenTimeframe('Last day')).toBe(1440);
    expect(parseScreenTimeframe('Last 1 hour')).toBe(60);
    expect(parseScreenTimeframe('  last 30   minutes ')).toBe(30);
  });

  it('returns null for anything else', () => {
    for (const label of [null, undefined, '', 'Last 0 minutes', 'Last 30 seconds', 'Next 2 hours', 'Last 2 weeks', 'Last 30 minutes ago', '22:14 – 23:24', 'Custom']) {
      expect(parseScreenTimeframe(label), String(label)).toBeNull();
    }
  });
});

// ------------------------------------------------------------------ constants

describe('constants', () => {
  it('keeps the print space, the downscale and the JPEG ladder consistent', () => {
    expect(PRINT_SPACE).toEqual({ width: 1720, height: 1080 });
    expect(PRINT_SPACE.width + NAV_WIDTH_CSS).toBe(1920);
    expect(DOWNSCALE.width / DOWNSCALE.height).toBeCloseTo(PRINT_SPACE.width / PRINT_SPACE.height, 6);
    expect(JPEG_LADDER[0]).toBe(JPEG_QUALITY);
    expect([...JPEG_LADDER]).toEqual([...JPEG_LADDER].sort((a, b) => b - a));
    expect(MASK_FILL).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('accepts companion 1.x only', () => {
    for (const version of ['1.0.0', '1.1.0', '1.12.3']) expect(COMPANION_SUPPORTED.test(version), version).toBe(true);
    for (const version of ['2.0.0', '0.9.0', '10.0.0', '']) expect(COMPANION_SUPPORTED.test(version), version).toBe(false);
  });

  it('states the limits the error messages quote', () => {
    expect(LIMITS.imageBytesIn).toBe(10 * MiB);
    expect(translate('prt.err.file.size', 'en')).toContain(`${LIMITS.imageBytesIn / MiB} MB`);
    expect(translate('prt.err.store.full', 'en')).toContain(`${LIMITS.docHardBytes / MiB} MB`);
    expect(LIMITS.docSoftBytes).toBeLessThan(LIMITS.docHardBytes);
    expect(LIMITS.planSlots + LIMITS.customSlots).toBe(LIMITS.prints);
    expect(LIMITS.minImage.width / LIMITS.minImage.height).toBeCloseTo(16 / 9, 6);
  });

  it('freezes THRESHOLDS all the way down', () => {
    expect(Object.isFrozen(THRESHOLDS)).toBe(true);
    expect(Object.isFrozen(THRESHOLDS.vitals)).toBe(true);
    expect(Object.isFrozen(THRESHOLDS.vitals.lcpMs)).toBe(true);
    expect(Object.isFrozen(THRESHOLDS.memReservedIdle)).toBe(true);
    expect(() => {
      (THRESHOLDS as unknown as Record<string, number>).oomHigh = 2;
    }).toThrow();
    expect(THRESHOLDS.oomHigh).toBe(1);
  });

  it('pins the Core Web Vitals goals the texts quote', () => {
    expect(THRESHOLDS.vitals.inpMs[0]).toBe(200);
    expect(translate('prt.anom.D6', 'en', { ratio: '2×' })).toContain(`${THRESHOLDS.vitals.inpMs[0]} ms`);
    expect(THRESHOLDS.vitals.lcpMs).toEqual([2500, 4000]);
    expect(THRESHOLDS.vitals.cls).toEqual([0.1, 0.25]);
  });

  const ANALYSIS = join(PRINTS, 'analysis');
  const sources = () =>
    [ANALYSIS, join(PRINTS, 'evidence')]
      .filter((dir) => existsSync(dir))
      .flatMap((dir) => readdirSync(dir).filter((name) => /\.tsx?$/.test(name)).map((name) => readFileSync(join(dir, name), 'utf8')))
      .join('\n');

  // Enabled once the evidence engine lands (WP5): every threshold must be read by the analysis.
  it.skipIf(!existsSync(join(ANALYSIS, 'anomalies.ts')))('reads every threshold in the analysis', () => {
    const text = sources();
    const unused: string[] = [];
    const walk = (value: object, path: string[]) => {
      for (const [key, child] of Object.entries(value)) {
        if (Array.isArray(child) || typeof child !== 'object') {
          if (!new RegExp(`\\b${key}\\b`).test(text)) unused.push([...path, key].join('.'));
        } else walk(child as object, [...path, key]);
      }
    };
    walk(THRESHOLDS, []);
    expect(unused).toEqual([]);
  });
});

// ------------------------------------------------------------------ i18n keys the contracts imply

describe('every typed value has its text', () => {
  const has = (key: string) => keys.has(key);

  it('titles, explains and headlines every shot kind', () => {
    const kinds: Record<ShotKind, true> = {
      problem: true,
      'root-cause': true,
      frontend: true,
      'k8s-cluster': true,
      'failing-service': true,
      'failed-requests': true,
      'logs-errors': true,
      smartscape: true,
      vulnerabilities: true,
      host: true,
      custom: true,
    };
    for (const kind of Object.keys(kinds) as ShotKind[]) {
      const suffix = KIND_TEXT_KEY[kind];
      for (const prefix of ['prt.title.', 'prt.what.', 'prt.headline.']) expect(has(`${prefix}${suffix}`), `${prefix}${suffix}`).toBe(true);
    }
  });

  it('names every anomaly rule, link level, source, story stage and mask reason', () => {
    const rules: Record<AnomalyRuleId, true> = {
      D1: true, D3: true, D4: true, D5a: true, D6: true, D7: true, D8a: true, D8b: true,
      D9: true, D11: true, D13: true, D14: true, D15: true, D16: true, D17: true, D18: true,
    };
    for (const rule of Object.keys(rules)) expect(has(`prt.anom.${rule}`), rule).toBe(true);
    const levels: Record<LinkEvidenceLevel, true> = { verified: true, observed: true, documented: true, guessed: true, manual: true };
    for (const level of Object.keys(levels)) expect(has(`prt.ev.${level}`), level).toBe(true);
    const sourcesOf: Record<SourceKind, true> = { davis: true, dql: true, rum: true, screen: true, app: true };
    for (const source of Object.keys(sourcesOf)) expect(has(`prt.src.${source}`), source).toBe(true);
    const stages: Record<StoryStage, true> = { symptom: true, onset: true, cause: true, evidence: true, pattern: true };
    for (const stage of Object.keys(stages)) {
      expect(has(`prt.story.stage.${stage}`), stage).toBe(true);
      expect(has(`prt.story.text.${stage}`), stage).toBe(true);
    }
    const reasons: Record<MaskReason | 'manual', string> = {
      email: 'email', ipv4: 'ipv4', 'tenant-url': 'tenantUrl', url: 'url', 'cloud-host': 'cloudHost', uuid: 'uuid', money: 'money', 'secret-pair': 'secretPair', manual: 'manual',
    };
    for (const suffix of Object.values(reasons)) expect(has(`prt.ed.reason.${suffix}`), suffix).toBe(true);
  });

  it('types the shot-kind keys for t()', () => {
    // Compile-time: every built key is a StringKey.
    const what: StringKey = `prt.what.${KIND_TEXT_KEY['root-cause']}`;
    expect(translate(what, 'pt-BR')).toMatch(/serviço/);
  });
});

// ------------------------------------------------------------------ evidence contracts

describe('evidence contracts', () => {
  it('has 23 distinct fixed slots', () => {
    expect(EVIDENCE_SLOTS).toHaveLength(23);
    expect(new Set(EVIDENCE_SLOTS).size).toBe(EVIDENCE_SLOTS.length);
  });

  it('ranks every outcome exactly once, ok first and error last', () => {
    const all: Record<EvidenceOutcome, true> = { disabled: true, loading: true, ok: true, partial: true, empty: true, 'no-permission': true, error: true };
    expect([...EVIDENCE_OUTCOMES].sort()).toEqual(Object.keys(all).sort());
    expect(EVIDENCE_OUTCOMES[0]).toBe('ok');
    expect(EVIDENCE_OUTCOMES[EVIDENCE_OUTCOMES.length - 1]).toBe('error');
  });
});
