import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Checkbox, DateTimePicker, NumberInputV2, Select, TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { DeleteIcon, PlusIcon } from '@dynatrace/strato-icons';

import { Callout, Cluster, Grid, Panel, Stack } from '../../engine';
import { useTranslation } from '../../i18n/useTranslation';
import { CRITERION_METRIC_IDS, CRITERION_METRICS, criterionPillar, suggestedMetric, type CriterionMetricId } from '../../models/criteria';
import { POC_PILLARS, type PillarId } from '../../models/pillars';
import { PILLAR_LOOK } from '../pillars/pillarLook';
import {
  MAX_CRITERIA,
  POC_WINDOW_MAX_DAYS,
  isIsoDate,
  newCriterionId,
  pocDay,
  pocWindows,
  type PocPlan,
  type SuccessCriterion,
} from '../../models/pocPlan';

/**
 * Settings → PoC plan (3.2.5, milestone M5): the start and planned end dates the PoC Timeline
 * reconstructs its baseline from, and the success criteria agreed with the customer. Part of the
 * page's one draft: nothing here is saved until Apply.
 *
 * 3.2.6: the value pillars moved here from "Customer & engagement" and are planned together with
 * the objectives — one board where each pillar is put in scope, shows the objectives that prove
 * it and adds one, and each objective names its pillar.
 */

/** A picked day as `YYYY-MM-DD`, from the picker's value (a sanitised string or an absolute date). */
export function pickedDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const text = (field: unknown) => (typeof field === 'string' ? field : '');
  const candidates: string[] =
    typeof value === 'string'
      ? [value]
      : typeof value === 'object'
        ? [text((value as { value?: unknown }).value), text((value as { absoluteDate?: unknown }).absoluteDate)]
        : [];
  for (const raw of candidates) {
    const head = raw.slice(0, 10);
    // A bare day is taken as written; a full timestamp is read in the viewer's own calendar.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) && isIsoDate(head)) return head;
    const date = new Date(raw);
    if (raw !== '' && !Number.isNaN(date.getTime())) {
      const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (isIsoDate(local)) return local;
    }
  }
  return null;
}

const MANUAL = 'manual' as const;

const isMetricId = (value: string): value is CriterionMetricId => (CRITERION_METRIC_IDS as readonly string[]).includes(value);

export interface PocPlanEditorProps {
  draft: PocPlan;
  onChange: (next: PocPlan) => void;
  /** The pillars in scope (the shared configuration's), edited in the same draft. */
  pillars: readonly PillarId[];
  onPillarsChange: (next: readonly PillarId[]) => void;
}

const NO_PILLAR = 'none' as const;

export const PocPlanEditor = ({ draft, onChange, pillars, onPillarsChange }: PocPlanEditorProps) => {
  const { t, formatNumber } = useTranslation();
  const day = pocDay(draft.startDate);
  const windows = pocWindows(draft.startDate);
  const endBeforeStart = draft.startDate !== null && draft.endDate !== null && draft.endDate < draft.startDate;

  const update = (id: string, patch: Partial<SuccessCriterion>) =>
    onChange({ ...draft, criteria: draft.criteria.map((criterion) => (criterion.id === id ? { ...criterion, ...patch } : criterion)) });
  const remove = (id: string) => onChange({ ...draft, criteria: draft.criteria.filter((criterion) => criterion.id !== id) });
  const add = (pillar: PillarId | null = null) => {
    const metric = pillar === null ? 'coverage.categories' : suggestedMetric(pillar);
    onChange({
      ...draft,
      criteria: [
        ...draft.criteria,
        {
          id: newCriterionId(draft.criteria),
          metric,
          operator: CRITERION_METRICS[metric].better === 'lower' ? '<=' : '>=',
          target: null,
          text: '',
          origin: '',
          manualStatus: 'pending',
          pillar,
        },
      ],
    });
    // An objective added to a pillar puts the pillar in scope.
    if (pillar !== null && !pillars.includes(pillar)) onPillarsChange([...pillars, pillar]);
  };
  const togglePillar = (id: PillarId) => onPillarsChange(pillars.includes(id) ? pillars.filter((pillar) => pillar !== id) : [...pillars, id]);
  const numberOf = (id: string) => draft.criteria.findIndex((criterion) => criterion.id === id) + 1;

  return (
    <Stack gap="section">
      <Panel pad="roomy">
        <Stack gap="group" className="pvs-d-form">
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('plan.dates.title')}
            </Heading>
            <Paragraph className="pvs-prose">{t('plan.dates.body')}</Paragraph>
          </Stack>
          <Grid min={220}>
            <Stack gap="tight">
              <Text id="plan-start-label" className="pvs-label">
                {t('plan.dates.start')}
              </Text>
              <DateTimePicker
                type="date"
                value={draft.startDate}
                onChange={(value) => onChange({ ...draft, startDate: pickedDate(value) })}
                aria-labelledby="plan-start-label"
              />
            </Stack>
            <Stack gap="tight">
              <Text id="plan-end-label" className="pvs-label">
                {t('plan.dates.end')}
              </Text>
              <DateTimePicker
                type="date"
                value={draft.endDate}
                onChange={(value) => onChange({ ...draft, endDate: pickedDate(value) })}
                aria-labelledby="plan-end-label"
              />
            </Stack>
          </Grid>
          {day !== null && <Text>{t('plan.dates.day', { day: formatNumber(day) })}</Text>}
          {draft.startDate !== null && day === null && <Text>{t('plan.dates.future')}</Text>}
          {windows?.clamped === true && <Text className="pvs-caption">{t('plan.dates.clamped', { days: String(POC_WINDOW_MAX_DAYS) })}</Text>}
          {endBeforeStart && (
            <Callout kind="limitation" title={t('plan.dates.endBeforeStart')}>
              {t('plan.dates.endBeforeStartBody')}
            </Callout>
          )}
        </Stack>
      </Panel>

      <Panel pad="roomy">
        <Stack gap="group" className="pvs-d-form">
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('plan.value.title')}
            </Heading>
            <Paragraph className="pvs-prose">{t('plan.value.body')}</Paragraph>
          </Stack>

          <ul className="pvs-pillarboard" aria-label={t('plan.value.boardAria')}>
            {POC_PILLARS.map((pillar) => {
              const look = PILLAR_LOOK[pillar.id];
              const inScope = pillars.includes(pillar.id);
              const linked = draft.criteria.filter((criterion) => criterionPillar(criterion) === pillar.id);
              return (
                <li key={pillar.id} className="pvs-pillarboard__card" data-spectrum={look.family} data-on={inScope ? 'true' : 'false'}>
                  <span className="pvs-pillarboard__edge" aria-hidden="true" />
                  <div className="pvs-pillarboard__head">
                    <span className="pvs-pillar__emblem" aria-hidden="true">
                      <look.Icon />
                    </span>
                    <Checkbox value={inScope} onChange={() => togglePillar(pillar.id)}>
                      <span className="pvs-d-lines">
                        <Text className="pvs-pillarboard__title">{t(pillar.titleKey)}</Text>
                        <Text className="pvs-caption">{t(inScope ? 'plan.value.inScope' : 'plan.value.outOfScope')}</Text>
                      </span>
                    </Checkbox>
                  </div>
                  <Text className="pvs-caption">
                    {t('pillar.roi')}: {t(pillar.roiKey)}
                  </Text>
                  <div className="pvs-pillarboard__goals">
                    {linked.length === 0 ? (
                      <Text className="pvs-caption">{t('plan.value.noGoals')}</Text>
                    ) : (
                      linked.map((criterion) => (
                        <span key={criterion.id} className="pvs-pillartag" data-spectrum={look.family}>
                          {t('plan.criteria.item', { n: String(numberOf(criterion.id)) })}
                        </span>
                      ))
                    )}
                  </div>
                  <Button
                    size="condensed"
                    onClick={() => add(pillar.id)}
                    disabled={draft.criteria.length >= MAX_CRITERIA}
                    aria-label={t('plan.value.addGoalAria', { pillar: t(pillar.titleKey) })}
                  >
                    <Button.Prefix>
                      <PlusIcon />
                    </Button.Prefix>
                    {t('plan.value.addGoal')}
                  </Button>
                </li>
              );
            })}
          </ul>

          <Stack gap="tight">
            <Heading level={5} as="h3">
              {t('plan.criteria.title')}
            </Heading>
            <Paragraph className="pvs-prose">{t('plan.criteria.body')}</Paragraph>
          </Stack>

          {draft.criteria.length === 0 && <Text className="pvs-caption">{t('plan.criteria.empty')}</Text>}

          <ol className="pvs-plan__list">
            {draft.criteria.map((criterion, index) => {
              const metric = criterion.metric === MANUAL ? null : CRITERION_METRICS[criterion.metric];
              const n = String(index + 1);
              const unit = metric === null ? '' : metric.unit === 'percent' ? '%' : metric.unit === 'hours' ? 'h' : '';
              const pillar = criterionPillar(criterion);
              const pillarInfo = pillar === null ? null : POC_PILLARS.find((entry) => entry.id === pillar) ?? null;
              return (
                <li key={criterion.id} className="pvs-plan__item">
                  <Stack gap="group">
                    <Cluster justify="between">
                      <Cluster gap="tight" align="center">
                        <Heading level={5} as="h4">
                          {t('plan.criteria.item', { n })}
                        </Heading>
                        {pillarInfo !== null && (
                          <span className="pvs-pillartag" data-spectrum={PILLAR_LOOK[pillarInfo.id].family}>
                            {t(pillarInfo.titleKey)}
                          </span>
                        )}
                      </Cluster>
                      <Button onClick={() => remove(criterion.id)} aria-label={t('plan.criteria.removeAria', { n })}>
                        <Button.Prefix>
                          <DeleteIcon />
                        </Button.Prefix>
                        {t('plan.criteria.remove')}
                      </Button>
                    </Cluster>
                    <Grid min={190}>
                      <Stack gap="tight">
                        <Text id={`plan-metric-${criterion.id}`} className="pvs-label">
                          {t('plan.criteria.metric')}
                        </Text>
                        <Select
                          value={criterion.metric}
                          onChange={(value) => {
                            if (typeof value !== 'string') return;
                            const next = value === MANUAL ? MANUAL : isMetricId(value) ? value : null;
                            if (next === null) return;
                            update(criterion.id, {
                              metric: next,
                              operator: next === MANUAL ? '>=' : CRITERION_METRICS[next].better === 'lower' ? '<=' : '>=',
                              target: null,
                              // A new metric brings its own pillar unless the SE chose one.
                              pillar: criterion.pillar ?? null,
                            });
                          }}
                          aria-labelledby={`plan-metric-${criterion.id}`}
                        >
                          <Select.Content>
                            {CRITERION_METRIC_IDS.map((id) => (
                              <Select.Option key={id} value={id}>
                                {t(CRITERION_METRICS[id].labelKey)}
                              </Select.Option>
                            ))}
                            <Select.Option value={MANUAL}>{t('plan.criteria.manual')}</Select.Option>
                          </Select.Content>
                        </Select>
                      </Stack>
                      <Stack gap="tight">
                        <Text id={`plan-pillar-${criterion.id}`} className="pvs-label">
                          {t('plan.criteria.pillar')}
                        </Text>
                        <Select
                          value={pillar ?? NO_PILLAR}
                          onChange={(value) => {
                            if (value === NO_PILLAR) update(criterion.id, { pillar: null });
                            else {
                              const chosen = POC_PILLARS.find((entry) => entry.id === value);
                              if (chosen !== undefined) update(criterion.id, { pillar: chosen.id });
                            }
                          }}
                          aria-labelledby={`plan-pillar-${criterion.id}`}
                        >
                          <Select.Content>
                            {POC_PILLARS.map((entry) => (
                              <Select.Option key={entry.id} value={entry.id}>
                                {pillars.includes(entry.id) ? t(entry.titleKey) : t('plan.criteria.pillarOut', { pillar: t(entry.titleKey) })}
                              </Select.Option>
                            ))}
                            {metric === null && <Select.Option value={NO_PILLAR}>{t('plan.criteria.noPillar')}</Select.Option>}
                          </Select.Content>
                        </Select>
                      </Stack>
                      {metric !== null && (
                        <>
                          <Stack gap="tight">
                            <Text id={`plan-op-${criterion.id}`} className="pvs-label">
                              {t('plan.criteria.operator')}
                            </Text>
                            <Select
                              value={criterion.operator}
                              onChange={(value) => {
                                if (value === '>=' || value === '<=') update(criterion.id, { operator: value });
                              }}
                              aria-labelledby={`plan-op-${criterion.id}`}
                            >
                              <Select.Content>
                                <Select.Option value=">=">{t('plan.criteria.atLeast')}</Select.Option>
                                <Select.Option value="<=">{t('plan.criteria.atMost')}</Select.Option>
                              </Select.Content>
                            </Select>
                          </Stack>
                          <Stack gap="tight">
                            <Text id={`plan-target-${criterion.id}`} className="pvs-label">
                              {unit === '' ? t('plan.criteria.target') : t('plan.criteria.targetUnit', { unit })}
                            </Text>
                            <NumberInputV2
                              value={criterion.target}
                              onChange={(value) => update(criterion.id, { target: typeof value === 'number' && Number.isFinite(value) ? value : null })}
                              min={0}
                              aria-labelledby={`plan-target-${criterion.id}`}
                            />
                          </Stack>
                        </>
                      )}
                      {metric === null && (
                        <Stack gap="tight">
                          <Text id={`plan-status-${criterion.id}`} className="pvs-label">
                            {t('plan.criteria.assessment')}
                          </Text>
                          <Select
                            value={criterion.manualStatus}
                            onChange={(value) => {
                              if (value === 'pending' || value === 'met' || value === 'not-met') update(criterion.id, { manualStatus: value });
                            }}
                            aria-labelledby={`plan-status-${criterion.id}`}
                          >
                            <Select.Content>
                              <Select.Option value="pending">{t('crit.status.manualPending')}</Select.Option>
                              <Select.Option value="met">{t('crit.status.manualMet')}</Select.Option>
                              <Select.Option value="not-met">{t('crit.status.manualNotMet')}</Select.Option>
                            </Select.Content>
                          </Select>
                        </Stack>
                      )}
                    </Grid>
                    <Grid min={240}>
                      <Stack gap="tight">
                        <Text id={`plan-text-${criterion.id}`} className="pvs-label">
                          {metric === null ? t('plan.criteria.textRequired') : t('plan.criteria.text')}
                        </Text>
                        <TextInput
                          value={criterion.text}
                          onChange={(value) => update(criterion.id, { text: value.slice(0, 200) })}
                          placeholder={t('plan.criteria.textPlaceholder')}
                          aria-labelledby={`plan-text-${criterion.id}`}
                        />
                      </Stack>
                      <Stack gap="tight">
                        <Text id={`plan-origin-${criterion.id}`} className="pvs-label">
                          {t('plan.criteria.origin')}
                        </Text>
                        <TextInput
                          value={criterion.origin}
                          onChange={(value) => update(criterion.id, { origin: value.slice(0, 120) })}
                          placeholder={t('plan.criteria.originPlaceholder')}
                          aria-labelledby={`plan-origin-${criterion.id}`}
                        />
                      </Stack>
                    </Grid>
                    {metric === null && criterion.text.trim() === '' && <Text className="pvs-caption">{t('plan.criteria.manualNeedsText')}</Text>}
                  </Stack>
                </li>
              );
            })}
          </ol>

          <Cluster>
            <Button variant="emphasized" onClick={() => add()} disabled={draft.criteria.length >= MAX_CRITERIA}>
              <Button.Prefix>
                <PlusIcon />
              </Button.Prefix>
              {t('plan.criteria.add')}
            </Button>
            {draft.criteria.length >= MAX_CRITERIA && <Text className="pvs-caption">{t('plan.criteria.max', { max: String(MAX_CRITERIA) })}</Text>}
          </Cluster>
        </Stack>
      </Panel>
    </Stack>
  );
};
