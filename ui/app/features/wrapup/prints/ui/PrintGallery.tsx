import React, { useId, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Accordion, Chip, SkeletonText } from '@dynatrace/strato-components/content';
import { Menu } from '@dynatrace/strato-components/navigation';
import { Modal } from '@dynatrace/strato-components/overlays';
import { Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { DeleteIcon, EditIcon, UploadIcon } from '@dynatrace/strato-icons';

import { Cluster, Grid, Panel, Stack } from '../../../../engine';
import { useTranslation, type Translation } from '../../../../i18n/useTranslation';
import { formatDayTime } from '../analysis/sourced';
import { SCREEN_READ } from '../capture/readScreen';
import type { PrintAsset, PrintRecord, ShotPlan, ShotSlot } from '../types';
import { ApprovalPanel, type ApprovalPanelProps } from './ApprovalPanel';
import { STATUS_COLOR, VIA_KEY, isCorrupt, isFailedLanding, screenNameOf, slotStatus, titleOf, viewerTimeZone, type Approvals } from './shared';

/**
 * C · Prints (3.2.7, spec §1.3, §2.10): every print of the plan, in deck order, as a card — the
 * thumbnail, where it stands, whether the screen was verified, how it was captured, and the
 * approval controls — with "Editar pinos e tarjas", "Substituir" and "Remover" (always confirmed).
 * Prints an import could not match to a screen of this plan sit apart ("Prints fora do roteiro"):
 * nothing is ever re-bound on its own; the SE uses one in a slot, keeps it as an extra screen of
 * their own, or discards it.
 *
 * Thumbnails carry `data-print-thumb`, not `data-print-image`: that attribute marks the deck's own
 * print images, which the harness counts against the print slides.
 */

export interface PrintGalleryProps {
  plan: ShotPlan;
  /** The working set, by print id. */
  assets: ReadonlyMap<string, PrintAsset>;
  loading: boolean;
  /** The stored prints belong to another PoC and are hidden until the SE decides (stale guard). */
  held?: boolean;
  approvals: Approvals;
  /** The approval controls of a planned print. */
  approvalFor: (record: PrintRecord, slot: ShotSlot) => ApprovalPanelProps;
  onEdit: (printId: string) => void;
  /** "Substituir": a new image for the screen (file picker, then the crop dialog). Absent while capture is on hold. */
  onReplace?: (slot: ShotSlot) => void;
  onRemove: (printId: string) => Promise<void>;
  onRebind: (printId: string, slot: ShotSlot) => void;
  /** "Manter como extra": the orphan becomes one of the SE's own screens; null when its address cannot be one. */
  keepExtra: (record: PrintRecord) => (() => void) | null;
  /** 3.5.5: the prints whose screen is being read right now (`PrintStore.reading`). */
  reading?: ReadonlySet<string>;
}

export const PrintGallery = (props: PrintGalleryProps) => {
  const { plan, assets, loading, held = false, approvals, approvalFor, onEdit, onReplace, onRemove, onRebind, keepExtra } = props;
  const translation = useTranslation();
  const { t } = translation;
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'replace'; printId: string; slot: ShotSlot | null } | null>(null);
  const now = Date.parse(plan.generatedAtIso);

  const slotIds = new Set(plan.slots.map((slot) => slot.id));
  const all = [...assets.values()];
  const planned = plan.slots.flatMap((slot) => {
    const asset = all.find((each) => each.record.slotId === slot.id);
    return asset === undefined ? [] : [{ slot, asset }];
  });
  const orphans = all.filter((asset) => !slotIds.has(asset.record.slotId));
  const targets = plan.slots.filter((slot) => slot.chosen !== null);

  const askReplace = (record: PrintRecord, slot: ShotSlot) => {
    if (onReplace === undefined) return;
    if (record.edited) setConfirm({ kind: 'replace', printId: record.id, slot });
    else onReplace(slot);
  };

  return (
    <Panel pad="roomy" data-wrap-hide>
      <Stack gap="group">
        <Heading level={5} as="h3">
          {t('prt.gallery.title')}
        </Heading>
        {loading ? (
          <SkeletonText lines={3} />
        ) : held ? (
          <Paragraph className="pvs-prose">{t('prt.stale.title')}</Paragraph>
        ) : all.length === 0 ? (
          <Paragraph className="pvs-prose">{t('prt.gallery.empty')}</Paragraph>
        ) : (
          <Grid min={280} gap="group">
            {planned.map(({ slot, asset }) => (
              <PrintCard
                key={asset.record.id}
                asset={asset}
                slot={slot}
                status={slotStatus(slot, asset.record, approvals.isApproved(asset.record), new Set(), [], now)}
                approval={approvalFor(asset.record, slot)}
                translation={translation}
                reading={props.reading?.has(asset.record.id) === true}
                onEdit={() => onEdit(asset.record.id)}
                onReplace={onReplace === undefined ? undefined : () => askReplace(asset.record, slot)}
                onRemove={() => setConfirm({ kind: 'remove', printId: asset.record.id, slot })}
              />
            ))}
          </Grid>
        )}

        {orphans.length > 0 && (
          <Accordion>
            <Accordion.Section id="prt-orphans">
              <Accordion.SectionLabel>{t('prt.gallery.orphans', { count: String(orphans.length) })}</Accordion.SectionLabel>
              <Accordion.SectionContent>
                <Stack gap="group">
                  <Text className="pvs-caption">{t('prt.gallery.orphanHint')}</Text>
                  <Grid min={280} gap="group">
                    {orphans.map((asset) => {
                      const extra = keepExtra(asset.record);
                      const title = t(asset.record.titleText.key, asset.record.titleText.params);
                      return (
                        <Panel key={asset.record.id} pad="default" as="article">
                          <Stack gap="tight">
                            <Thumb asset={asset} title={title} />
                            <Strong>{title}</Strong>
                            <Cluster gap="tight" align="center">
                              {targets.length > 0 && (
                                <Menu>
                                  <Menu.Trigger>
                                    <Button size="condensed" variant="default">
                                      {t('prt.gallery.useInSlot')}
                                    </Button>
                                  </Menu.Trigger>
                                  <Menu.Content>
                                    {targets.map((slot) => (
                                      <Menu.Item key={slot.id} onSelect={() => onRebind(asset.record.id, slot)}>
                                        {titleOf(slot, t)}
                                      </Menu.Item>
                                    ))}
                                  </Menu.Content>
                                </Menu>
                              )}
                              {extra !== null && (
                                <Button size="condensed" variant="default" onClick={extra}>
                                  {t('prt.gallery.keepExtra')}
                                </Button>
                              )}
                              <Button size="condensed" variant="default" onClick={() => setConfirm({ kind: 'remove', printId: asset.record.id, slot: null })}>
                                {t('prt.gallery.discard')}
                              </Button>
                            </Cluster>
                          </Stack>
                        </Panel>
                      );
                    })}
                  </Grid>
                </Stack>
              </Accordion.SectionContent>
            </Accordion.Section>
          </Accordion>
        )}
      </Stack>

      <Modal
        show={confirm !== null}
        onDismiss={() => setConfirm(null)}
        size="small"
        title={confirm?.kind === 'replace' ? t('prt.gallery.replace') : t('prt.gallery.remove')}
        footer={
          <Cluster gap="tight" justify="end">
            <Button variant="default" onClick={() => setConfirm(null)}>
              {t('prt.tab.cancel')}
            </Button>
            <Button
              variant="accent"
              color={confirm?.kind === 'replace' ? 'primary' : 'critical'}
              onClick={() => {
                const current = confirm;
                setConfirm(null);
                if (current === null) return;
                if (current.kind === 'remove') void onRemove(current.printId);
                else if (current.slot !== null) onReplace?.(current.slot);
              }}
            >
              {confirm?.kind === 'replace' ? t('prt.gallery.replace') : t('prt.gallery.remove')}
            </Button>
          </Cluster>
        }
      >
        <Paragraph>{confirm?.kind === 'replace' ? t('prt.gallery.replaceConfirm') : t('prt.gallery.removeConfirm')}</Paragraph>
      </Modal>
    </Panel>
  );
};

const Thumb = ({ asset, title }: { asset: PrintAsset; title: string }) =>
  asset.thumbUrl === null ? (
    <div className="pvs-prt-thumb pvs-prt-thumb--empty" aria-hidden="true" />
  ) : (
    <img className="pvs-prt-thumb" src={asset.thumbUrl} alt={title} width={344} height={216} loading="lazy" decoding="async" data-print-thumb="" />
  );

/** What the companion's landing says about a print that did not reach its screen. */
function landingText(record: PrintRecord, slot: ShotSlot, t: Translation['t']): string {
  switch (record.landing) {
    case 'unresolved_link':
      return t('prt.err.unresolved');
    case 'unexpected_page':
      return t('prt.err.unexpected', { app: record.finalAppId ?? '—' });
    case 'session_lost':
      return t('prt.err.sessionLost', { n: String(slot.order) });
    default:
      return t('prt.err.error');
  }
}

const PrintCard = ({
  asset,
  slot,
  status,
  approval,
  translation,
  onEdit,
  onReplace,
  onRemove,
  reading = false,
}: {
  asset: PrintAsset;
  slot: ShotSlot;
  status: ReturnType<typeof slotStatus>;
  approval: ApprovalPanelProps;
  translation: Translation;
  onEdit: () => void;
  onReplace?: () => void;
  onRemove: () => void;
  reading?: boolean;
}) => {
  const { t, locale } = translation;
  const record = asset.record;
  const title = titleOf(slot, t);
  const via = t(VIA_KEY[record.source]);
  const zone = record.captureTimeZone ?? viewerTimeZone();
  // Seven cards with the same controls: each card is named by its screen, and so is each of its
  // controls, so a screen reader tells which print it approves or removes (3.2.7 review UX-M8).
  const titleId = useId();
  const named = (action: string) => `${action}: ${title}`;
  return (
    <Panel pad="default" as="article" className="pvs-prt-card" aria-labelledby={titleId}>
      <Stack gap="tight">
        <Thumb asset={asset} title={title} />
        <Strong id={titleId}>{title}</Strong>
        <Cluster gap="tight">
          <Chip size="condensed" color={STATUS_COLOR[status]}>
            {t(`prt.status.${status}`)}
          </Chip>
          {record.identity === 'anchor' ? (
            <Chip size="condensed" color="success" className="pvs-prt-chip-wrap">
              {t('prt.gallery.verified', { name: screenNameOf(record, t) })}
            </Chip>
          ) : (
            <Chip size="condensed" color={record.identity === 'none' ? 'warning' : 'neutral'} className="pvs-prt-chip-wrap">
              {record.identity === 'none' ? t('prt.gallery.unverified') : t('prt.deck.identity.confirmed')}
            </Chip>
          )}
          {record.maskSuggestions.length > 0 && (
            <Chip size="condensed" color="warning">
              {t('prt.gallery.masksPending', { count: String(record.maskSuggestions.length) })}
            </Chip>
          )}
        </Cluster>
        <Text className="pvs-caption">{t('prt.gallery.captured', { at: formatDayTime(record.capturedAtIso, locale, zone), via })}</Text>
        {/* 3.5.5: the automatic reading — what it found, so the SE (or partner) knows the pins are in place. */}
        {reading ? (
          <Text className="pvs-caption" role="status" data-prt-reading="">
            {t('prt.read.running')}
          </Text>
        ) : record.warnings.includes(SCREEN_READ) ? (
          <Text className="pvs-caption" data-prt-read={record.anchors.length}>
            {record.anchors.length > 0 ? t('prt.read.found', { count: String(new Set(record.anchors.map((anchor) => anchor.key)).size) }) : t('prt.read.none')}
          </Text>
        ) : null}
        {/* 3.5.7: a screen added by hand before 3.5.5 was cut to the print's frame; a label at its edge was lost with it. */}
        {record.source !== 'companion' && record.image.normalization === 'cropped' && (
          <Text className="pvs-caption" data-prt-cropped="">
            {t('prt.read.cropped')}
          </Text>
        )}
        {isFailedLanding(record) && <Text className="pvs-caption">{landingText(record, slot, t)}</Text>}
        {isCorrupt(record) && <Text className="pvs-caption">{t('prt.err.file.corrupt')}</Text>}
        <ApprovalPanel {...approval} describedBy={titleId} />
        <Cluster gap="tight">
          <Button size="condensed" variant="default" onClick={onEdit} aria-label={named(t('prt.gallery.edit'))} data-testid={`prt-edit-${record.slotId}`}>
            <Button.Prefix>
              <EditIcon />
            </Button.Prefix>
            {t('prt.gallery.edit')}
          </Button>
          {onReplace !== undefined && (
            <Button size="condensed" variant="default" onClick={onReplace} aria-label={named(t('prt.gallery.replace'))}>
              <Button.Prefix>
                <UploadIcon />
              </Button.Prefix>
              {t('prt.gallery.replace')}
            </Button>
          )}
          <Button size="condensed" variant="default" onClick={onRemove} aria-label={named(t('prt.gallery.remove'))}>
            <Button.Prefix>
              <DeleteIcon />
            </Button.Prefix>
            {t('prt.gallery.remove')}
          </Button>
        </Cluster>
      </Stack>
    </Panel>
  );
};
