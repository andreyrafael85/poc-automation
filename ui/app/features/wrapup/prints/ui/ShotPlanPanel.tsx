import React, { useMemo, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip, SkeletonText } from '@dynatrace/strato-components/content';
import { Checkbox, FormField, FormFieldMessages, Label, TextInput } from '@dynatrace/strato-components/forms';
import { Menu } from '@dynatrace/strato-components/navigation';
import { Modal } from '@dynatrace/strato-components/overlays';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Link, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { PlusIcon } from '@dynatrace/strato-icons';

import { Cluster, Panel, Stack } from '../../../../engine';
import type { StringKey } from '../../../../i18n/strings';
import { useTranslation, type Translation } from '../../../../i18n/useTranslation';
import { LIMITS } from '../constants';
import { validateCustomUrl, type CustomShot } from '../plan/planner';
import { suggestedFileName } from '../capture/match';
import type { LinkCheck, PrintRecord, ShotCandidate, ShotPlan, ShotSlot } from '../types';
import { STATUS_COLOR, evidenceText, omittedText, slotStatus, titleOf, type Approvals, type PlanState } from './shared';

/**
 * A · Roteiro (3.2.7, spec §1.3, §3, §2.10): the screens the app chose from this PoC's data, in
 * deck order — each with its "por que esta tela" (numbers with their window), the link to open it,
 * the link's evidence level and where it stands.
 *
 * The SE ticks screens in or out (an omitted one says why, as text — no disabled checkbox), swaps
 * the entity, includes a probe-only address anyway, opts into the host screen and adds screens of
 * their own. Since 3.3.2 (capture companion retired) each screen also shows the file name to save
 * its screenshot under, so the batch import (`capture/match.ts`) places it with high confidence.
 */

export interface ShotPlanPanelProps {
  plan: ShotPlan;
  loading: boolean;
  printsBySlot: ReadonlyMap<string, PrintRecord>;
  approvals: Approvals;
  linkChecks: readonly LinkCheck[];
  planState: PlanState;
  setPlanState: (change: (previous: PlanState) => PlanState) => void;
  /** "Enviar imagem" for one screen; absent while capture is on hold (another PoC's prints). */
  onUploadFor?: (slot: ShotSlot) => void;
}

interface Row {
  n: number;
  slot: ShotSlot;
}

/** The batch import replaced the companion's queue (3.3.2): no screen waits for a ZIP any more. */
const NONE_QUEUED: ReadonlySet<string> = new Set();

const without = (list: readonly string[], id: string) => list.filter((item) => item !== id);
const withId = (list: readonly string[], id: string) => (list.includes(id) ? [...list] : [...list, id]);

export const ShotPlanPanel = (props: ShotPlanPanelProps) => {
  const { plan, loading, printsBySlot, approvals, linkChecks, planState, setPlanState, onUploadFor } = props;
  const translation = useTranslation();
  const { t } = translation;
  const [customOpen, setCustomOpen] = useState(false);
  const now = Date.parse(plan.generatedAtIso);

  const setIncluded = (slot: ShotSlot, included: boolean) =>
    setPlanState((previous) => {
      const { overrides } = previous;
      return {
        ...previous,
        overrides: included
          ? { ...overrides, excluded: without(overrides.excluded, slot.id), forced: slot.probeOnly ? withId(overrides.forced, slot.id) : overrides.forced }
          : { ...overrides, excluded: withId(overrides.excluded, slot.id), forced: without(overrides.forced, slot.id) },
      };
    });

  const swap = (slot: ShotSlot, candidate: ShotCandidate) => {
    const entity = candidate.entityId;
    if (entity === null) return;
    setPlanState((previous) =>
      slot.kind === 'problem'
        ? { ...previous, preferredIncident: entity }
        : { ...previous, overrides: { ...previous.overrides, swapped: { ...previous.overrides.swapped, [slot.kind]: entity } } },
    );
  };

  const removeCustom = (slot: ShotSlot) =>
    setPlanState((previous) => ({
      ...previous,
      overrides: { ...previous.overrides, custom: previous.overrides.custom.filter((item) => item.url.trim() !== slot.chosen?.url) },
    }));

  const rows: Row[] = plan.slots.map((slot, index) => ({ n: index + 1, slot }));
  const anyPlanned = plan.slots.some((slot) => slot.chosen !== null);
  const customCount = plan.slots.filter((slot) => slot.kind === 'custom').length;

  const columns = useMemo<DataTableColumnDef<Row>[]>(
    () => [
      {
        id: 'include',
        header: t('prt.plan.col.include'),
        accessor: (row) => row.slot.included,
        width: 84,
        cell: ({ rowData }) => (
          <DataTable.DefaultCell>
            {rowData.slot.chosen === null ? (
              <Text>—</Text>
            ) : (
              <Checkbox
                name={`prt-include-${rowData.slot.id}`}
                aria-label={titleOf(rowData.slot, t)}
                value={rowData.slot.included}
                onChange={(checked) => setIncluded(rowData.slot, checked === true)}
              />
            )}
          </DataTable.DefaultCell>
        ),
      },
      { id: 'n', header: t('prt.plan.col.n'), accessor: 'n', width: 56 },
      {
        id: 'screen',
        header: t('prt.plan.col.screen'),
        accessor: (row) => titleOf(row.slot, t),
        width: '3fr',
        cell: ({ rowData }) => <DataTable.DefaultCell>{screenCell(rowData.slot, linkChecks, now, translation, loading)}</DataTable.DefaultCell>,
      },
      {
        id: 'link',
        header: t('prt.plan.col.link'),
        accessor: (row) => row.slot.chosen?.url ?? '',
        width: '1.6fr',
        cell: ({ rowData }) => {
          const chosen = rowData.slot.chosen;
          return (
            <DataTable.DefaultCell>
              {chosen === null ? (
                <Text>—</Text>
              ) : (
                <Stack gap="tight">
                  <Link href={chosen.url} target="_blank" rel="noopener noreferrer">
                    {t('prt.plan.open')}
                  </Link>
                  {rowData.slot.included && (
                    <Text className="pvs-caption pvs-prt-break" title={t('prt.plan.fileNameHint')}>
                      {t('prt.plan.fileName', { name: suggestedFileName(rowData.n, rowData.slot.id) })}
                    </Text>
                  )}
                  <span>
                    <Chip
                      size="condensed"
                      color={chosen.evidence === 'verified' ? 'success' : chosen.evidence === 'manual' ? 'neutral' : 'warning'}
                      className="pvs-prt-chip-wrap"
                    >
                      {evidenceText(chosen.evidence, rowData.slot.urlTemplateKey, linkChecks, now, t, translation.formatDay)}
                    </Chip>
                  </span>
                </Stack>
              )}
            </DataTable.DefaultCell>
          );
        },
      },
      {
        id: 'status',
        header: t('prt.plan.col.status'),
        accessor: (row) => row.slot.id,
        width: '1fr',
        // On a phone the 1fr share fell to ~65 px and broke "Planejado" mid-word; desktop is wider anyway.
        minWidth: 130,
        cell: ({ rowData }) => {
          const record = printsBySlot.get(rowData.slot.id) ?? null;
          const status = rowStatus(rowData.slot, record, record !== null && approvals.isApproved(record), NONE_QUEUED, linkChecks, now, loading);
          return (
            <DataTable.DefaultCell>
              {/* Wraps like the evidence chip (UX-M7): the pt-BR "Só verificação de links" is wider than the column. */}
              <Chip size="condensed" color={status.color} className="pvs-prt-chip-wrap">
                {t(status.key)}
              </Chip>
            </DataTable.DefaultCell>
          );
        },
      },
      {
        id: 'actions',
        header: t('prt.plan.col.actions'),
        accessor: (row) => row.slot.id,
        width: 120,
        cell: ({ rowData }) => (
          <DataTable.DefaultCell>
            {actionsMenu(rowData.slot, t, { swap, setIncluded, removeCustom, onUploadFor })}
          </DataTable.DefaultCell>
        ),
      },
    ],
    // The cells close over the latest plan state through these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, translation, linkChecks, now, printsBySlot, approvals, onUploadFor, plan, loading],
  );

  return (
    <Panel pad="roomy" data-wrap-hide>
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={5} as="h3">
            {t('prt.plan.title')}
          </Heading>
        </Stack>

        {loading ? (
          // The plan's screens can still change while its reads arrive: no shot list is offered until they are in.
          <Text role="status" className="pvs-caption">
            {t('prt.plan.reading')}
          </Text>
        ) : (
          <>
            <Text className="pvs-caption">{t('prt.plan.howto')}</Text>
            {customCount < LIMITS.customSlots && plan.tenantHost !== '' && (
              <Cluster gap="tight" align="center">
                <Button variant="default" onClick={() => setCustomOpen(true)}>
                  <Button.Prefix>
                    <PlusIcon />
                  </Button.Prefix>
                  {t('prt.plan.addCustom')}
                </Button>
              </Cluster>
            )}
          </>
        )}

        <Checkbox
          name="prt-host-opt-in"
          value={planState.overrides.hostOptIn}
          onChange={(checked) => setPlanState((previous) => ({ ...previous, overrides: { ...previous.overrides, hostOptIn: checked === true } }))}
        >
          {t('prt.plan.hostOptIn')}
        </Checkbox>

        {loading && !anyPlanned ? (
          <SkeletonText lines={4} />
        ) : !anyPlanned ? (
          <Paragraph className="pvs-prose">{t('prt.plan.empty')}</Paragraph>
        ) : (
          <div className="pvs-prt-scroll">
            <div className="pvs-prt-table">
              <DataTable data={rows} columns={columns} fullWidth lineWrap variant={{ rowSeparation: 'horizontalDividers', verticalDividers: false }} />
            </div>
          </div>
        )}
        {loading && anyPlanned && <SkeletonText lines={1} />}
      </Stack>

      <CustomScreenDialog
        show={customOpen}
        tenantHost={plan.tenantHost}
        onClose={() => setCustomOpen(false)}
        onAdd={(url, title) => {
          const custom: CustomShot = { url, titleText: { key: 'prt.title.custom', params: { title } }, titleRaw: title, layout: 'free' };
          setPlanState((previous) => ({
            ...previous,
            overrides: { ...previous.overrides, custom: [...previous.overrides.custom, custom].slice(0, LIMITS.customSlots) },
          }));
        }}
      />
    </Panel>
  );
};

/**
 * The status of a plan row: where the screen stands, or "Lendo" for a screen with no choice yet
 * while the plan's reads are out — it is being read, not "out of the plan" (3.2.7 review UX-M6).
 */
export function rowStatus(
  slot: ShotSlot,
  record: PrintRecord | null,
  approved: boolean,
  queued: ReadonlySet<string>,
  checks: readonly LinkCheck[],
  now: number,
  loading: boolean,
): { key: StringKey; color: (typeof STATUS_COLOR)[keyof typeof STATUS_COLOR] } {
  if (loading && slot.chosen === null) return { key: 'prt.plan.statusReading', color: 'neutral' };
  const status = slotStatus(slot, record, approved, queued, checks, now);
  return { key: `prt.status.${status}`, color: STATUS_COLOR[status] };
}

/** The screen column of a plan row: its title, and why it was chosen — or why it is out, once the reads are in. */
export function screenCell(slot: ShotSlot, checks: readonly LinkCheck[], now: number, translation: Translation, loading: boolean): React.ReactNode {
  const { t, formatDay } = translation;
  return (
    <Stack gap="tight">
      <Strong>{titleOf(slot, t)}</Strong>
      {slot.chosen !== null ? (
        <Text className="pvs-caption">{t(slot.chosen.why.key, slot.chosen.why.params)}</Text>
      ) : loading ? (
        // The reads this screen depends on are still out: why it would be left out is not known yet.
        <Text className="pvs-caption">{t('prt.plan.rowReading')}</Text>
      ) : (
        <Text className="pvs-caption">{omittedText(slot, checks, now, t, formatDay)}</Text>
      )}
    </Stack>
  );
}

function actionsMenu(
  slot: ShotSlot,
  t: Translation['t'],
  handlers: {
    swap: (slot: ShotSlot, candidate: ShotCandidate) => void;
    setIncluded: (slot: ShotSlot, included: boolean) => void;
    removeCustom: (slot: ShotSlot) => void;
    onUploadFor?: (slot: ShotSlot) => void;
  },
): React.ReactNode {
  const chosen = slot.chosen;
  if (chosen === null) return <Text>—</Text>;
  const alternates = slot.alternates.filter((candidate) => candidate.entityId !== null);
  const upload = handlers.onUploadFor;
  return (
    <Menu>
      <Menu.Trigger>
        <Button size="condensed" variant="default" aria-label={`${t('prt.plan.col.actions')}: ${titleOf(slot, t)}`}>
          {t('prt.plan.col.actions')}
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        {alternates.length > 0 && (
          <Menu.Sub>
            <Menu.SubTrigger>{t('prt.plan.swap')}</Menu.SubTrigger>
            <Menu.SubContent>
              {alternates.map((candidate) => (
                <Menu.Item key={candidate.entityId ?? candidate.url} onSelect={() => handlers.swap(slot, candidate)}>
                  {candidate.entityName ?? candidate.entityId}
                </Menu.Item>
              ))}
            </Menu.SubContent>
          </Menu.Sub>
        )}
        {slot.probeOnly && !slot.forced && <Menu.Item onSelect={() => handlers.setIncluded(slot, true)}>{t('prt.plan.force')}</Menu.Item>}
        <Menu.Link href={chosen.url} target="_blank" rel="noopener noreferrer">
          {t('prt.plan.open')}
        </Menu.Link>
        {upload !== undefined && <Menu.Item onSelect={() => upload(slot)}>{t('prt.cap.manual.upload')}</Menu.Item>}
        {slot.kind === 'custom' && <Menu.Item onSelect={() => handlers.removeCustom(slot)}>{t('prt.gallery.remove')}</Menu.Item>}
      </Menu.Content>
    </Menu>
  );
}

/**
 * "Adicionar tela (URL)": an address of this tenant and the title on the slide, checked before it joins the plan.
 * The rule shows under the address from the start; a refused address replaces it with the error, in the
 * field's own error state (`aria-invalid`, described by the message) — 3.2.7 review UX-L6.
 */
const CustomScreenDialog = ({
  show,
  tenantHost,
  onClose,
  onAdd,
}: {
  show: boolean;
  tenantHost: string;
  onClose: () => void;
  onAdd: (url: string, title: string) => void;
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setUrl('');
    setTitle('');
    setError(null);
    onClose();
  };
  const submit = () => {
    const address = url.trim();
    const verdict = validateCustomUrl(address, tenantHost);
    if (!verdict.ok) {
      setError(t(verdict.reason));
      return;
    }
    const name = title.replace(/\s+/g, ' ').trim().slice(0, 70);
    onAdd(address, name === '' ? t('prt.title.custom', { title: t('prt.app.free') }) : name);
    close();
  };

  return (
    <Modal
      show={show}
      onDismiss={close}
      size="medium"
      title={t('prt.plan.addCustom')}
      footer={
        <Cluster gap="tight" justify="end">
          <Button variant="default" onClick={close}>
            {t('prt.tab.cancel')}
          </Button>
          <Button variant="accent" color="primary" onClick={submit}>
            {t('prt.plan.custom.save')}
          </Button>
        </Cluster>
      }
    >
      <Stack gap="group">
        <FormField>
          <Label>{t('prt.plan.custom.url')}</Label>
          <TextInput
            value={url}
            onChange={(value) => {
              setUrl(value.slice(0, 2048));
              setError(null);
            }}
            type="url"
            placeholder={tenantHost === '' ? 'https://' : `https://${tenantHost}/ui/apps/`}
            data-testid="prt-custom-url"
          />
          <FormFieldMessages>
            {error === null ? (
              <FormFieldMessages.Item variant="hint">{t('prt.plan.custom.urlHint')}</FormFieldMessages.Item>
            ) : (
              <FormFieldMessages.Item variant="error" showImmediately>
                {error}
              </FormFieldMessages.Item>
            )}
          </FormFieldMessages>
        </FormField>
        <FormField>
          <Label>{t('prt.plan.custom.title')}</Label>
          <TextInput value={title} onChange={(value) => setTitle(value.slice(0, 70))} placeholder={t('prt.app.free')} />
        </FormField>
      </Stack>
    </Modal>
  );
};
