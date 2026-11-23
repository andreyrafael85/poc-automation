import React, { useEffect, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { DateTimePicker, Select, TextInput } from '@dynatrace/strato-components/forms';
import { ExternalLink, Link, Text } from '@dynatrace/strato-components/typography';
import { DownloadIcon } from '@dynatrace/strato-icons';
import { Link as RouterLink } from 'react-router-dom';

import { Cluster } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import { pickedDate } from '../pocPlan/PocPlanEditor';
import {
  EMPTY_ITEM,
  isOverdue,
  MAX_OWNER,
  PLAN_STATUSES,
  planCsv,
  planFileName,
  planProgress,
  todayIso,
  type PlanItem,
  type PlanStatus,
} from './actionPlan';
import { docFor } from './docLinks';
import type { Priority } from './findings';
import type { ActionPlanState } from './useActionPlan';
import './assessment.css';

export interface PlanActionRow {
  rank: number;
  priority: Priority;
  rule: string;
  title: string;
  action: string;
  capability: string;
  capabilityKey: StringKey;
  evidence: string;
  drilldown: string;
}

const STATUS_KEY: Record<PlanStatus, StringKey> = {
  open: 'asm.plan.status.open',
  inProgress: 'asm.plan.status.inProgress',
  done: 'asm.plan.status.done',
};

const SAVE_KEY: Partial<Record<ActionPlanState['status'], StringKey>> = {
  saving: 'asm.plan.saving',
  saved: 'asm.plan.saved',
  offline: 'asm.plan.offline',
  forbidden: 'asm.plan.forbidden',
  'too-large': 'asm.plan.tooLarge',
  failed: 'asm.plan.failed',
};

/**
 * The recommended actions as a plan (3.4.6, F-06 and F-09). Each row keeps the action as the Assessment
 * states it, names the capability with a link to its Dynatrace documentation, and adds what was agreed:
 * the owner, the due day and the state — edited by the SE and the partner (`editable`), read by everyone
 * else, printed with the report. A line above counts the plan exactly over the actions shown; the CSV holds
 * the same rows for the customer's own tracker. Nothing here is measured, so nothing here is a figure of
 * the environment: it is what the people in the meeting agreed.
 */
export const ActionPlanTable = ({
  rows,
  state,
  editable,
  technical,
  customerName,
  t,
  formatNumber,
  formatDay,
}: {
  rows: readonly PlanActionRow[];
  state: ActionPlanState;
  editable: boolean;
  technical: boolean;
  customerName: string;
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
  formatDay: Translation['formatDay'];
}) => {
  const [edited, setEdited] = useState<Record<string, PlanItem>>({});
  const stored = state.plan.items;
  // A plan saved elsewhere arrives: what was not edited here follows it.
  useEffect(() => setEdited({}), [state.plan]);
  const itemOf = (rule: string): PlanItem => edited[rule] ?? stored[rule] ?? EMPTY_ITEM;
  const change = (rule: string, patch: Partial<PlanItem>) => setEdited((current) => ({ ...current, [rule]: { ...itemOf(rule), ...patch } }));
  const dirty = Object.keys(edited).length > 0;
  // Nothing agreed yet: the paper leaves the plan column out rather than print "To be agreed" on every row.
  const planEmpty = Object.keys(stored).length === 0;
  const printHide = planEmpty ? true : undefined;
  const today = todayIso();
  const shownPlan = { ...state.plan, items: { ...stored, ...edited } };
  const progress = planProgress(
    rows.map((row) => row.rule),
    shownPlan,
    today,
  );

  const downloadCsv = () => {
    const header = [
      '#',
      t('p.asm.actions.priority'),
      t('p.asm.actions.action'),
      t('asm.plan.csv.rule'),
      t('p.asm.actions.finding'),
      t('p.asm.actions.capability'),
      t('asm.plan.owner'),
      t('asm.plan.due'),
      t('asm.plan.status'),
      t('asm.plan.docs'),
    ];
    const csv = planCsv(
      header,
      rows.map((row) => {
        const item = itemOf(row.rule);
        return {
          rank: row.rank,
          priority: row.priority,
          action: row.action,
          rule: row.rule,
          finding: row.title,
          capability: row.capability,
          owner: item.owner,
          due: item.due ?? '',
          status: t(STATUS_KEY[item.status]),
          docs: docFor(row.capabilityKey) ?? '',
        };
      }),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = planFileName(customerName, new Date());
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const saveKey = SAVE_KEY[state.status];
  return (
    <div className="pvs-plan" data-testid="asm-plan">
      <Text className="pvs-plan__progress" data-testid="asm-plan-progress" data-print-hide={printHide}>
        {t('asm.plan.progress', {
          total: formatNumber(progress.total),
          done: formatNumber(progress.done),
          inProgress: formatNumber(progress.inProgress),
          open: formatNumber(progress.open),
          owned: formatNumber(progress.owned),
        })}
        {progress.overdue > 0 && <span className="pvs-plan__overdue"> {t('asm.plan.overdueCount', { count: formatNumber(progress.overdue) })}</span>}
      </Text>
      {editable && (
        <Cluster gap="tight" data-print-hide>
          <Button variant="emphasized" color="primary" onClick={() => void state.save(edited)} disabled={!dirty || state.status === 'saving' || state.status === 'offline'} data-testid="asm-plan-save">
            {t('asm.plan.save')}
          </Button>
          <Button onClick={() => setEdited({})} disabled={!dirty} data-testid="asm-plan-discard">
            {t('asm.plan.discard')}
          </Button>
          <Button onClick={downloadCsv} data-testid="asm-plan-csv" title={t('asm.plan.csvHint')}>
            <Button.Prefix>
              <DownloadIcon />
            </Button.Prefix>
            {t('asm.plan.csv')}
          </Button>
          {dirty && state.status !== 'saving' ? (
            <Text className="pvs-caption">{t('asm.plan.unsaved')}</Text>
          ) : (
            saveKey !== undefined && (
              <Text className="pvs-caption" role="status">
                {t(saveKey)}
              </Text>
            )
          )}
        </Cluster>
      )}
      <div className="pvs-asm-table-wrap">
        <table className="pvs-asm-table pvs-plan__table" data-testid="asm-actions-table">
          <thead>
            <tr>
              <th scope="col" data-num>
                #
              </th>
              <th scope="col">{t('p.asm.actions.priority')}</th>
              <th scope="col">{t('p.asm.actions.action')}</th>
              <th scope="col">{t('p.asm.actions.finding')}</th>
              <th scope="col">{t('p.asm.actions.capability')}</th>
              <th scope="col" data-print-hide={printHide}>
                {t('asm.plan.column')}
              </th>
              {technical && (
                <th scope="col" data-print-hide>
                  {t('p.asm.actions.evidence')}
                </th>
              )}
              <th scope="col" data-print-hide>
                {t('p.asm.actions.open')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const item = itemOf(row.rule);
              const docs = docFor(row.capabilityKey);
              const late = isOverdue(item, today);
              const ownerId = `asm-plan-owner-${row.rule}`;
              const dueId = `asm-plan-due-${row.rule}`;
              const statusId = `asm-plan-status-${row.rule}`;
              return (
                <tr key={row.rule} data-status={item.status} data-overdue={late ? 'true' : undefined}>
                  <td data-num>{row.rank}</td>
                  <td>{row.priority}</td>
                  <td>{row.action}</td>
                  <td>{`${row.rule} · ${row.title}`}</td>
                  <td>
                    {docs === null ? (
                      row.capability
                    ) : (
                      <span className="pvs-plan__cap pvs-doc">
                        {row.capability}
                        <ExternalLink href={docs} aria-label={t('asm.plan.docsFor', { capability: row.capability })}>
                          {t('asm.plan.docsShort')}
                        </ExternalLink>
                      </span>
                    )}
                  </td>
                  <td className="pvs-plan__cell" data-print-hide={printHide}>
                    {editable ? (
                      <div className="pvs-plan__edit" data-print-hide>
                        <span className="pvs-plan__label" id={ownerId}>
                          {t('asm.plan.owner')}
                        </span>
                        <TextInput
                          value={item.owner}
                          onChange={(value) => change(row.rule, { owner: value.slice(0, MAX_OWNER) })}
                          placeholder={t('asm.plan.ownerPlaceholder')}
                          aria-labelledby={ownerId}
                        />
                        <span className="pvs-plan__label" id={dueId}>
                          {t('asm.plan.due')}
                        </span>
                        <DateTimePicker type="date" value={item.due} onChange={(value) => change(row.rule, { due: pickedDate(value) })} aria-labelledby={dueId} />
                        {late && <span className="pvs-plan__late">{t('asm.plan.overdue')}</span>}
                        <span className="pvs-plan__label" id={statusId}>
                          {t('asm.plan.status')}
                        </span>
                        <Select value={item.status} onChange={(value) => change(row.rule, { status: value ?? 'open' })} aria-labelledby={statusId}>
                          <Select.Content>
                            {PLAN_STATUSES.map((status) => (
                              <Select.Option key={status} value={status}>
                                {t(STATUS_KEY[status])}
                              </Select.Option>
                            ))}
                          </Select.Content>
                        </Select>
                      </div>
                    ) : null}
                    {/* What was agreed, in words: the only view for readers, and the printed one for everybody. */}
                    <dl className="pvs-plan__read" data-plan-read={editable ? 'print' : 'always'}>
                      <dt>{t('asm.plan.owner')}</dt>
                      <dd>{item.owner === '' ? t('asm.plan.ownerNone') : item.owner}</dd>
                      <dt>{t('asm.plan.due')}</dt>
                      <dd>
                        {item.due === null ? t('asm.plan.dueNone') : formatDay(item.due)}
                        {late && <span className="pvs-plan__late"> · {t('asm.plan.overdue')}</span>}
                      </dd>
                      <dt>{t('asm.plan.status')}</dt>
                      <dd className="pvs-plan__status" data-status={item.status}>
                        {t(STATUS_KEY[item.status])}
                      </dd>
                    </dl>
                  </td>
                  {technical && (
                    <td data-code data-print-hide>
                      {row.evidence}
                    </td>
                  )}
                  <td data-print-hide>
                    <Link as={RouterLink} to={row.drilldown}>
                      {t('p.asm.actions.open')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {planEmpty && <Text className={editable ? 'pvs-caption pvs-print-only' : 'pvs-caption'}>{t('asm.plan.noneYet')}</Text>}
    </div>
  );
};
