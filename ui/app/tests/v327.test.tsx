/* eslint-disable noSecrets/no-secrets -- entity ids and platform addresses of the validation tenant, not secrets */
import React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';

import { FlowMap } from '../components/spectrum/FlowMap';
import { StudioProvider } from '../config/StudioContext';

import { buildTrail } from '../features/rca/RcaTrail';
import type { WrapupModel } from '../features/wrapup/deck';
import { DeckPreview } from '../features/wrapup/DeckPreview';
import { DTFLOW_FONT_CSS } from '../features/wrapup/fonts';
import { captureLayout } from '../features/wrapup/geometry';
import { renderSlides } from '../features/wrapup/pptxTemplate';
import { CAPTURE_KPI_MIN_PT, buildDeckSpec, captureKpiFit, captureKpiPick, captureKpiValueSize, deckBoldEm, type CaptureSlide } from '../features/wrapup/spec';
import { translate, type StringKey } from '../i18n/strings';
import { FLOW_GEOMETRY, fitUnit, textPx } from '../models/flowMap';
import type { RcaIncident } from '../models/rca';
import { buildRootCallersDql, frontendIdMap, isDatabaseRoot, summariseRootCallers } from '../models/trailLinks';
import { getQuery } from '../queries/catalog';
import {
  entityLink,
  entityLinkEvidence,
  entityType,
  environmentBase,
  frontendPath,
  hostUrl,
  k8sClusterPath,
  logsFilterPath,
  servicePath,
} from '../utils/deepLinks';

/**
 * 3.2.7 — the v3.2.6 validation round. Each rule here was checked by reintroducing the defect it
 * guards against.
 */

const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);
const formatNumber = (value: number) => value.toLocaleString('en-GB');

// The owner's addresses from the validation, on whatever origin the test runtime reports.
const OWNER_SERVICE = `${environmentBase()}/ui/apps/dynatrace.services/explorer/services?perspective=performance&sort=healthIndicators%3Adescending&detailsId=SERVICE-C44033DE8492CF45&sidebarOpen=false`;
const OWNER_FRONTEND = `${environmentBase()}/ui/apps/dynatrace.experience.vitals/performance/web/FRONTEND-32E311F297817EA0`;
// A 4 × 2 PNG (the fixture of pptxTemplate.test.ts).
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEUlEQVR42mNk+M9QzwABjDAGACM8Au8Wy10JAAAAAElFTkSuQmCC';

// ------------------------------------------------------------------ deep links

describe('links into the platform name the page, never the launcher', () => {
  it('opens a service in the Services app exactly as the owner does', () => {
    expect(entityLink('SERVICE-C44033DE8492CF45')).toBe(OWNER_SERVICE);
    expect(servicePath('HOST-C44033DE8492CF45')).toBeNull();
  });

  it('opens a frontend on its Experience Vitals page, through the FRONTEND id when the app knows it', () => {
    expect(entityLink('APPLICATION-6331991FD4EFBB24', { frontendId: 'FRONTEND-32E311F297817EA0' })).toBe(OWNER_FRONTEND);
    expect(entityLink('FRONTEND-32E311F297817EA0')).toBe(OWNER_FRONTEND);
    // No mapping yet: the Experience Vitals intent, which the platform redirects to the same page.
    const viaIntent = frontendPath('APPLICATION-6331991FD4EFBB24');
    expect(viaIntent).toBe(`dynatrace.experience.vitals/intent/view-pages-views-waterfall#${encodeURIComponent('{"frontend":"APPLICATION-6331991FD4EFBB24"}')}`);
  });

  it('needs the Smartscape id for a Kubernetes cluster, and goes to a host through the infrastructure intent', () => {
    expect(k8sClusterPath('KUBERNETES_CLUSTER-19DCC3FB70584AD9')).toBeNull();
    expect(k8sClusterPath('K8S_CLUSTER-53B76CCF6F84D68E')).toContain('smartscape/K8S_CLUSTER?perspective=Health');
    expect(hostUrl('HOST-0000000000000001')).toBe(`${environmentBase()}/ui/intent/dynatrace.infraops/view_host#${encodeURIComponent('{"dt.entity.host":"HOST-0000000000000001"}')}`);
    expect(entityLinkEvidence('HOST-0000000000000001')).toBe('documented');
    expect(entityLinkEvidence('SERVICE-0000000000000001')).toBe('verified');
  });

  it('gives no link at all to a type with no known page, and never a generic or entity address', () => {
    for (const id of ['PROCESS_GROUP-6491D03AB3C97E13', 'SERVICE_INSTANCE-B60D817A6CF97133', 'CLOUD_APPLICATION-9419FF46C4EC2D01', 'not-an-id', null]) {
      expect(entityLink(id)).toBeNull();
    }
    const every = ['SERVICE-C44033DE8492CF45', 'APPLICATION-6331991FD4EFBB24', 'HOST-0000000000000001'].map((id) => entityLink(id) ?? '');
    for (const href of every) {
      expect(href).not.toContain('/ui/entity/');
      expect(href).not.toContain('dynatrace.launcher');
    }
  });

  it('reads the type of an entity id and refuses anything else', () => {
    expect(entityType('PROCESS_GROUP_INSTANCE-0000000000000001')).toBe('PROCESS_GROUP_INSTANCE');
    expect(entityType('SERVICE-c44033de8492cf45')).toBeNull();
    expect(entityType('SERVICE-C44033DE8492CF45" or true')).toBeNull();
  });

  it('opens the Logs app on a field filter in the hash state the platform reads', () => {
    const path = logsFilterPath('status = ERROR');
    expect(path.startsWith('dynatrace.logs/#')).toBe(true);
    expect(JSON.parse(decodeURIComponent(path.slice('dynatrace.logs/#'.length)))).toMatchObject({ version: 2, filterFieldQuery: 'status = ERROR' });
  });
});

// ------------------------------------------------------------------ the trail's targets

describe('a database root cause opens the service that failed most calling it', () => {
  const callerRows = [
    { id: 'SERVICE-C44033DE8492CF45', name: 'easyTradeManager', requests: 5979, failures: 341, rootType: 'DATABASE_SERVICE' },
    { id: 'SERVICE-735D88A54ACBBC95', name: 'easyTradeLoginService', requests: 413, failures: 14, rootType: 'DATABASE_SERVICE' },
  ];

  it('builds the caller query only for a service id, so nothing else reaches the text', () => {
    expect(buildRootCallersDql('HOST-0000000000000001')).toBeNull();
    expect(buildRootCallersDql('SERVICE-E1990917A56EB6C5" | fetch logs')).toBeNull();
    const dql = buildRootCallersDql('SERVICE-E1990917A56EB6C5') ?? '';
    expect(dql).toContain('filter id == "SERVICE-E1990917A56EB6C5"');
    expect(dql).toContain('called_by[dt.entity.service]');
    expect(dql).toContain('sort failures desc, requests desc');
  });

  it('reads the callers, and only a database with callers counts as one', () => {
    const callers = summariseRootCallers(callerRows);
    expect(callers.callers.map((caller) => caller.name)).toEqual(['easyTradeManager', 'easyTradeLoginService']);
    expect(isDatabaseRoot(callers)).toBe(true);
    expect(isDatabaseRoot(summariseRootCallers(callerRows.map((row) => ({ ...row, rootType: 'WEB_REQUEST_SERVICE' }))))).toBe(false);
    expect(isDatabaseRoot(summariseRootCallers([]))).toBe(false);
  });

  it('maps APPLICATION to FRONTEND ids, first (busiest) row wins', () => {
    const map = frontendIdMap([
      { applicationId: 'APPLICATION-6331991FD4EFBB24', frontendId: 'FRONTEND-32E311F297817EA0' },
      { applicationId: 'APPLICATION-6331991FD4EFBB24', frontendId: 'FRONTEND-1C56BD052D1AD8FF' },
      { applicationId: 'garbage', frontendId: 'FRONTEND-1C56BD052D1AD8FF' },
    ]);
    expect([...map.entries()]).toEqual([['APPLICATION-6331991FD4EFBB24', 'FRONTEND-32E311F297817EA0']]);
  });

  const incident: RcaIncident = {
    displayId: 'P-260914359',
    name: 'Failure rate increase',
    category: 'ERROR',
    status: 'CLOSED',
    severity: null,
    impactLevels: ['Services'],
    affectedNames: [':80', 'frontendreverseproxy-easytrade', 'TradeManagement'],
    affectedTypes: [],
    relatedNames: [],
    affectedIds: ['SERVICE-8BACD834F8B0945E', 'APPLICATION-6331991FD4EFBB24', 'SERVICE-E1990917A56EB6C5'],
    relatedIds: [],
    rootCauseName: 'TradeManagement',
    rootCauseId: 'SERVICE-E1990917A56EB6C5',
    eventId: '1495944828232761706_1790117520000V2',
    startIso: '2026-09-22T22:57:00.000Z',
    endIso: '2026-09-22T23:09:00.000Z',
    durationNs: 720_000_000_000,
    affectedCount: 3,
    clusters: [],
    namespaces: [],
    workloads: [],
    description: null,
  };

  it('opens every box of P-260914359 on the page the owner expects', () => {
    const { nodes } = buildTrail(incident, t, formatNumber, {
      callers: summariseRootCallers(callerRows),
      frontendIds: new Map([['APPLICATION-6331991FD4EFBB24', 'FRONTEND-32E311F297817EA0']]),
    });
    const href = (id: string) => nodes.find((node) => node.id === id)?.externalHref;
    expect(href('root')).toBe(OWNER_SERVICE);
    expect(nodes.find((node) => node.id === 'root')?.figure).toBe(t('p.rca.kind.database'));
    expect(href('affected-0')).toContain('detailsId=SERVICE-8BACD834F8B0945E');
    expect(href('affected-1')).toBe(OWNER_FRONTEND);
    // TradeManagement is also among the affected: the same database, the same caller page.
    expect(href('affected-2')).toBe(OWNER_SERVICE);
    expect(href('problem')).toContain('dynatrace.davis.problems/problem/1495944828232761706_1790117520000V2');
  });

  it('without the callers, a service root opens its own page in the Services app', () => {
    const { nodes } = buildTrail(incident, t, formatNumber);
    expect(nodes.find((node) => node.id === 'root')?.externalHref).toContain('detailsId=SERVICE-E1990917A56EB6C5');
    expect(nodes.find((node) => node.id === 'affected-1')?.externalHref).toContain('dynatrace.experience.vitals/intent/view-pages-views-waterfall');
  });
});

// 3.2.7 review UX-M4: the figure and its unit must fit the node they are printed in.
describe('a flow-map node prints its unit only when it fits beside the figure', () => {
  const pt = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'pt-BR', params);
  const room = FLOW_GEOMETRY.nodeWidth - 46;

  it('drops "causa raiz" after the pt-BR "Banco de dados", keeps "root cause" after "Database"', () => {
    expect(fitUnit(pt('p.rca.kind.database'), [pt('p.rca.trail.rootUnit')])).toBeUndefined();
    expect(textPx(pt('p.rca.kind.database'), 20)).toBeLessThanOrEqual(room);
    expect(fitUnit(t('p.rca.kind.database'), [t('p.rca.trail.rootUnit')])).toBe(t('p.rca.trail.rootUnit'));
    expect(fitUnit('Serviço', ['afetado'])).toBe('afetado');
    expect(fitUnit('7,2 h', ['de duração'])).toBe('de duração');
    expect(fitUnit('752,4 mil', ['requisições'])).toBe('requisições');
  });

  it('falls back to the short unit, then to none, for a busy service', () => {
    const full = pt('p.dx3.flow.reqFail', { pct: '0,16' });
    const short = pt('p.dx3.flow.failShort', { pct: '0,16' });
    // 3.3.9: the compact map sets the figure at 16 px (was 20), so more of the unit fits.
    expect(fitUnit('2,4 mi', [full, short])).toBe(full);
    expect(fitUnit('911,1 mil', [pt('p.dx3.flow.reqFail', { pct: '0,30' }), pt('p.dx3.flow.failShort', { pct: '0,30' })])).toBe(pt('p.dx3.flow.failShort', { pct: '0,30' }));
    expect(fitUnit('1.234.567,8 mil', [full, short])).toBeUndefined();
    expect(fitUnit('911.1k', [t('p.dx3.flow.reqFail', { pct: '0.30' }), t('p.dx3.flow.failShort', { pct: '0.30' })])).toBe(t('p.dx3.flow.reqFail', { pct: '0.30' }));
  });

  it('keeps the whole text in the node title when the unit is left out', () => {
    const { container } = render(
      <AppRoot>
        <StudioProvider>
          <FlowMap
            columns={[{ id: 'root', label: 'Causa raiz' }]}
            nodes={[{ id: 'root', column: 'root', name: 'payments-db', figure: pt('p.rca.kind.database'), unit: pt('p.rca.trail.rootUnit'), family: 'orange', icon: null, label: 'Causa raiz: payments-db' }]}
            links={[]}
            ariaLabel="Trilha"
            legend={[]}
          />
        </StudioProvider>
      </AppRoot>,
    );
    expect(container.querySelector('.pvs-stackmap__unit')).toBeNull();
    expect(container.querySelector('.pvs-stackmap__count')?.textContent).toBe('Banco de dados');
    expect(container.querySelector('.pvs-stackmap__node title')?.textContent).toBe('payments-db · Banco de dados causa raiz');
  });
});

describe('the frontend id map query', () => {
  it('compares the smartscape id through toString, which the platform requires', () => {
    const dql = getQuery('rum.frontend.ids').dql;
    expect(dql).toContain('toString(dt.smartscape.frontend)');
    expect(dql).not.toMatch(/dt\.smartscape\.frontend\s*==\s*"/);
  });
});

// ------------------------------------------------------------------ the deck's capture slides

describe('the numbers beside a capture read whole', () => {
  it('takes the short values first, so an incident id or a service name never ends in an ellipsis there', () => {
    const kpis = [
      { label: 'Incident', value: 'P-9100100' },
      { label: 'Root cause', value: 'svc-payments-02' },
      { label: 'Affected entities', value: '5' },
      { label: 'Duration', value: '7.2 h' },
      { label: 'Scope', value: 'Services' },
    ];
    expect(captureKpiPick(kpis).map((kpi) => kpi.label)).toEqual(['Affected entities', 'Duration', 'Incident']);
    expect(captureKpiPick(kpis.slice(0, 2)).map((kpi) => kpi.label)).toEqual(['Incident', 'Root cause']);
  });

  // 3.2.7 final review D2: "216,…", "22.9 …", "P-91…" on the capture slides of the existing deck.

  /** The advance width (ems) of a character in the 800 face of `fonts.ts` (what weight 700 draws in the preview), read from the font's own tables. */
  // The DT Flow font is a brand asset not included in this repository: `fonts.ts` is an empty stub
  // there, so the tests that measure against the embedded face run only when it is supplied.
  const HAS_DTFLOW = /font-weight:800;[^}]*?base64,/.test(DTFLOW_FONT_CSS);
  const buildEmbeddedBold = (): ((char: string) => number) => {
    const font = Buffer.from(/font-weight:800;[^}]*?base64,([A-Za-z0-9+/=]+)\)/.exec(DTFLOW_FONT_CSS)?.[1] ?? '', 'base64');
    const u16 = (at: number) => font.readUInt16BE(at);
    const tables = new Map<string, number>();
    for (let i = 0; i < u16(4); i += 1) tables.set(font.toString('latin1', 12 + 16 * i, 16 + 16 * i), font.readUInt32BE(20 + 16 * i));
    const [head, hhea, hmtx, cmap] = ['head', 'hhea', 'hmtx', 'cmap'].map((tag) => tables.get(tag) ?? 0) as [number, number, number, number];
    const unitsPerEm = u16(head + 18);
    const longMetrics = u16(hhea + 34);
    // The Windows Unicode BMP subtable (format 4).
    let sub = 0;
    for (let i = 0; i < u16(cmap + 2); i += 1) if (u16(cmap + 4 + 8 * i) === 3 && u16(cmap + 6 + 8 * i) === 1) sub = cmap + font.readUInt32BE(cmap + 8 + 8 * i);
    const segments = u16(sub + 6) / 2;
    const ends = sub + 14;
    const starts = ends + 2 * segments + 2;
    const deltas = starts + 2 * segments;
    const ranges = deltas + 2 * segments;
    const glyphOf = (code: number): number => {
      for (let i = 0; i < segments; i += 1) {
        if (code > u16(ends + 2 * i)) continue;
        const start = u16(starts + 2 * i);
        if (code < start) return 0;
        const range = u16(ranges + 2 * i);
        const glyph = range === 0 ? code : u16(ranges + 2 * i + range + 2 * (code - start));
        return glyph === 0 ? 0 : (glyph + u16(deltas + 2 * i)) & 0xffff;
      }
      return 0;
    };
    expect(unitsPerEm).toBeGreaterThan(0);
    return (char) => u16(hmtx + 4 * Math.min(glyphOf(char.codePointAt(0) ?? 0), longMetrics - 1)) / unitsPerEm;
  };
  let boldWidths: ((char: string) => number) | undefined;
  const embeddedBold = (char: string): number => (boldWidths ??= buildEmbeddedBold())(char);
  const fontEm = (text: string) => [...text].reduce((sum, char) => sum + embeddedBold(char), 0);
  /** A capture-side tile's width for its value, in points: the tile minus the text box's insets. */
  const roomPt = (count: number) => (captureLayout({ kpis: count, assist: false }).kpis[0]?.w ?? 0) / 12700 - 2 * 7.2;

  it.skipIf(!HAS_DTFLOW)('measures a value in the deck’s own bold face, never narrower than the font draws it', () => {
    const sample = '0123456789 .,:%-–—…·×µ/()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáãâçéêíóõôúÁÉÇ';
    for (const char of sample) {
      expect(deckBoldEm(char), char).toBeGreaterThanOrEqual(embeddedBold(char) - 0.0005);
      expect(deckBoldEm(char) - embeddedBold(char), char).toBeLessThan(0.01);
    }
    // A character the table does not know is taken as wider than any it knows.
    expect(deckBoldEm('漢')).toBeGreaterThan(deckBoldEm('W'));
  });

  it.skipIf(!HAS_DTFLOW)('sets a 6, 7 or 9 character value whole beside a capture, at the size its tile holds, in the file and on the screen', () => {
    const values = ['61,200', '216,431', 'P-9100100'];
    for (const value of values) {
      const size = captureKpiFit(value, 3);
      expect(size, value).not.toBeNull();
      // At its size the value is narrower than its tile, by the font's own widths.
      expect(fontEm(value) * (size ?? 0), value).toBeLessThanOrEqual(roomPt(3));
      expect(size, value).toBeGreaterThanOrEqual(CAPTURE_KPI_MIN_PT);
    }
    // Before 3.2.7's final review the tile set all three at 26 pt: wider than the tile.
    for (const value of ['216,431', 'P-9100100']) expect(fontEm(value) * 26).toBeGreaterThan(roomPt(3));
    // A value that fits keeps the section's size; the deck fingerprint's 2-up "12.34567%" too.
    expect(captureKpiFit('5', 3)).toBe(26);
    expect(captureKpiFit('12.34567%', 2)).toBe(26);

    const model: WrapupModel = {
      customerName: 'Contoso',
      engagementName: 'PoC',
      windowLabel: 'last 24 hours',
      generatedAtLabel: 'Generated',
      seName: null,
      dtLogo: PNG,
      customerLogo: null,
      customerLogoAspect: null,
      partnerName: '',
      partnerLogo: null,
      partnerLogoAspect: null,
      platformLogos: [],
      agenda: [],
      why: [],
      strings: {
        title: 'Tech Wrapup',
        subtitle: '',
        tagline: '',
        preparedBy: '',
        agendaTitle: 'Agenda',
        whyTitle: '',
        whySubtitle: '',
        assistLabel: 'Dynatrace Assist',
        partnerLabel: '',
        technicalDivider: 'Part one',
        technicalKicker: '',
        businessDivider: 'Part two',
        businessKicker: '',
        closingTitle: '',
        closingBullets: [],
        footer: '',
        measured: '',
        confidential: 'Confidential',
      },
      technical: [
        {
          id: 'services',
          title: 'Services',
          narrative: ['One line'],
          kpis: [
            { label: 'Front-end requests', value: values[0] as string },
            { label: 'Failed requests', value: values[1] as string },
            { label: 'Incident', value: values[2] as string },
          ],
        },
      ],
      business: [],
    };
    const spec = buildDeckSpec(model, { profile: 'customer', captures: { services: { dataUrl: PNG, width: 1100, height: 550, pins: [] } } });
    const slide = spec.slides.find((item): item is CaptureSlide => item.kind === 'capture');
    expect(slide?.kpis.map((kpi) => kpi.value)).toEqual(values);
    const sizes = values.map((value) => captureKpiValueSize(value, 3));

    // The file: each value's run at its size.
    const xml = renderSlides(spec, PNG).find((item) => item.title === slide?.title)?.xml ?? '';
    const runs = new Map([...xml.matchAll(/<a:rPr lang="en-US" sz="(\d+)" b="1"[^>]*>(?:(?!<\/a:r>).)*?<a:t>([^<]*)<\/a:t>/g)].map((match) => [match[2], Number(match[1]) / 100]));
    expect(values.map((value) => runs.get(value))).toEqual(sizes);

    // The preview (the PDF): the same sizes, and nothing to cut. Server markup keeps the container-query units jsdom drops.
    const html = renderToStaticMarkup(<DeckPreview spec={spec} art={{}} dtLogo={PNG} slideLabel={(n) => `Slide ${n}`} />);
    const capture = html.slice(html.indexOf('data-slide-kind="capture"'));
    // `[^>]*` after the style: 3.3.0 gave the value span a `title` with the whole text (§17-c), and
    // the assertion is about the size it is set at, not about which attributes the span carries.
    const shown = new Map([...capture.matchAll(/<span style="font-size:([\d.]+)cqw;[^"]*"[^>]*>([^<]*)<\/span>/g)].map((match) => [match[2], Number(match[1])]));
    expect(values.map((value) => shown.get(value))).toEqual(sizes.map((size) => Number((size / 9.6).toFixed(4))));
    expect(capture.slice(0, capture.indexOf('</li>'))).not.toContain('…');
  });

  it.skipIf(!HAS_DTFLOW)('leaves out a value no readable size fits, or one its budget cut, instead of printing it cut', () => {
    const long = 'svc-payments-checkout-eu-01';
    expect(captureKpiFit(long, 2)).toBeNull();
    // Beside a short value it does not fit a two-tile row, so the row keeps the one that does.
    expect(captureKpiPick([{ value: '5' }, { value: long }]).map((kpi) => kpi.value)).toEqual(['5']);
    // Alone, a tile as wide as the column holds it whole.
    expect(captureKpiPick([{ value: long }]).map((kpi) => kpi.value)).toEqual([long]);
    expect(fontEm(long) * (captureKpiFit(long, 1) ?? 0)).toBeLessThanOrEqual(roomPt(1));
    // Over the value budget (28 characters) it would be cut with an ellipsis: never picked.
    expect(captureKpiPick([{ value: '7.2 h' }, { value: 'svc-payments-checkout-eu-west-01' }]).map((kpi) => kpi.value)).toEqual(['7.2 h']);
  });
});
