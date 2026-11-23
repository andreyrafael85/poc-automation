import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { ServicesIcon } from '@dynatrace/strato-icons';

import { BrandGlyph } from '../../components/spectrum/BrandGlyph';
import { IconChips, type IconChip } from '../../components/spectrum/IconChips';
import { Stack } from '../../engine';
import { useFrontendIds, useRootCallers } from '../../hooks/useTrailLinks';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import type { RcaIncident } from '../../models/rca';
import { isDatabaseRoot, type RootCallers } from '../../models/trailLinks';
import { entityLink, platformUrl, servicePath } from '../../utils/deepLinks';
import { formatNanos } from '../../utils/time';
import { entityKindOf, KIND_KEY, kindIcon, type EntityKind } from './RcaTrail';

/** Cards a column shows before folding the rest into "+N" (the full list is the "Affected entities" tab). */
export const PROPAGATION_SHOWN = 6;

/** Kinds a person reaches directly: an application or a synthetic check is where users meet the incident. */
const USER_FACING: ReadonlySet<EntityKind> = new Set<EntityKind>(['application', 'synthetic']);

export interface PropagationCard {
  key: string;
  name: string;
  kind: EntityKind;
  /** A measured figure written on the card (the callers' failures), never an estimate. */
  figure?: string;
  href: string | null;
}

export interface PropagationColumn {
  id: 'cause' | 'callers' | 'affected' | 'users';
  label: StringKey;
  hint: StringKey;
  cards: PropagationCard[];
  /** Entities of this column beyond the cards shown. */
  more: number;
}

/**
 * 3.5.4 (visual proposal v4 — "the incident told as a propagation, no sonar"): the incident in columns by hop — the
 * root cause Dynatrace Intelligence named → the services measured calling it (`rca.callers`, failures during the
 * incident) → the entities it affected → the applications and checks where users meet it. Every card is something
 * the platform attached to the problem or measured; an empty column is left out. No per-entity time is drawn: the
 * platform reports the problem's start and end, not when each entity was reached.
 */
export function propagationColumns(
  incident: RcaIncident,
  callers: RootCallers,
  formatNumber: (value: number) => string,
  t: (key: StringKey, params?: Readonly<Record<string, string | number>>) => string,
  frontendIds: ReadonlyMap<string, string> = new Map(),
): PropagationColumn[] {
  const database = isDatabaseRoot(callers);
  const columns: PropagationColumn[] = [];
  const linkOf = (id: string | null) => entityLink(id, { frontendId: id === null ? null : frontendIds.get(id) ?? null });

  if (incident.rootCauseName !== null) {
    const kind: EntityKind = database ? 'database' : entityKindOf(incident.rootCauseId);
    const viaCaller = database ? callers.callers[0] : undefined;
    columns.push({
      id: 'cause',
      label: 'rca.prop.col.cause',
      hint: 'rca.prop.hint.cause',
      cards: [
        {
          key: 'root',
          name: incident.rootCauseName,
          kind,
          href: viaCaller === undefined ? linkOf(incident.rootCauseId) : platformUrl(servicePath(viaCaller.id)),
        },
      ],
      more: 0,
    });
  }

  if (callers.callers.length > 0) {
    columns.push({
      id: 'callers',
      label: 'rca.prop.col.callers',
      hint: 'rca.prop.hint.callers',
      cards: callers.callers.slice(0, PROPAGATION_SHOWN).map((caller) => ({
        key: caller.id,
        name: caller.name,
        kind: 'service' as const,
        ...(caller.failures === null ? {} : { figure: t('p.rca.trail.callerFailures', { count: formatNumber(caller.failures) }) }),
        href: platformUrl(servicePath(caller.id)),
      })),
      more: Math.max(0, callers.callers.length - PROPAGATION_SHOWN),
    });
  }

  const aligned = incident.affectedIds.length === incident.affectedNames.length;
  const shownCallers = new Set(callers.callers.map((caller) => caller.name));
  const affected = incident.affectedNames
    .map((name, index) => {
      const id = aligned ? incident.affectedIds[index] ?? null : null;
      return { key: `${index}-${name}`, name, id, kind: entityKindOf(id) };
    })
    // The root cause itself is not "affected by" itself.
    .filter((entity) => entity.name !== incident.rootCauseName);
  const technical = affected.filter((entity) => !USER_FACING.has(entity.kind) && !shownCallers.has(entity.name));
  const facing = affected.filter((entity) => USER_FACING.has(entity.kind));
  const toCards = (list: typeof affected): PropagationCard[] =>
    list.slice(0, PROPAGATION_SHOWN).map((entity) => ({ key: entity.key, name: entity.name, kind: entity.kind, href: linkOf(entity.id) }));

  if (technical.length > 0) {
    columns.push({ id: 'affected', label: 'rca.prop.col.affected', hint: 'rca.prop.hint.affected', cards: toCards(technical), more: Math.max(0, technical.length - PROPAGATION_SHOWN) });
  }
  if (facing.length > 0) {
    columns.push({ id: 'users', label: 'rca.prop.col.users', hint: 'rca.prop.hint.users', cards: toCards(facing), more: Math.max(0, facing.length - PROPAGATION_SHOWN) });
  }
  return columns;
}

export const RcaPropagation = ({ incident, callers: givenCallers }: { incident: RcaIncident; callers?: RootCallers }) => {
  const { t, formatNumber, formatDateTime } = useTranslation();
  const ownCallers = useRootCallers(givenCallers === undefined ? incident : null);
  const callers = givenCallers ?? ownCallers;
  const frontendIds = useFrontendIds();
  const columns = propagationColumns(incident, callers, formatNumber, t, frontendIds);
  const active = incident.status === 'ACTIVE';
  const k8s: IconChip[] = [
    ...incident.clusters.map((name) => ({ key: `c-${name}`, name, display: t('p.rca.trail.cluster'), icon: <BrandGlyph name="kubernetes" size={18} /> })),
    ...incident.namespaces.map((name) => ({ key: `n-${name}`, name, display: t('p.rca.trail.namespace'), icon: <BrandGlyph name="k8sNamespace" size={18} /> })),
    ...incident.workloads.slice(0, 4).map((name) => ({ key: `w-${name}`, name, display: t('p.rca.trail.workload'), icon: <BrandGlyph name="k8sWorkload" size={18} /> })),
  ];

  return (
    <Stack gap="group">
      <div className="pvs-prop" data-pvs-chart="rca-propagation" data-pvs-state={columns.length > 0 ? 'ready' : 'unavailable'} data-testid="rca-propagation">
        {/* The time ruler: what the platform reports — when the problem began, how long it lasted, whether it is open. */}
        <div className="pvs-prop__ruler" role="group" aria-label={t('rca.prop.ruler.aria')}>
          <span className="pvs-prop__tick" data-edge="start">
            <span className="pvs-prop__tick-label">{t('rca.prop.ruler.start')}</span>
            <Text className="pvs-prop__tick-value">{incident.startIso === null ? '—' : formatDateTime(incident.startIso)}</Text>
          </span>
          <span className="pvs-prop__span" aria-hidden="true" data-active={active ? 'true' : undefined} />
          <span className="pvs-prop__tick" data-edge="mid">
            <span className="pvs-prop__tick-label">{t('rca.prop.ruler.duration')}</span>
            <Text className="pvs-prop__tick-value">{formatNanos(incident.durationNs)}</Text>
          </span>
          <span className="pvs-prop__span" aria-hidden="true" data-active={active ? 'true' : undefined} />
          <span className="pvs-prop__tick" data-edge="end">
            <span className="pvs-prop__tick-label">{t(active ? 'rca.prop.ruler.open' : 'rca.prop.ruler.closed')}</span>
            <Text className="pvs-prop__tick-value">{active || incident.endIso === null ? t('rca.prop.ruler.now') : formatDateTime(incident.endIso)}</Text>
          </span>
        </div>

        <ol className="pvs-prop__cols" style={{ '--pvs-prop-cols': columns.length } as React.CSSProperties} aria-label={t('rca.prop.aria')}>
          {columns.map((column, index) => (
            <li key={column.id} className="pvs-prop__col" data-col={column.id}>
              <div className="pvs-prop__head">
                <span className="pvs-prop__hop">{index === 0 ? t('rca.prop.origin') : t('rca.prop.hop', { n: String(index) })}</span>
                <Text className="pvs-prop__label">{t(column.label)}</Text>
                <Text className="pvs-caption">{t(column.hint)}</Text>
              </div>
              <ul className="pvs-prop__cards">
                {column.cards.map((card) => {
                  const body = (
                    <>
                      <span className="pvs-prop__icon" aria-hidden="true">
                        {card.kind === 'service' && column.id === 'callers' ? <ServicesIcon size={20} /> : kindIcon(card.kind)}
                      </span>
                      <span className="pvs-prop__text">
                        <span className="pvs-prop__name">{card.name}</span>
                        <span className="pvs-prop__kind">
                          {t(KIND_KEY[card.kind])}
                          {card.figure === undefined ? '' : ` · ${card.figure}`}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={card.key} className="pvs-prop__card" data-kind={card.kind}>
                      {card.href === null ? (
                        <div className="pvs-prop__box">{body}</div>
                      ) : (
                        <a className="pvs-prop__box" href={card.href} target="_blank" rel="noreferrer">
                          {body}
                        </a>
                      )}
                    </li>
                  );
                })}
                {column.more > 0 && (
                  <li className="pvs-prop__card" data-kind="more">
                    <div className="pvs-prop__box">
                      <span className="pvs-prop__text">
                        <span className="pvs-prop__name">{t('rca.prop.more', { n: formatNumber(column.more) })}</span>
                        <span className="pvs-prop__kind">{t('rca.prop.moreHint')}</span>
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ol>
        <Text className="pvs-caption">{t('rca.prop.legend')}</Text>
      </div>
      {k8s.length > 0 && (
        <Stack gap="tight">
          <Text className="pvs-label">{t('p.rca.trail.k8s')}</Text>
          <IconChips items={k8s} label={t('p.rca.trail.k8s')} family="blue" />
        </Stack>
      )}
    </Stack>
  );
};

/** Every entity the problem affected, with its kind and its page — the "Affected entities" tab (3.5.4). */
export const RcaAffectedTable = ({ incident }: { incident: RcaIncident }) => {
  const { t } = useTranslation();
  const frontendIds = useFrontendIds();
  const aligned = incident.affectedIds.length === incident.affectedNames.length;
  const rows = incident.affectedNames.map((name, index) => {
    const id = aligned ? incident.affectedIds[index] ?? null : null;
    const kind = entityKindOf(id);
    return { key: `${index}-${name}`, name, kind, href: entityLink(id, { frontendId: id === null ? null : frontendIds.get(id) ?? null }) };
  });
  if (rows.length === 0) return <Text>{t('rca.affected.none')}</Text>;
  return (
    <div className="pvs-scroll-x">
      <table className="pvs-prop-table" data-testid="rca-affected-table" aria-label={t('rca.affected.caption', { n: String(rows.length) })}>
        <thead>
          <tr>
            <th scope="col">{t('rca.affected.h.entity')}</th>
            <th scope="col">{t('rca.affected.h.kind')}</th>
            <th scope="col">{t('rca.affected.h.page')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <span className="pvs-prop-table__name">
                  <span className="pvs-prop__icon" aria-hidden="true">
                    {kindIcon(row.kind)}
                  </span>
                  {row.name}
                </span>
              </td>
              <td>{t(KIND_KEY[row.kind])}</td>
              <td>
                {row.href === null ? (
                  <span className="pvs-muted">—</span>
                ) : (
                  <a href={row.href} target="_blank" rel="noreferrer">
                    {t('rca.affected.open')}
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
