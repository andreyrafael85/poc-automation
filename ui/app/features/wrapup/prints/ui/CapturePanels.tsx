import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { Select } from '@dynatrace/strato-components/forms';
import { SimpleTable } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { UploadIcon } from '@dynatrace/strato-icons';

import { Cluster, Panel, Stack } from '../../../../engine';
import { translate } from '../../../../i18n/strings';
import { useTranslation, type Translation } from '../../../../i18n/useTranslation';
import { BATCH_MAX, intakeBatch, type BatchFile, type BatchRefusal } from '../capture/batch';
import { droppedFiles, droppedImage, INTAKE_WHY_KEY, pastedImage } from '../capture/intake';
import { appIdOfUrl } from '../capture/manifest';
import { matchBatch, type MatchProposal, type MatchTarget } from '../capture/match';
import { cropSuggestionFor } from '../capture/normalize';
import type { PrintStore } from '../store/usePrintStore';
import type { CaptureStatus, ImportReport, PrintRecord, ShotPlan, ShotSlot } from '../types';
import { intakeErrorText, titleOf } from './shared';
import type { IntakeFlow } from './useIntake';

/**
 * B · Importar (3.3.2): two ways to bring the real screens in, both by import.
 *
 * - **Batch**: screenshots (files, a drop, or a ZIP of them) matched to the planned screens by
 *   `capture/match.ts` — the file name the plan offers, the screen's number, its words, then the
 *   order they were taken in — and shown for review with the confidence of each guess. Nothing
 *   enters the print set until the SE confirms. A ZIP from the former capture companion (with its
 *   manifest) still imports through the companion path, tenant check and hashes included.
 * - **Manual**: one screenshot by file, paste or drop, for the chosen screen.
 *
 * The capture companion (Playwright over noVNC or a notebook), the guided tab capture and the
 * capture diagnostics were retired in 3.3.2 by the owner's decision.
 *
 * While another PoC's prints wait for the SE's decision (stale guard), nothing here is offered.
 */

const FAILED_STATUSES: readonly CaptureStatus[] = ['session_lost', 'unresolved_link', 'unexpected_page', 'error', 'skipped'];

/** ok / not ok / outside the plan / refused, from an import report. */
export function importCounts(report: ImportReport): { ok: number; failed: number; orphans: number; refused: number } {
  const counts = report.counts;
  return {
    ok: counts.ok ?? 0,
    failed: FAILED_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0),
    orphans: counts.orphan ?? 0,
    refused: counts.refused ?? 0,
  };
}

/** The screens a batch can land on: included, with a screen chosen; numbered as the plan numbers them. */
export function batchTargets(plan: ShotPlan, printsBySlot: ReadonlyMap<string, PrintRecord>): (MatchTarget & { slot: ShotSlot })[] {
  return plan.slots.flatMap((slot, index) => {
    if (!slot.included || slot.chosen === null) return [];
    const titles = (['en', 'pt-BR'] as const).map((locale) => translate(slot.titleText.key, locale, slot.titleText.params));
    const terms = [...titles, slot.chosen.entityName ?? '', appIdOfUrl(slot.chosen.url) ?? '', slot.kind].filter((term) => term !== '');
    return [{ slot, slotId: slot.id, position: index + 1, terms, hasPrint: printsBySlot.has(slot.id) }];
  });
}

export interface CapturePanelsProps {
  plan: ShotPlan;
  /**
   * The plan's reads are still arriving: its screens (and their ids) can still change, so a batch
   * imported now would be matched against screens not planned yet. The import waits.
   */
  planLoading?: boolean;
  store: PrintStore;
  customer: string;
  printsBySlot: ReadonlyMap<string, PrintRecord>;
  intake: IntakeFlow;
  /** Opens the file picker for one screen (the manual intake). */
  pick: (slot: ShotSlot) => void;
}

export const CapturePanels = ({ plan, planLoading = false, store, printsBySlot, intake, pick }: CapturePanelsProps) => {
  const { t } = useTranslation();
  const ready = store.state === 'ready' || store.state === 'memory-only';
  const targets = useMemo(() => plan.slots.filter((slot) => slot.included && slot.chosen !== null), [plan]);

  return (
    <Panel pad="roomy" data-wrap-hide>
      <Stack gap="section">
        <Heading level={5} as="h3">
          {t('prt.cap.title')}
        </Heading>
        {store.state === 'stale' ? (
          <Paragraph className="pvs-prose">{t('prt.cap.staleHold')}</Paragraph>
        ) : !ready ? (
          <Text className="pvs-caption">{t('prt.cap.waitStore')}</Text>
        ) : (
          <>
            <BatchImport plan={plan} planLoading={planLoading} store={store} printsBySlot={printsBySlot} />
            <ManualCapture targets={targets} printsBySlot={printsBySlot} intake={intake} pick={pick} />
          </>
        )}
        {intake.note !== null && (
          <Text role="status" className="pvs-caption">
            {intake.note.text}
          </Text>
        )}
      </Stack>
    </Panel>
  );
};

// ------------------------------------------------------------------ batch

interface ReviewRow {
  file: BatchFile;
  proposal: MatchProposal;
  /** The SE's choice; starts at the proposal, or at "do not import" when it would replace a print. Null = do not import. */
  slotId: string | null;
  /** Where the row started, so "chosen by you" means the SE changed it. */
  initial: string | null;
}

const CONFIDENCE_COLOR = { high: 'success', medium: 'primary', confirm: 'warning' } as const;

function refusalText(refusal: BatchRefusal, t: Translation['t']): string {
  const why =
    refusal.why === 'zip'
      ? t('prt.batch.why.zip')
      : refusal.why === 'nested_manifest'
        ? t('prt.batch.why.nestedManifest')
        : refusal.why === 'too_many'
          ? t('prt.batch.why.tooMany', { max: String(BATCH_MAX) })
          : t(INTAKE_WHY_KEY[refusal.why]);
  return t('prt.err.file', { name: refusal.name, why });
}

const BatchImport = ({ plan, planLoading, store, printsBySlot }: { plan: ShotPlan; planLoading: boolean; store: PrintStore; printsBySlot: ReadonlyMap<string, PrintRecord> }) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [refused, setRefused] = useState<BatchRefusal[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);
  const [outcome, setOutcome] = useState<{ added: number; total: number; problems: string[] } | null>(null);
  const shown = report ?? store.set?.lastImport ?? null;

  const take = async (files: readonly File[]) => {
    if (files.length === 0) return;
    setOutcome(null);
    setReport(null);
    setReading(files.length);
    try {
      const batch = await intakeBatch(files);
      setRefused(batch.refused);
      for (const zip of batch.companionZips) {
        try {
          setReport(await store.importZip(zip, plan));
        } catch {
          setRefused((previous) => [...previous, { name: zip.name, why: 'zip' }]);
        }
      }
      if (batch.files.length > 0) {
        const proposals = matchBatch(
          batch.files.map((file) => file.image),
          batchTargets(plan, printsBySlot),
        );
        setRows(
          batch.files.map((file, index) => {
            const proposal = proposals[index]!;
            // Replacing a print the SE already reviewed is never a default (review 3.3.2 #1).
            const initial = proposal.replaces ? null : proposal.slotId;
            return { file, proposal, slotId: initial, initial };
          }),
        );
      }
    } finally {
      setReading(null);
    }
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void take(files);
  };

  const confirm = async () => {
    if (rows === null) return;
    const chosen = rows.filter((row) => row.slotId !== null);
    const bySlot = new Map(plan.slots.map((slot) => [slot.id, slot]));
    setImporting(true);
    const problems: string[] = [];
    let added = 0;
    for (const row of chosen) {
      const slot = bySlot.get(row.slotId!);
      if (slot === undefined) continue;
      try {
        const suggestion = await cropSuggestionFor(row.file.file);
        await store.addManual(slot, row.file.file, suggestion.crop, 'manual');
        added += 1;
      } catch (error) {
        problems.push(intakeErrorText(error, titleOf(slot, t), t));
      }
    }
    setImporting(false);
    setRows(null);
    setOutcome({ added, total: chosen.length, problems });
  };

  return (
    <Stack gap="group">
      <Heading level={6} as="h4">
        {t('prt.batch.title')}
      </Heading>
      <Paragraph className="pvs-prose">{t('prt.batch.hint')}</Paragraph>
      {planLoading ? (
        <Text role="status" className="pvs-caption">
          {t('prt.cap.importWait')}
        </Text>
      ) : rows !== null ? (
        <BatchReview plan={plan} printsBySlot={printsBySlot} rows={rows} setRows={setRows} importing={importing} onConfirm={() => void confirm()} onCancel={() => setRows(null)} />
      ) : (
        <>
          <Cluster gap="tight" align="center">
            <input
              ref={input}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,.zip,application/zip"
              hidden
              data-testid="prt-import-batch"
              onChange={onPick}
            />
            <Button variant="emphasized" onClick={() => input.current?.click()} disabled={reading !== null}>
              <Button.Prefix>
                <UploadIcon />
              </Button.Prefix>
              {t('prt.batch.pick')}
            </Button>
            {reading !== null && (
              <Text role="status" className="pvs-caption">
                {t('prt.batch.reading', { count: String(reading) })}
              </Text>
            )}
          </Cluster>
          <div
            role="group"
            tabIndex={0}
            className="pvs-prt-drop"
            aria-label={t('prt.batch.drop')}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              // One batch at a time: a second drop while the first is read would overwrite its review.
              if (reading === null) void take(droppedFiles(event.nativeEvent));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                input.current?.click();
              }
            }}
          >
            <Text>{t('prt.batch.drop')}</Text>
          </div>
        </>
      )}
      {outcome !== null && (
        <MessageContainer variant={outcome.added === outcome.total && outcome.problems.length === 0 ? 'success' : 'warning'}>
          <MessageContainer.Description>
            <Stack gap="tight">
              <Text role="status">{t('prt.batch.done', { added: String(outcome.added), total: String(outcome.total) })}</Text>
              {outcome.problems.map((problem, index) => (
                <Text key={index} className="pvs-caption pvs-prt-break">
                  {problem}
                </Text>
              ))}
            </Stack>
          </MessageContainer.Description>
        </MessageContainer>
      )}
      {refused.length > 0 && (
        <ul className="pvs-prt-list">
          {refused.map((refusal, index) => (
            <li key={index}>
              <Text className="pvs-caption pvs-prt-break">{refusalText(refusal, t)}</Text>
            </li>
          ))}
        </ul>
      )}
      {shown !== null && <ImportReportView report={shown} />}
    </Stack>
  );
};

/** An object URL for a file, revoked when the file changes or the row leaves. */
function useFileUrl(file: File): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return undefined;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

const SKIP = '__skip__';

const BatchReview = ({
  plan,
  printsBySlot,
  rows,
  setRows,
  importing,
  onConfirm,
  onCancel,
}: {
  plan: ShotPlan;
  printsBySlot: ReadonlyMap<string, PrintRecord>;
  rows: ReviewRow[];
  setRows: (rows: ReviewRow[]) => void;
  importing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const targets = useMemo(() => batchTargets(plan, printsBySlot), [plan, printsBySlot]);
  const nameOf = (key: string | null) => rows.find((row) => row.file.key === key)?.file.file.name ?? '—';
  const counts = new Map<string, number>();
  for (const row of rows) if (row.slotId !== null) counts.set(row.slotId, (counts.get(row.slotId) ?? 0) + 1);
  const conflict = [...counts.values()].some((count) => count > 1);
  const chosen = rows.filter((row) => row.slotId !== null).length;
  const covered = targets.filter((target) => target.hasPrint || counts.has(target.slotId)).length;

  return (
    <Stack gap="group">
      <Text>
        <Strong>{t('prt.batch.review', { count: String(rows.length) })}</Strong>
        {' · '}
        {t('prt.batch.coverage', { covered: String(covered), total: String(targets.length) })}
      </Text>
      <ul className="pvs-prt-batch" aria-label={t('prt.batch.review', { count: String(rows.length) })}>
        {rows.map((row, index) => (
          <BatchRow
            key={row.file.key}
            row={row}
            targets={targets}
            replaces={row.slotId !== null && printsBySlot.has(row.slotId)}
            clash={row.slotId !== null && (counts.get(row.slotId) ?? 0) > 1}
            duplicateName={row.proposal.duplicateOf === null ? null : nameOf(row.proposal.duplicateOf)}
            onChange={(slotId) => setRows(rows.map((other, at) => (at === index ? { ...other, slotId } : other)))}
          />
        ))}
      </ul>
      {conflict && (
        <Text role="alert" className="pvs-caption">
          {t('prt.batch.conflict')}
        </Text>
      )}
      <Cluster gap="tight" align="center">
        <Button variant="emphasized" color="primary" onClick={onConfirm} disabled={importing || conflict || chosen === 0} data-testid="prt-batch-confirm">
          {importing ? t('prt.cap.importing') : t('prt.batch.confirm', { count: String(chosen) })}
        </Button>
        <Button variant="default" onClick={onCancel} disabled={importing}>
          {t('prt.batch.cancel')}
        </Button>
      </Cluster>
    </Stack>
  );
};

const BatchRow = ({
  row,
  targets,
  replaces,
  clash,
  duplicateName,
  onChange,
}: {
  row: ReviewRow;
  targets: (MatchTarget & { slot: ShotSlot })[];
  replaces: boolean;
  clash: boolean;
  duplicateName: string | null;
  onChange: (slotId: string | null) => void;
}) => {
  const { t } = useTranslation();
  const url = useFileUrl(row.file.file);
  const labelId = useId();
  const { proposal } = row;
  const manual = row.slotId !== row.initial;
  const reason = manual ? t('prt.batch.reason.manual') : proposal.reason === 'duplicate' ? t('prt.batch.reason.duplicate', { name: duplicateName ?? '—' }) : t(`prt.batch.reason.${proposal.reason}`);
  const proposed = proposal.replaces && row.slotId === null ? targets.find((target) => target.slotId === proposal.slotId) : undefined;
  return (
    <li className="pvs-prt-batch__row" data-clash={clash || undefined}>
      {url !== null ? <img className="pvs-prt-batch__thumb" src={url} alt={row.file.file.name} /> : <span className="pvs-prt-batch__thumb" />}
      <Stack gap="tight">
        <Text id={labelId} className="pvs-prt-break">
          {row.file.file.name}
        </Text>
        <Select
          value={row.slotId ?? SKIP}
          onChange={(value) => {
            if (typeof value === 'string') onChange(value === SKIP ? null : value);
          }}
          aria-labelledby={labelId}
        >
          <Select.Content>
            <Select.Option value={SKIP}>{t('prt.batch.skip')}</Select.Option>
            {targets.map((target) => (
              <Select.Option key={target.slotId} value={target.slotId}>
                {`${String(target.position).padStart(2, '0')} · ${titleOf(target.slot, t)}`}
              </Select.Option>
            ))}
          </Select.Content>
        </Select>
        <Cluster gap="tight" align="center">
          {!manual && proposal.confidence !== null && (
            <Chip size="condensed" color={CONFIDENCE_COLOR[proposal.confidence]}>
              {t(`prt.batch.conf.${proposal.confidence}`)}
            </Chip>
          )}
          <Text className="pvs-caption">{reason}</Text>
        </Cluster>
        {proposed !== undefined && <Text className="pvs-caption">{t('prt.batch.proposedReplace', { title: titleOf(proposed.slot, t) })}</Text>}
        {replaces && <Text className="pvs-caption">{t('prt.batch.replaces')}</Text>}
        {proposal.tall && <Text className="pvs-caption">{t('prt.batch.tall')}</Text>}
      </Stack>
    </li>
  );
};

/** The last import: one line of counts, the counts as a table, and what went wrong (already translated and redacted). */
const ImportReportView = ({ report }: { report: ImportReport }) => {
  const { t, formatDateTime } = useTranslation();
  const counts = importCounts(report);
  const rows = [
    { label: t('prt.diag.val.ok'), value: counts.ok },
    { label: t('prt.status.failed'), value: counts.failed },
    { label: t('prt.status.omitted'), value: counts.orphans },
    { label: t('prt.imp.refused'), value: counts.refused },
  ].filter((row, index) => index === 0 || row.value > 0);
  const refused = counts.ok === 0 && counts.refused > 0;
  return (
    <MessageContainer variant={refused ? 'critical' : counts.failed > 0 || counts.orphans > 0 ? 'warning' : 'success'}>
      <MessageContainer.Title>{t('prt.cap.report', { ok: String(counts.ok), failed: String(counts.failed + counts.refused), orphans: String(counts.orphans) })}</MessageContainer.Title>
      <MessageContainer.Description>
        <Stack gap="tight">
          <Text className="pvs-caption">{t('prt.imp.at', { at: formatDateTime(report.atIso) })}</Text>
          <SimpleTable
            data={rows}
            columns={[
              { id: 'label', header: t('prt.imp.h.result'), accessor: 'label' },
              { id: 'value', header: t('prt.imp.h.count'), accessor: (row: { value: number }) => String(row.value), alignment: 'right' },
            ]}
            variant={{ rowDensity: 'condensed', rowSeparation: 'horizontalDividers' }}
          />
          {report.problems.length > 0 && (
            <ul className="pvs-prt-list">
              {report.problems.map((problem, index) => (
                <li key={index}>
                  <Text className="pvs-prt-break">{problem}</Text>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </MessageContainer.Description>
    </MessageContainer>
  );
};

// ------------------------------------------------------------------ B3 manual

const ManualCapture = ({
  targets,
  printsBySlot,
  intake,
  pick,
}: {
  targets: readonly ShotSlot[];
  printsBySlot: ReadonlyMap<string, PrintRecord>;
  intake: IntakeFlow;
  pick: (slot: ShotSlot) => void;
}) => {
  const { t } = useTranslation();
  const selectLabel = useId();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const fallback = targets.find((slot) => !printsBySlot.has(slot.id)) ?? targets[0] ?? null;
  const target = targets.find((slot) => slot.id === chosenId) ?? fallback;

  const [nothing, setNothing] = useState(false);
  const take = (file: File | null) => {
    if (target === null) return;
    if (file === null) {
      setNothing(true);
      return;
    }
    setNothing(false);
    void intake.start(target, file, 'manual');
  };

  return (
    <Stack gap="group">
      <Heading level={6} as="h4">
        {t('prt.cap.manual.title')}
      </Heading>
      <Paragraph className="pvs-prose">{t('prt.cap.manual.hint')}</Paragraph>
      {target === null ? (
        <Text className="pvs-caption">{t('prt.cap.manual.none')}</Text>
      ) : (
        <>
          <Stack gap="tight">
            <Text id={selectLabel}>{t('prt.cap.manual.target')}</Text>
            {targets.length > 1 ? (
              <Select
                value={target.id}
                onChange={(value) => {
                  if (typeof value === 'string') setChosenId(value);
                }}
                aria-labelledby={selectLabel}
              >
                <Select.Content>
                  {targets.map((slot) => (
                    <Select.Option key={slot.id} value={slot.id}>
                      {titleOf(slot, t)}
                    </Select.Option>
                  ))}
                </Select.Content>
              </Select>
            ) : (
              <Strong>{titleOf(target, t)}</Strong>
            )}
            {/* With every screen captured the target defaults to the first one: say that an image here replaces its print. */}
            {printsBySlot.has(target.id) && <Text className="pvs-caption">{t('prt.cap.manual.replaces')}</Text>}
          </Stack>
          <Cluster gap="tight" align="center">
            <Button variant="emphasized" onClick={() => pick(target)}>
              <Button.Prefix>
                <UploadIcon />
              </Button.Prefix>
              {t('prt.cap.manual.upload')}
            </Button>
            {intake.busy && (
              <Text role="status" className="pvs-caption">
                {t('prt.crop.working')}
              </Text>
            )}
          </Cluster>
          {/* A paste target, not a button (3.2.7 review UX-M5): a click only focuses it for Ctrl+V — a role of
              button with no click action is dead for a screen reader in browse mode. "Enviar imagem" above is the
              control that opens the file picker; Enter or Space here still opens it from the keyboard. */}
          <div
            role="group"
            tabIndex={0}
            className="pvs-prt-drop"
            aria-label={t('prt.cap.manual.drop')}
            onPaste={(event) => {
              event.preventDefault();
              take(pastedImage(event.nativeEvent));
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              take(droppedImage(event.nativeEvent));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                pick(target);
              }
            }}
          >
            <Text>{t('prt.cap.manual.drop')}</Text>
          </div>
          {nothing && <Text className="pvs-caption">{t('prt.cap.manual.nothing')}</Text>}
        </>
      )}
    </Stack>
  );
};
