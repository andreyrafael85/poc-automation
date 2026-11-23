import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Checkbox, Switch } from '@dynatrace/strato-components/forms';
import { Text } from '@dynatrace/strato-components/typography';

import { Cluster, Stack } from '../../../../engine';
import { useTranslation } from '../../../../i18n/useTranslation';
import { approvalBlockers } from '../capture/approval';
import type { PrintRecord, ShotSlot } from '../types';

/**
 * "Aprovado para o cliente" for one print (3.2.7, spec §7.2): rendered in each gallery card and
 * reusable inside the editor.
 *
 * The approval is bound to the image, the masks and the focus (recomputed on every read), so the
 * controls only ever ask for what still blocks it:
 * - pending mask suggestions — "Aceitar todas" turns them into masks;
 * - an unverified screen — "Esta é a tela de {nome}" (only while the identity is `none`);
 * - the privacy checklist;
 * - a companion print that did not land on its screen (text only: capture it again).
 * The switch is rendered only when nothing blocks it; otherwise the blocker's text stands in its
 * place — there is no disabled control.
 *
 * Test ids sit on the controls themselves (never inside a Chip): `prt-accept-masks-<shotId>`,
 * `prt-identity-<shotId>`, `prt-checklist-<shotId>`, `prt-approve-<shotId>`. Strato's Checkbox and
 * Switch put a `data-testid` on their own root (`role="group"`, which holds the label and the
 * input), so a click on it toggles the control.
 */

export interface ApprovalPanelProps {
  record: PrintRecord;
  /** The planned screen the print stands for. */
  slot: Pick<ShotSlot, 'id' | 'forced'>;
  /** The screen's name for "Esta é a tela de {nome}" (translated, the entity's name when known). */
  name: string;
  /** The approval as it holds right now (recomputed against the hashes). */
  approved: boolean;
  /**
   * False while that recomputation for the print as it is now is still running (just after a load,
   * an approval or an edit): the panel then neither shows "approve again" nor flips the switch off
   * for a print that carries an approval. Absent = settled.
   */
  settled?: boolean;
  /** The privacy checklist; not stored on the print (the approval records that it was ticked). */
  checklistTicked: boolean;
  onChecklistChange: (ticked: boolean) => void;
  /** "Aceitar todas": every pending suggestion becomes a mask. */
  onAcceptMasks: () => void;
  /** "Esta é a tela de {nome}" ticked: the identity becomes `se-confirmed`. */
  onConfirmIdentity: () => void;
  onApprove: () => Promise<void>;
  onRevoke: () => void;
  /**
   * The harness test ids on the controls (default on). The editor renders a second panel for the
   * same print while the gallery card's panel stays mounted; it passes false so no test id repeats.
   */
  testIds?: boolean;
  /**
   * The id of the element that names the print (the gallery card's title): every control here is
   * described by it, so seven identical "Conferi: …" checkboxes and switches each say which print
   * they are for (3.2.7 review UX-M8). The editor's dialog title already does that.
   */
  describedBy?: string;
}

export const ApprovalPanel = ({
  record,
  slot,
  name,
  approved,
  settled = true,
  checklistTicked,
  onChecklistChange,
  onAcceptMasks,
  onConfirmIdentity,
  onApprove,
  onRevoke,
  testIds = true,
  describedBy,
}: ApprovalPanelProps) => {
  const { t } = useTranslation();
  const testId = (value: string): { 'data-testid'?: string } => (testIds ? { 'data-testid': value } : {});
  const described: { 'aria-describedby'?: string } = describedBy === undefined ? {} : { 'aria-describedby': describedBy };
  const [pending, setPending] = useState(false);
  const shotId = record.slotId;
  const blockers = approvalBlockers(record, checklistTicked);
  const suggestions = record.maskSuggestions.length;
  // While the hashes of a print that carries an approval are being checked, the switch keeps showing it.
  const checking = !settled && record.approval !== null;
  const on = approved || pending || checking;
  const revoked = record.approval !== null && settled && !approved && !pending;

  const approve = () => {
    setPending(true);
    void onApprove().finally(() => setPending(false));
  };

  return (
    <Stack gap="tight" className="pvs-prt-approval">
      {suggestions > 0 && (
        <Cluster gap="tight" align="center">
          <Text className="pvs-caption">{t('prt.ap.pending', { count: String(suggestions) })}</Text>
          <Button size="condensed" variant="emphasized" onClick={onAcceptMasks} {...described} {...testId(`prt-accept-masks-${shotId}`)}>
            {t('prt.ed.suggest.acceptAll')}
          </Button>
        </Cluster>
      )}

      {record.identity === 'none' && (
        <Checkbox
          name={`prt-identity-${shotId}`}
          value={false}
          onChange={(checked) => {
            if (checked === true) onConfirmIdentity();
          }}
          {...described}
          {...testId(`prt-identity-${shotId}`)}
        >
          {t('prt.ap.identity', { name })}
        </Checkbox>
      )}
      {record.identity === 'se-confirmed' && <Text className="pvs-caption">{t('prt.deck.identity.confirmed')}</Text>}
      {slot.forced && record.identity !== 'anchor' && <Text className="pvs-caption">{t('prt.ap.forcedAnchor')}</Text>}

      <Checkbox
        name={`prt-checklist-${shotId}`}
        value={checklistTicked}
        onChange={(checked) => onChecklistChange(checked === true)}
        {...described}
        {...testId(`prt-checklist-${shotId}`)}
      >
        {t('prt.ap.checklist')}
      </Checkbox>

      {blockers.includes('landing-not-ok') && <Text className="pvs-caption">{t('prt.ap.landing')}</Text>}

      {blockers.length === 0 ? (
        <Stack gap="tight">
          <Switch
            name={`prt-approve-${shotId}`}
            value={on}
            onChange={(checked) => {
              if (checked) approve();
              else onRevoke();
            }}
            {...described}
            {...testId(`prt-approve-${shotId}`)}
          >
            {t('prt.ap.switch')}
          </Switch>
          {revoked && <Text className="pvs-caption">{t('prt.ap.revoked')}</Text>}
        </Stack>
      ) : (
        blockerText(blockers, name, t) !== null && (
          <Text className="pvs-caption" data-prt-blocked="">
            {blockerText(blockers, name, t)}
          </Text>
        )
      )}
    </Stack>
  );
};

/**
 * What still stands between the print and the switch, most actionable first. Pending suggestions
 * already say so next to "Aceitar todas", so they add no second line here.
 */
function blockerText(blockers: ReturnType<typeof approvalBlockers>, name: string, t: ReturnType<typeof useTranslation>['t']): string | null {
  if (blockers.includes('landing-not-ok')) return null;
  if (blockers.includes('identity-unconfirmed')) return t('prt.ap.needIdentity', { name });
  if (blockers.includes('checklist')) return t('prt.ap.needChecklist');
  return null;
}
