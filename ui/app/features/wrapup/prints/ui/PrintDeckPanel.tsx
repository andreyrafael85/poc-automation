import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer, SkeletonText } from '@dynatrace/strato-components/content';
import { Checkbox } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { DownloadIcon, PrintIcon } from '@dynatrace/strato-icons';

import { Cluster, Stack } from '../../../../engine';
import { useTranslation } from '../../../../i18n/useTranslation';
import { DeckPreview } from '../../DeckPreview';
import type { DeckProfile } from '../../spec';
import { useTemplateArt } from '../../templateArt';
import { formatBytes } from '../analysis/methodology';
import { printDeckFileName, useDeckDownload } from '../deck/useDeckDownload';
import type { PrintDeckModel } from './usePrintDeckModel';
import type { PrintDeckIdentity } from './usePrintDeckIdentity';

/**
 * D · Deck (3.2.7, spec §1.3, §5, §2.10): the real-prints deck of the active export profile —
 * every kept print with its analytic reading, the story and the methodology — previewed with the
 * same specification the file is written from (preview slides = file slides = PDF pages).
 *
 * "Baixar deck de prints (.pptx)" never says "PowerPoint" (the Tech Wrapup's button stays the only
 * one that does); while no print is ready for this profile the tab says so instead of offering a
 * file, and while a print's image is still being prepared (masks burned in) neither the file nor
 * the PDF is offered — both would miss that print. Screen-only blocks carry `data-wrap-hide`;
 * printing isolates the slides on its own (`DECK_PRINT_CSS`, rendered by the tab).
 */

export interface PrintDeckPanelProps {
  model: PrintDeckModel;
  identity: PrintDeckIdentity;
  profile: DeckProfile;
  /** 3.5.5: the methodology and DQL appendix ("Incluir apêndice técnico"), off by default. */
  includeAppendix?: boolean;
  onIncludeAppendix?: (on: boolean) => void;
  /** 3.5.7: how many screens are still being read; the download waits for them. */
  readingScreens?: number;
}

export const PrintDeckPanel = ({ model, identity, profile, includeAppendix = false, onIncludeAppendix, readingScreens = 0 }: PrintDeckPanelProps) => {
  const { t, locale } = useTranslation();
  const art = useTemplateArt();
  const { state, download } = useDeckDownload();
  const busy = state.phase === 'busy';

  const onDownload = () => {
    void download(model.spec, { dtLogo: identity.dtLogo, seName: identity.seName }, printDeckFileName(identity.customer, profile, new Date(), locale));
  };

  return (
    <Stack gap="group">
      <Stack gap="tight" data-wrap-hide>
        <Heading level={5} as="h3">
          {t('prt.deck.title')}
        </Heading>
        <Paragraph className="pvs-prose">{t('prt.deck.lead')}</Paragraph>
        {onIncludeAppendix !== undefined && (
          <Checkbox name="prt-include-appendix" value={includeAppendix} onChange={(checked) => onIncludeAppendix(checked === true)} data-testid="prt-include-appendix">
            {t('prt.deck.appendix')}
          </Checkbox>
        )}
      </Stack>

      <div data-wrap-hide>
        <Stack gap="tight">
          {/* While a print's image is being prepared the preview, the file and the PDF would all miss it: the status line below says so instead. */}
          {/* 3.5.7: while screens are still being read, the deck would miss their pins: it waits and says so. */}
          {model.baking || readingScreens > 0 ? null : model.frameOnly ? (
            <Text>{t('prt.deck.empty')}</Text>
          ) : (
            <Cluster gap="group" align="center">
              <Button variant="accent" color="primary" onClick={onDownload} data-testid="prt-download-deck">
                <Button.Prefix>
                  <DownloadIcon />
                </Button.Prefix>
                {busy ? t('prt.deck.generating') : t('prt.deck.download')}
              </Button>
              <Button variant="emphasized" onClick={() => window.print()}>
                <Button.Prefix>
                  <PrintIcon />
                </Button.Prefix>
                {t('prt.deck.print')}
              </Button>
              <Text className="pvs-caption">{t('deck.pdf.howTo')}</Text>
            </Cluster>
          )}
          {(model.evidenceLoading || model.baking || readingScreens > 0) && (
            <Stack gap="tight">
              <SkeletonText lines={1} />
              <Text role="status" className="pvs-caption" data-testid="prt-deck-wait">
                {readingScreens > 0 ? t('prt.deck.readingScreens', { count: String(readingScreens) }) : model.baking ? t('prt.deck.baking') : t('prt.deck.reading')}
              </Text>
            </Stack>
          )}
          {model.bakeFailures.map((title) => (
            <Text key={title} className="pvs-caption">
              {t('prt.err.file', { name: title, why: t('prt.err.file.decode') })}
            </Text>
          ))}
          {state.phase === 'ready' && (
            <MessageContainer variant="success">
              <MessageContainer.Title>{t('deck.download.ready', { name: state.name })}</MessageContainer.Title>
              <MessageContainer.Description>
                <Stack gap="tight">
                  <Text>{t('prt.deck.size', { size: formatBytes(state.bytes, { locale }) })}</Text>
                  <a href={state.url} download={state.name}>
                    {t('deck.download.fallback')}
                  </a>
                </Stack>
              </MessageContainer.Description>
            </MessageContainer>
          )}
          {state.phase === 'failed' && (
            <MessageContainer variant="critical">
              <MessageContainer.Title>{t('prt.deck.failed', { reason: state.reason })}</MessageContainer.Title>
            </MessageContainer>
          )}
        </Stack>
      </div>

      <Stack gap="group">
        <div data-wrap-hide>
          <Heading level={6} as="h4">
            {t('deck.preview.title', { count: String(model.spec.slides.length) })}
          </Heading>
        </div>
        <DeckPreview
          spec={model.spec}
          art={art}
          dtLogo={identity.dtLogo}
          slideLabel={(n, total, title) => t('deck.slideLabel', { n: String(n), total: String(total), title })}
        />
      </Stack>
    </Stack>
  );
};
