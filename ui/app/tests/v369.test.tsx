import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { buildSlo, buildTriageWorkflow, parseRecipients, sloIndicator } from '../features/builder/pocAutomation';
import { createdItems, withoutItems } from '../features/builder/PocAutomationKits';
import { entryFor } from '../i18n/strings';
import { EMPTY_POC_PLAN, parsePocPlan, type PocPlan } from '../models/pocPlan';
import { getQuery } from '../queries/catalog';

/**
 * 3.6.9 — the owner: "Seguir com a 3.6.9 com suas recomendações": the PoC Builder's SLOs, the problem-triage workflow and
 * the clean-up at the end of the PoC, with the five scopes they need (rule 5) and never a run of a workflow.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const SERVICE = 'SERVICE-465C3BFC3AB9DDBD';
const ref = (id: string, name = id) => ({ id, name, createdAt: '2026-11-22T17:00:00Z', createdBy: 'se@example.com', shared: true });

describe('the manifest', () => {
  it('declares the three scopes of the kits, each with its comment, and no workflow scope', () => {
    const manifest = JSON.parse(read('app.config.json')) as { app: { scopes: { name: string; comment: string }[] } };
    const scopes = new Map(manifest.app.scopes.map((scope) => [scope.name, scope.comment]));
    for (const name of ['slo:slos:read', 'slo:slos:write', 'document:documents:delete']) {
      expect(scopes.get(name), name).toMatch(/3\.6\.9/);
    }
    // The platform keeps automation:workflows:write to its own apps (the 3.6.9 install was refused with it): the
    // Workflows app saves the triage workflow through its intent, with the SE's own permissions.
    expect([...scopes.keys()].some((name) => name.startsWith('automation:'))).toBe(false);
    // 3.7.3: the two synthetic scopes of the HTTP monitors; 3.7.4: settings:objects:write; 3.7.6: settings:objects:read (owner's orders of 2026-11-23).
    expect(manifest.app.scopes).toHaveLength(26); // 3.8.2: iam:service-users:use
  });
});

describe('the SLOs', () => {
  it('render their indicators from the catalog with the service id, and refuse anything that is not one', () => {
    expect(getQuery('slo.availability').params?.['serviceId']).toBeDefined();
    expect(sloIndicator('availability', SERVICE)).toContain(`dt.entity.service == "${SERVICE}"`);
    expect(sloIndicator('performance', SERVICE)).toContain('total[] <= 1000000');
    expect(sloIndicator('availability', 'SERVICE-1" or true or "')).toBeNull();
    expect(buildSlo('availability', 'HOST-0000000000000001', { name: 'x', description: 'y' }, { target: 99, warning: 99.5 })).toBeNull();
  });

  it('cover the fleet too: every host’s CPU and memory, every Kubernetes workload, a missing minute a gap', () => {
    expect(sloIndicator('hostCpu', '')).toContain('if(isNull(cpu[]), cpu[], else: if(cpu[] <= 80, 100.0, else: 0.0))');
    expect(sloIndicator('hostMemory', '')).toContain('mem[] <= 85');
    expect(sloIndicator('k8sRestarts', '')).toContain('dt.kubernetes.container.restarts');
    expect(buildSlo('hostCpu', '', { name: 'Host CPU (PoC Acme)', description: 'd' }, { target: 95, warning: 98 })?.externalId).toBe('poc-automation-hostCpu');
  });

  it('carry the PoC tag, a stable external id and a 7-day window', () => {
    const slo = buildSlo('performance', SERVICE, { name: 'Performance — easyTradeManager (Acme)', description: 'd' }, { target: 95, warning: 98 });
    expect(slo).toMatchObject({
      tags: ['poc-automation'],
      externalId: `poc-automation-performance-${SERVICE.toLowerCase()}`,
      criteria: [{ timeframeFrom: 'now-7d', timeframeTo: 'now', target: 95, warning: 98 }],
      customSli: { filterSegments: [] },
    });
  });
});

describe('the problem-triage workflow', () => {
  it('is handed to the Workflows app by its intent, never written by this app', () => {
    const source = read('ui/app/features/builder/pocAutomation.ts');
    expect(source).toContain('sendIntent(');
    expect(source).not.toContain('/platform/automation/');
  });

  it('is a problem trigger, the triage action and the e-mail, turned off unless asked', () => {
    const words = { title: 'PoC problem triage — Acme', description: 'd', triageDescription: 'x', taskDescription: 't' };
    const off = buildTriageWorkflow(words, ['team@example.com'], false, true);
    expect(off.trigger.eventTrigger.isActive).toBe(false);
    expect(off.trigger.eventTrigger.triggerConfiguration).toMatchObject({ type: 'davis-problem', value: { analysisReady: true } });
    // 3.7.0: the app's triage action comes first; the e-mail sends its summary.
    // 3.7.3: Dynatrace Assist (the platform's generative AI) reads the triage before the e-mail.
    expect(Object.values(off.tasks).map((task) => task.action)).toEqual(['my.poc.automation:poc-triage', 'dynatrace.davis.copilot.workflow.actions:davis-copilot', 'dynatrace.email:send-email']);
    expect(off.tasks['notify_team']?.input).toMatchObject({ to: ['team@example.com'] });
    expect(off.isPrivate).toBe(false);
    expect(buildTriageWorkflow(words, ['a@b.co'], true, false)).toMatchObject({ isPrivate: true, trigger: { eventTrigger: { isActive: true } } });
  });

  it('keeps only real e-mail addresses, without repeats', () => {
    expect(parseRecipients('Team@Example.com, team@example.com; ops@example.org  not-an-address')).toEqual({
      valid: ['team@example.com', 'ops@example.org'],
      invalid: ['not-an-address'],
    });
  });
});

describe('the register and the clean-up', () => {
  const plan: PocPlan = {
    ...EMPTY_POC_PLAN,
    dashboard: ref('doc-poc', 'Value of the PoC'),
    specialtyDashboards: { sre: ref('doc-sre') },
    notebook: ref('doc-nb'),
    slos: [
      { ...ref('slo-1'), kind: 'availability', serviceId: SERVICE },
      { ...ref('slo-2'), kind: 'hostCpu', serviceId: '' },
    ],
  };

  it('lists everything the PoC created, with where it opens', () => {
    const items = createdItems(plan, (id) => `/doc/${id}`);
    expect(items.map((item) => item.key)).toEqual(['dash-poc', 'dash-sre', 'notebook', 'slo-slo-1', 'slo-slo-2']);
    // 3.7.6: the SLO app's own intent (`dynatrace.service.level.objectives` is the installed SLO app).
    expect(items.find((item) => item.type === 'slo')?.link).toContain('/ui/apps/dynatrace.service.level.objectives/intent/view-slo#');
  });

  it('forgets only what was removed, and the plan reads back', () => {
    const next = withoutItems(plan, new Set(['slo-slo-1', 'slo-slo-2', 'dash-sre']));
    expect(next.slos).toBeUndefined();
    expect(next.specialtyDashboards).toEqual({});
    expect(next.dashboard?.id).toBe('doc-poc');
    const again = parsePocPlan(JSON.parse(JSON.stringify(plan)) as unknown);
    expect(again.slos?.[0]).toMatchObject({ kind: 'availability', serviceId: SERVICE });
    // A fleet SLO keeps no service.
    expect(again.slos?.[1]).toMatchObject({ kind: 'hostCpu', serviceId: '' });
  });
});

describe('What’s new', () => {
  it('lets 3.6.9 leave the ten releases (3.7.9), its text kept', () => {
    // 3.7.9: i121 opened the list and i111 left it to keep ten.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i111')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i111').en.startsWith('3.6.9 — ')).toBe(true);
  });
});
