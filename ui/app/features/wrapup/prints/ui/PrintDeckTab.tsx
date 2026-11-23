import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useStudio } from '../../../../config/StudioContext';
import { Cluster, Stack } from '../../../../engine';
import { useTranslation } from '../../../../i18n/useTranslation';
import { DECK_PRINT_CSS, fileSlug } from '../../deckFiles';
import { useExportProfile } from '../../exportProfile';
import { DTFLOW_FONT_CSS } from '../../fonts';
import { ACCEPTED_IMAGE_TYPES } from '../capture/intake';
import { LIMITS } from '../constants';
import { buildShotPlan, validateCustomUrl, type CustomShot } from '../plan/planner';
import { tenantHostOf, usePlannerInputs } from '../plan/usePlannerInputs';
import { STORE_REASON } from '../store/printSetGuards';
import { usePrintStore } from '../store/usePrintStore';
import type { LinkCheck, PrintRecord, ShotSlot } from '../types';
import type { ApprovalPanelProps } from './ApprovalPanel';
import { CapturePanels } from './CapturePanels';
import { CropDialog } from './CropDialog';
import { HowItWorks } from './HowItWorks';
import { PrintDeckPanel } from './PrintDeckPanel';
import { PrintEditor } from './PrintEditor';
import { PrintGallery } from './PrintGallery';
import { ShotPlanPanel } from './ShotPlanPanel';
import { deckSlots, pinSuggestionsFor, usePrintDeckModel } from './usePrintDeckModel';
import { usePrintDeckIdentity } from './usePrintDeckIdentity';
import { useIntake } from './useIntake';
import { identityOk, isDeckPrint, screenNameOf, titleOf, useApprovals, useBlobSaver, usePlanState } from './shared';
import './printsTab.css';

/**
 * Report SE → "Teste Deck Wrapup Print" (3.2.7, spec §1.3, §2.10): a deck built from real Dynatrace
 * screens, each paired with a DQL reading over the same entity and window.
 *
 * A · the plan of screens the app chose from this PoC's data; B · import (a batch matched to the
 * screens, or one screenshot by hand — the capture companion and the guided tab capture were
 * retired in 3.3.2); C · the prints, each
 * reviewed and approved for the customer; D · the deck of the active export profile, previewed as
 * the file is written; E · how it works.
 *
 * Loaded lazily by the SE Report (`/wrapup/prints` opens it). It never calls `useWrapupViewModel`:
 * it reads only what its plan and its prints need.
 */

const NO_CHECKS: readonly LinkCheck[] = [];

export const PrintDeckTab = () => {
  const translation = useTranslation();
  const { t, formatTime, formatDay } = translation;
  const { parameters } = useStudio();
  const profile = useExportProfile();
  const identity = usePrintDeckIdentity();
  const store = usePrintStore();

  const tenantHost = useMemo(() => tenantHostOf(), []);
  const [planState, setPlanState] = usePlanState(`${tenantHost}:${identity.customer}`);
  const inputs = usePlannerInputs(planState.preferredIncident);
  const linkChecks = store.set?.linkChecks ?? NO_CHECKS;
  const plan = useMemo(() => buildShotPlan(inputs, linkChecks, planState.overrides), [inputs, linkChecks, planState.overrides]);

  const assets = store.assets;
  const records = useMemo(() => [...assets.values()].map((asset) => asset.record), [assets]);
  const printsBySlot = useMemo(() => new Map(records.map((record) => [record.slotId, record])), [records]);
  const approvals = useApprovals(records);
  // 3.5.5: the methodology and the DQL appendix are an option, off by default.
  const [includeAppendix, setIncludeAppendix] = useState(false);
  const model = usePrintDeckModel({ plan, assets, approvals, profile, identity, translation, includeAppendix });

  const save = useBlobSaver();
  const intake = useIntake(store, t);
  const [checklist, setChecklist] = useState<Readonly<Record<string, boolean>>>({});
  const [editing, setEditing] = useState<string | null>(null);

  // One hidden file picker for every manual image: "Enviar imagem", the plan's menu and "Substituir".
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pickTarget = useRef<ShotSlot | null>(null);
  const pick = useCallback((slot: ShotSlot) => {
    pickTarget.current = slot;
    fileInput.current?.click();
  }, []);
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const slot = pickTarget.current;
    if (file !== undefined && slot !== null) void intake.start(slot, file, 'manual');
  };

  const captureOpen = store.state === 'ready' || store.state === 'memory-only';

  const approvalFor = (record: PrintRecord, slot: ShotSlot): ApprovalPanelProps => ({
    record,
    slot,
    name: screenNameOf(record, t),
    approved: approvals.isApproved(record),
    settled: approvals.isSettled(record),
    checklistTicked: checklist[record.id] ?? record.approval !== null,
    onChecklistChange: (ticked) => {
      setChecklist((previous) => ({ ...previous, [record.id]: ticked }));
      // The approval stood on the ticked checklist: unticking it withdraws the approval.
      if (!ticked && record.approval !== null) store.revoke(record.id);
    },
    onAcceptMasks: () => store.update(record.id, { masks: [...record.masks, ...record.maskSuggestions], maskSuggestions: [] }),
    onConfirmIdentity: () => store.update(record.id, { identity: 'se-confirmed' }),
    onApprove: () => store.approve(record.id),
    onRevoke: () => store.revoke(record.id),
  });

  /** "Manter como extra": an orphan becomes one of the SE's own screens (its address must be one). */
  const keepExtra = (record: PrintRecord): (() => void) | null => {
    if (plan.tenantHost === '' || !record.requestedPath.startsWith('/ui/')) return null;
    const url = `https://${plan.tenantHost}${record.requestedPath}`;
    if (!validateCustomUrl(url, plan.tenantHost).ok) return null;
    const already = planState.overrides.custom.some((item) => item.url.trim() === url);
    if (!already && planState.overrides.custom.length >= LIMITS.customSlots) return null;
    return () => {
      const title = t(record.titleText.key, record.titleText.params).slice(0, 70);
      const custom: CustomShot = { url, titleText: { key: 'prt.title.custom', params: { title } }, titleRaw: title, layout: 'free' };
      const overrides = already ? planState.overrides : { ...planState.overrides, custom: [...planState.overrides.custom, custom] };
      if (!already) setPlanState((previous) => ({ ...previous, overrides: { ...previous.overrides, custom: [...previous.overrides.custom, custom].slice(0, LIMITS.customSlots) } }));
      const slot = buildShotPlan(inputs, linkChecks, overrides).slots.find((item) => item.kind === 'custom' && item.chosen?.url === url);
      if (slot !== undefined) store.rebind(record.id, slot.id, slot);
    };
  };

  // Header figures: the ticked screens, how many have a print the deck can use, and how many are approved.
  const ticked = deckSlots(plan);
  const done = ticked.filter((slot) => {
    const record = printsBySlot.get(slot.id);
    return record !== undefined && isDeckPrint(record);
  }).length;
  const approvedCount = ticked.filter((slot) => {
    const record = printsBySlot.get(slot.id);
    return record !== undefined && isDeckPrint(record) && approvals.isApproved(record) && identityOk(record, slot);
  }).length;

  const saveLine =
    store.saveState === 'saving'
      ? t('prt.store.saving')
      : store.saveState === 'error'
        ? t('prt.store.notSaved', { reason: t(store.problem ?? 'prt.store.reason.error') })
        : store.savedAtIso !== null
          ? t('prt.store.saved', { time: formatTime(store.savedAtIso) })
          : '';

  const editingAsset = editing === null ? undefined : assets.get(editing);
  const editingSlot = editingAsset === undefined ? null : (plan.slots.find((slot) => slot.id === editingAsset.record.slotId) ?? null);

  return (
    <Stack gap="section" className="pvs-prt">
      <style>{DECK_PRINT_CSS}</style>
      <style>{DTFLOW_FONT_CSS}</style>
      <input ref={fileInput} type="file" accept={ACCEPTED_IMAGE_TYPES} hidden onChange={onFile} />

      <div data-wrap-hide>
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('prt.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('prt.lead')}</Paragraph>
          <Cluster gap="tight" align="center">
            {/* The counts wait for the plan's reads: "0/1 screens" while they are out was a count of a plan not built yet (3.2.7 review UX-M6). */}
            {!inputs.loading && (
              <>
                <Chip size="condensed">{t('prt.chip.screens', { done: String(done), total: String(ticked.length) })}</Chip>
                <Chip size="condensed" color={approvedCount > 0 ? 'success' : 'neutral'}>
                  {t('prt.chip.approved', { count: String(approvedCount) })}
                </Chip>
              </>
            )}
            <Text role="status" aria-live="polite" className="pvs-caption">
              {saveLine}
            </Text>
          </Cluster>
        </Stack>
      </div>

      {store.state === 'stale' && store.staleAnchor !== null && (
        <div data-wrap-hide>
          <MessageContainer variant="warning">
            <MessageContainer.Title>{t('prt.stale.title')}</MessageContainer.Title>
            <MessageContainer.Description>
              {t('prt.stale.body', {
                old: store.staleAnchor.customer === '' ? '—' : store.staleAnchor.customer,
                date: store.staleAnchor.startDate === null ? '—' : formatDay(store.staleAnchor.startDate),
                current: parameters.customerName === '' ? '—' : parameters.customerName,
              })}
            </MessageContainer.Description>
            <MessageContainer.Actions>
              <Button variant="default" onClick={() => void store.clearAll()}>
                {t('prt.stale.delete')}
              </Button>
              <Button variant="emphasized" onClick={() => store.keepStale()}>
                {t('prt.stale.keep')}
              </Button>
            </MessageContainer.Actions>
          </MessageContainer>
        </div>
      )}
      {store.state === 'memory-only' && (
        <div data-wrap-hide>
          <MessageContainer variant="warning">
            <MessageContainer.Description>{t(store.problem === STORE_REASON.error ? 'prt.store.memoryOnly.error' : 'prt.store.memoryOnly')}</MessageContainer.Description>
            <MessageContainer.Actions>
              {/* Reading again drops the working set, so it is offered only while no print is held. */}
              {store.problem === STORE_REASON.error && store.assets.size === 0 && (
                <Button variant="default" onClick={() => store.reload()}>
                  {t('prt.store.retry')}
                </Button>
              )}
              <Button variant="default" onClick={() => void store.exportPackage().then((blob) => save(blob, `pvs-prints-${fileSlug(identity.customer || 'poc')}.zip`))}>
                {t('prt.store.export')}
              </Button>
            </MessageContainer.Actions>
          </MessageContainer>
        </div>
      )}
      {store.conflict && (
        <div data-wrap-hide>
          <MessageContainer variant="critical">
            <MessageContainer.Description>{t('prt.store.conflict')}</MessageContainer.Description>
            <MessageContainer.Actions>
              <Button variant="default" onClick={() => store.reload()}>
                {t('prt.store.reload')}
              </Button>
            </MessageContainer.Actions>
          </MessageContainer>
        </div>
      )}
      {store.sizeWarning && (
        <div data-wrap-hide>
          <MessageContainer variant="warning">
            <MessageContainer.Description>{t('prt.store.sizeWarning')}</MessageContainer.Description>
          </MessageContainer>
        </div>
      )}
      {profile === 'customer' && model.droppedForCustomer > 0 && (
        <div data-wrap-hide>
          <MessageContainer variant="neutral">
            <MessageContainer.Description>{t('prt.profile.dropped', { count: String(model.droppedForCustomer) })}</MessageContainer.Description>
          </MessageContainer>
        </div>
      )}

      <ShotPlanPanel
        plan={plan}
        loading={inputs.loading}
        printsBySlot={printsBySlot}
        approvals={approvals}
        linkChecks={linkChecks}
        planState={planState}
        setPlanState={setPlanState}
        onUploadFor={captureOpen ? pick : undefined}
      />

      <CapturePanels
        plan={plan}
        planLoading={inputs.loading}
        store={store}
        customer={identity.customer}
        printsBySlot={printsBySlot}
        intake={intake}
        pick={pick}
      />

      <PrintGallery
        plan={plan}
        assets={assets}
        loading={store.state === 'loading'}
        held={store.state === 'stale'}
        approvals={approvals}
        approvalFor={approvalFor}
        onEdit={setEditing}
        onReplace={captureOpen ? pick : undefined}
        onRemove={(printId) => store.remove(printId)}
        onRebind={(printId, slot) => store.rebind(printId, slot.id, slot)}
        keepExtra={keepExtra}
        reading={store.reading}
      />

      <PrintDeckPanel model={model} identity={identity} profile={profile} includeAppendix={includeAppendix} onIncludeAppendix={setIncludeAppendix} readingScreens={store.reading.size} />

      <HowItWorks />

      {intake.pending !== null && (
        <CropDialog
          show
          image={intake.pending.image}
          suggestion={intake.pending.suggestion}
          title={intake.pending.title}
          confirmLabel={intake.pending.confirmLabel}
          {...(printsBySlot.has(intake.pending.slot.id) ? { note: t('prt.cap.manual.replaces') } : {})}
          onConfirm={(crop) => void intake.confirm(crop)}
          onCancel={() => intake.cancel()}
          onRetake={intake.pending.onRetake}
        />
      )}
      {editingAsset !== undefined && (
        <PrintEditor
          show
          asset={editingAsset}
          slot={editingSlot}
          title={editingSlot === null ? t(editingAsset.record.titleText.key, editingAsset.record.titleText.params) : titleOf(editingSlot, t)}
          suggestions={pinSuggestionsFor(editingAsset.record, editingSlot, editingSlot === null ? null : (model.bundle[editingSlot.id] ?? null), model.ctx)}
          approval={editingSlot === null ? null : approvalFor(editingAsset.record, editingSlot)}
          onChange={(patch) => store.update(editingAsset.record.id, patch)}
          onClose={() => setEditing(null)}
        />
      )}
    </Stack>
  );
};

export default PrintDeckTab;
