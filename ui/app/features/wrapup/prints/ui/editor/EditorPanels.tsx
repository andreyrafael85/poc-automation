import React, { useEffect, useRef } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip } from '@dynatrace/strato-components/content';
import { Switch, TextArea, type TextAreaInputRef } from '@dynatrace/strato-components/forms';
import { SimpleTable } from '@dynatrace/strato-components/tables';
import { Heading, Strong, Text } from '@dynatrace/strato-components/typography';

import { Cluster, Stack } from '../../../../../engine';
import type { StringKey } from '../../../../../i18n/strings';
import { useTranslation } from '../../../../../i18n/useTranslation';
import { sourceFooter } from '../../analysis/sourced';
import { MASK_FILL, PRINT_SPACE } from '../../constants';
import { PRINT_BUDGET } from '../../deck/budget';
import type { AnalysisCtx, CrossCheck, MaskRect, PrintPin, Rect } from '../../types';
import { MIN_CONFIRMED_PINS } from '../../capture/approval';

/**
 * The panels under the editor's stage (3.2.7, spec §7.2): one per mode — the pins with their
 * text, the masks (suggestions to accept or ignore, and those burned in), the lupa — and the
 * numbers the screen showed next to what Grail read. Each is a plain view of the record; every
 * change goes back through the editor.
 */

export const REASON_KEY: Readonly<Record<MaskRect['reason'], StringKey>> = {
  email: 'prt.ed.reason.email',
  ipv4: 'prt.ed.reason.ipv4',
  'tenant-url': 'prt.ed.reason.tenantUrl',
  url: 'prt.ed.reason.url',
  'cloud-host': 'prt.ed.reason.cloudHost',
  uuid: 'prt.ed.reason.uuid',
  money: 'prt.ed.reason.money',
  'secret-pair': 'prt.ed.reason.secretPair',
  manual: 'prt.ed.reason.manual',
};

// ------------------------------------------------------------------ pins

export interface PinPanelProps {
  /** Visible pins, in slide order. */
  pins: readonly PrintPin[];
  numberOf: (pin: PrintPin) => number;
  /** The pin's text on the slide (the SE's own, else the suggestion); null when it has none. */
  labelOf: (pin: PrintPin) => string | null;
  /** The app's suggested text of the pin; null for a pin the SE added. */
  suggestedOf: (pin: PrintPin) => string | null;
  selected: PrintPin | null;
  draftText: string;
  /** Bumped to move the keyboard focus into the selected pin's text field. */
  focusRequest: number;
  /** "Adicionar pino": a pin added without the pointer, then moved with the arrows. */
  onAdd: () => void;
  /** 3.5.5: the pin the next click on the print places (guided placement), or null. */
  placing: number | null;
  /** "Posicionar": the next click on the print puts this pin there. */
  onPlace: (n: number) => void;
  /** "Está certo aqui": the estimated spot is right. */
  onConfirm: (n: number) => void;
  onSelect: (n: number) => void;
  onText: (text: string) => void;
  onTextBlur: () => void;
  onRestoreLabel: (n: number) => void;
  onRemove: (n: number) => void;
  /** The SE's own pins replace the suggestions: "Restaurar os pinos sugeridos" brings them back. */
  onRestoreAll: (() => void) | null;
}

export const PinPanel = ({ pins, numberOf, labelOf, suggestedOf, selected, draftText, focusRequest, onAdd, placing, onPlace, onConfirm, onSelect, onText, onTextBlur, onRestoreLabel, onRemove, onRestoreAll }: PinPanelProps) => {
  const { t } = useTranslation();
  const area = useRef<TextAreaInputRef | null>(null);
  // Only a request made while the panel is shown moves the focus: coming back to the Pins mode
  // (the panel mounts again with the last count) must leave the focus on the mode group.
  const handled = useRef(focusRequest);

  useEffect(() => {
    if (focusRequest === handled.current) return;
    handled.current = focusRequest;
    area.current?.inputRef?.focus();
  }, [focusRequest]);

  const shown = selected === null ? null : String(numberOf(selected));
  const estimated = pins.filter((pin) => pin.origin === 'template').length;
  const confirmed = pins.length - estimated;

  return (
    <Stack gap="tight">
      {/* 3.5.5: guided placement — how many pins are in place, and what the approval asks for. */}
      <Text className="pvs-caption" data-prt-pin-progress="">
        {t('prt.ed.place.progress', { confirmed: String(confirmed), total: String(pins.length), min: String(MIN_CONFIRMED_PINS) })}
      </Text>
      <Cluster gap="tight">
        <Button size="condensed" variant="default" onClick={onAdd}>
          {t('prt.ed.pins.add')}
        </Button>
      </Cluster>
      {pins.length === 0 ? (
        <Text>{t('prt.ed.pins.none')}</Text>
      ) : (
        <ol className="pvs-ped-list">
          {pins.map((pin) => {
            const n = String(numberOf(pin));
            return (
              <li key={pin.n}>
                <Cluster gap="tight" align="center">
                  <span className="pvs-ped-badge" aria-hidden="true">
                    {n}
                  </span>
                  <Text>{labelOf(pin) ?? t('prt.ed.pin.noText')}</Text>
                  {pin.origin === 'template' ? (
                    <>
                      <Text className="pvs-caption">({t('prt.ed.estimated')})</Text>
                      <Button
                        size="condensed"
                        variant={placing === pin.n ? 'accent' : 'emphasized'}
                        color="primary"
                        onClick={() => onPlace(pin.n)}
                        aria-pressed={placing === pin.n}
                        data-prt-place={pin.n}
                      >
                        {placing === pin.n ? t('prt.ed.place.waiting', { n }) : t('prt.ed.place.button', { n })}
                      </Button>
                      <Button size="condensed" variant="default" onClick={() => onConfirm(pin.n)} data-prt-confirm={pin.n}>
                        {t('prt.ed.place.confirm')}
                      </Button>
                    </>
                  ) : (
                    <Text className="pvs-caption">{t('prt.ed.place.inPlace')}</Text>
                  )}
                  <Button size="condensed" variant="default" onClick={() => onSelect(pin.n)}>
                    {t('prt.ed.pin.edit', { n })}
                  </Button>
                </Cluster>
              </li>
            );
          })}
        </ol>
      )}

      {selected !== null && shown !== null && (
        <Stack gap="tight" data-prt-pin-form={selected.n}>
          <Heading level={6} as="h4">
            {t('prt.ed.pin.title', { n: shown })}
          </Heading>
          <TextArea
            ref={area}
            value={draftText}
            onChange={(value) => onText(value)}
            onBlur={onTextBlur}
            maxLength={PRINT_BUDGET.pinLabel}
            rows={3}
            resize="vertical"
            width="full"
            aria-label={t('prt.ed.pin.text', { n: shown })}
          />
          <Text className="pvs-caption">
            {t('prt.ed.pin.count', { count: String(draftText.length), max: String(PRINT_BUDGET.pinLabel) })} · {t('prt.ed.pin.textHint')}
          </Text>
          <Cluster gap="tight">
            {selected.labelOverride !== undefined && suggestedOf(selected) !== null && (
              <Button size="condensed" variant="default" onClick={() => onRestoreLabel(selected.n)}>
                {t('prt.ed.restore')}
              </Button>
            )}
            <Button size="condensed" variant="default" color="critical" onClick={() => onRemove(selected.n)}>
              {t('prt.ed.pin.remove', { n: shown })}
            </Button>
          </Cluster>
        </Stack>
      )}

      {onRestoreAll !== null && (
        <Cluster gap="tight">
          <Button size="condensed" variant="default" onClick={onRestoreAll}>
            {t('prt.ed.pins.restoreAll')}
          </Button>
        </Cluster>
      )}
    </Stack>
  );
};

// ------------------------------------------------------------------ masks

export interface MaskPanelProps {
  masks: readonly MaskRect[];
  suggestions: readonly MaskRect[];
  /** "Adicionar tarja": a mask added without the pointer, then moved and resized with the arrows. */
  onAdd: () => void;
  onAccept: (index: number) => void;
  onIgnore: (index: number) => void;
  onAcceptAll: () => void;
  onRemove: (index: number) => void;
}

export const MaskPanel = ({ masks, suggestions, onAdd, onAccept, onIgnore, onAcceptAll, onRemove }: MaskPanelProps) => {
  const { t } = useTranslation();
  return (
    <Stack gap="tight">
      {suggestions.length > 0 && (
        <Stack gap="tight">
          <Cluster gap="tight" align="center">
            <Strong>{t('prt.ed.masks.suggested', { count: String(suggestions.length) })}</Strong>
            <Button size="condensed" variant="emphasized" onClick={onAcceptAll}>
              {t('prt.ed.suggest.acceptAll')}
            </Button>
          </Cluster>
          <ol className="pvs-ped-list">
            {suggestions.map((mask, index) => (
              <li key={`s${index}-${mask.x}-${mask.y}`}>
                <Cluster gap="tight" align="center">
                  <span className="pvs-ped-badge pvs-ped-badge--mask" aria-hidden="true">
                    {index + 1}
                  </span>
                  <Chip size="condensed" color="warning">
                    {t(REASON_KEY[mask.reason])}
                  </Chip>
                  <Button size="condensed" variant="default" onClick={() => onAccept(index)}>
                    {t('prt.ed.suggest.accept')}
                  </Button>
                  <Button size="condensed" variant="default" onClick={() => onIgnore(index)}>
                    {t('prt.ed.suggest.ignore')}
                  </Button>
                </Cluster>
              </li>
            ))}
          </ol>
        </Stack>
      )}

      <Cluster gap="tight" align="center">
        <Strong>{t('prt.ed.masks.accepted', { count: String(masks.length) })}</Strong>
        <Button size="condensed" variant="default" onClick={onAdd}>
          {t('prt.ed.masks.add')}
        </Button>
      </Cluster>
      {masks.length === 0 ? (
        <Text>{t('prt.ed.masks.none')}</Text>
      ) : (
        <ol className="pvs-ped-list">
          {masks.map((mask, index) => (
            <li key={`m${index}-${mask.x}-${mask.y}`}>
              <Cluster gap="tight" align="center">
                <Chip size="condensed">{t(REASON_KEY[mask.reason])}</Chip>
                <Button size="condensed" variant="default" onClick={() => onRemove(index)}>
                  {t('prt.ed.mask.remove', { n: String(index + 1) })}
                </Button>
              </Cluster>
            </li>
          ))}
        </ol>
      )}
    </Stack>
  );
};

// ------------------------------------------------------------------ focus (lupa)

export interface FocusPanelProps {
  focus: Rect | null;
  lupaOn: boolean;
  /** Visible pins on the print: the lupa fits with ≤ 4. */
  pinCount: number;
  /** The layout's default region (moved onto its anchor); null when the layout has none. */
  suggested: Rect | null;
  url: string | null;
  masks: readonly MaskRect[];
  onRestore: (rect: Rect) => void;
  /** "Marcar um detalhe" (a layout without a suggested one): a region placed without the pointer. */
  onAdd: () => void;
  onLupa: (on: boolean) => void;
}

export const FocusPanel = ({ focus, lupaOn, pinCount, suggested, url, masks, onRestore, onAdd, onLupa }: FocusPanelProps) => {
  const { t } = useTranslation();
  const max = PRINT_BUDGET.pinsWithZoom;
  const fits = pinCount <= max;
  return (
    <Stack gap="tight">
      {focus === null && <Text>{t('prt.ed.focus.none')}</Text>}
      {focus === null && suggested === null && (
        <Cluster gap="tight">
          <Button size="condensed" variant="default" onClick={onAdd}>
            {t('prt.ed.focus.add')}
          </Button>
        </Cluster>
      )}
      {suggested !== null && (focus === null || !sameRect(focus, suggested)) && (
        <Cluster gap="tight">
          <Button size="condensed" variant="default" onClick={() => onRestore(suggested)}>
            {t('prt.ed.focus.restore')}
          </Button>
        </Cluster>
      )}
      {focus !== null && (fits || lupaOn) && (
        // Shown while it fits, and while it is on (so it can always be turned off).
        <Switch name="prt-ed-lupa" value={lupaOn} onChange={(checked) => onLupa(checked)}>
          {t('prt.ed.lupa')}
        </Switch>
      )}
      {focus !== null && !fits && !lupaOn && <Text className="pvs-caption">{t('prt.ed.focus.pinsOver', { max: String(max), count: String(pinCount) })}</Text>}
      {focus !== null && !fits && lupaOn && <Text className="pvs-caption">{t('prt.ed.focus.cut', { max: String(max) })}</Text>}
      {focus !== null && url !== null && (
        <Stack gap="tight">
          <Text className="pvs-caption">{t('prt.ed.focus.preview')}</Text>
          <svg
            className="pvs-ped-zoom"
            viewBox={`${focus.x} ${focus.y} ${Math.max(1, focus.w)} ${Math.max(1, focus.h)}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={t('prt.ed.focus.preview')}
            style={{ aspectRatio: `${Math.max(1, focus.w)} / ${Math.max(1, focus.h)}` }}
          >
            <image href={url} x={0} y={0} width={PRINT_SPACE.width} height={PRINT_SPACE.height} />
            {masks.map((mask, index) => (
              <rect key={index} x={mask.x} y={mask.y} width={mask.w} height={mask.h} fill={MASK_FILL} />
            ))}
          </svg>
        </Stack>
      )}
    </Stack>
  );
};

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

// ------------------------------------------------------------------ numbers

export interface NumbersPanelProps {
  checks: readonly CrossCheck[];
  /** Visible pins, to name the pin a screen number sits under. */
  pins: readonly PrintPin[];
  numberOf: (pin: PrintPin) => number;
  ctx: AnalysisCtx;
}

/** Na tela / No Grail / Situação: each screen number beside Grail's, with Grail's source and window. Never reconciled. */
export const NumbersPanel = ({ checks, pins, numberOf, ctx }: NumbersPanelProps) => {
  const { t } = useTranslation();
  const rows = checks.map((check) => {
    const pin = pins.find((item) => item.anchorKey === check.anchorKey);
    return {
      screen: pin === undefined ? check.screen.display : `${t('prt.ed.pin.title', { n: String(numberOf(pin)) })} · ${check.screen.display}`,
      grail: `${check.grail.display} · ${sourceFooter(check.grail, ctx)}`,
      state: check.agree ? t('prt.an.agree') : t('prt.ed.numbers.differ'),
    };
  });
  return (
    <SimpleTable
      data={rows}
      columns={[
        { id: 'screen', header: t('prt.ed.numbers.screen'), accessor: 'screen' },
        { id: 'grail', header: t('prt.ed.numbers.grail'), accessor: 'grail' },
        { id: 'state', header: t('prt.ed.numbers.state'), accessor: 'state' },
      ]}
      variant={{ rowDensity: 'condensed', rowSeparation: 'horizontalDividers' }}
    />
  );
};
