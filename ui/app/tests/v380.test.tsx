import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import {
  ANOMALY_SETTINGS_LINK,
  OPENPIPELINE_ROUTING_LINK,
  SERVICE_USER_ID,
  buildDetector,
  detectorActors,
  detectorIntent,
  eventTemplateMap,
  refusalOf,
} from '../features/builder/pocSettings';
import { entryFor } from '../i18n/strings';
import { MAX_POC_DETECTORS, parsePocPlan } from '../models/pocPlan';

/**
 * 3.8.0 — the owner's validation of 3.7.9: the anomaly detectors run as a service user (a person's own account is refused as
 * their actor — read on the lab on 2026-11-26 with `dtctl create settings --validate-only`), one per signal or per service;
 * the intent's event filled in; the OpenPipeline dynamic routes and the alerts links; the AI models beside the tokens table.
 */

const read = (path: string) => readFileSync(join(__dirname, '..', ...path.split('/')), 'utf8');
const WORDS = { title: 'T', description: 'D', eventName: 'The event', eventDescription: 'ED' };
const ACTOR = '00000000-1111-4222-8333-444455556666';
const SVC = `SERVICE-${'0A'.repeat(8)}`;

describe('the detectors the PoC Builder creates (3.8.0)', () => {
  it('run as the service user given, read the query the way the app writes it and name the source by its dimension', () => {
    const value = buildDetector('responseTime', [SVC], WORDS, ACTOR) as Record<string, unknown>;
    expect(value['executionSettings']).toEqual({ actor: ACTOR });
    const input = (value['analyzer'] as { input: { key: string; value: string }[] }).input;
    expect(input.find((entry) => entry.key === 'query.expression')?.value).toContain(`in(dt.entity.service, array("${SVC}"))`);
    expect(input.some((entry) => entry.key === 'query')).toBe(false);
    expect(eventTemplateMap(value)).toMatchObject({ 'event.name': 'The event', 'dt.source_entity': '{dims:dt.entity.service}', 'event.type': 'PERFORMANCE_EVENT' });
    expect(buildDetector('traffic', [], WORDS, '')).toBeNull();
  });

  it('offers only service-user-shaped actors of the tenant, most used first', () => {
    const actors = detectorActors([
      { value: { title: 'A', executionSettings: { actor: ACTOR } } },
      { value: { title: 'B', executionSettings: { actor: ACTOR } } },
      { value: { title: 'C', executionSettings: { actor: 'bbbbbbbb-1111-4222-8333-444455556666' } } },
      { value: { title: 'D', executionSettings: { actor: 'not-an-id' } } },
      { value: {} },
    ]);
    expect(actors.map((actor) => [actor.id, actor.detectors, actor.example])).toEqual([
      [ACTOR, 2, 'A'],
      ['bbbbbbbb-1111-4222-8333-444455556666', 1, 'C'],
    ]);
    expect(SERVICE_USER_ID.test(ACTOR)).toBe(true);
  });

  it('says why the platform refused, in its own words', () => {
    const body = [{ code: 400, error: { message: 'Validation failed for 1 Validators.', constraintViolations: [{ message: 'Provided actor is not a valid service user or access is restricted' }] } }];
    expect(refusalOf(body, 'x')).toBe('Provided actor is not a valid service user or access is restricted');
    expect(refusalOf({ error: { message: 'Forbidden' } }, 'x')).toBe('Forbidden');
    expect(refusalOf(null, 'fallback')).toBe('fallback');
  });

  it('keeps the actor and each per-service detector in the plan, up to 24', () => {
    const plan = parsePocPlan({
      detectorActor: ACTOR.toUpperCase(),
      detectors: [
        { id: 'o1', name: 'n', kind: 'traffic', createdAt: '', shared: true, serviceId: SVC },
        { id: 'o2', name: 'n', kind: 'traffic', createdAt: '', shared: true, serviceId: 'nope' },
      ],
    });
    expect(plan.detectorActor).toBe(ACTOR);
    expect(plan.detectors?.[0]?.serviceId).toBe(SVC);
    expect(plan.detectors?.[1]).not.toHaveProperty('serviceId');
    expect(parsePocPlan({ detectorActor: 'me' }).detectorActor).toBeUndefined();
    expect(MAX_POC_DETECTORS).toBe(24);
  });

  it('creates them after a check with the platform, and the intent arrives with its event filled in', () => {
    const kit = read('features/builder/PocSettingsKits.tsx');
    expect(kit).toContain(['createSettingsObject', '(DETECTOR_SCHEMA, value)'].join(''));
    // 3.8.1: the actor is set in Settings (ServiceUserPicker); the kit re-checks it.
    expect(kit).toContain('checkActor(saved)');
    expect(kit).toContain('data-testid="builder-ad-per-service"');
    expect(kit).toContain('data-testid="builder-ad-create"');
    expect(kit).toContain('data-testid="builder-ad-actor"');
    expect(read('features/builder/ServiceUserPicker.tsx')).toContain('checkActor(actor.id)');
    expect(read('features/builder/pocSettings.ts')).toContain('validateOnly=true');
    const payload = detectorIntent('failureRate', [], WORDS, 'my.poc.automation');
    const detector = payload?.['davis.anomalydetector'] as { eventTemplate: Record<string, string> };
    expect(detector.eventTemplate['event.name']).toBe('The event');
    expect(detector.eventTemplate).not.toHaveProperty('properties');
  });
});

describe('the links (3.8.0)', () => {
  it('open the OpenPipeline dynamic routes and Settings → all the alerts', () => {
    expect(OPENPIPELINE_ROUTING_LINK).toContain('/ui/apps/dynatrace.settings/settings/openpipeline-logs/dynamic-routes');
    expect(ANOMALY_SETTINGS_LINK).toContain('/ui/apps/dynatrace.settings/settings/all-alerts');
  });
});

describe('AI Observability (3.8.0)', () => {
  it('keeps the models in use beside the other token panels (3.8.1: three side by side, tests/v381)', () => {
    const page = read('pages/AiObservability.tsx');
    expect(page).toContain('className="pvs-ai-trio"');
    expect(page.indexOf('data-testid="ai-models"')).toBeLessThan(page.indexOf("t('p.ai.table.title')"));
  });
});

describe('What’s new (3.8.0)', () => {
  it('opens on 3.8.0 and keeps ten', () => {
    expect(WHATS_NEW[2]).toEqual({ key: 'help.whatsNew.i122', published: '2026-11-26' }); // 3.8.2 and 3.8.1 open it now
    expect(WHATS_NEW).toHaveLength(10);
    expect(entryFor('help.whatsNew.i122').en.startsWith('3.8.0 — ')).toBe(true);
    expect(entryFor('help.whatsNew.i122')['pt-BR'].startsWith('3.8.0 — ')).toBe(true);
  });
});
