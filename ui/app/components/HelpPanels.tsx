import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Sheet } from '@dynatrace/strato-components/overlays';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { APP_CREATOR, installedVersion } from '../config/appInfo';
import { EVIDENCE, EVIDENCE_ORDER, Stack } from '../engine';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { AssumptionsList } from './AssumptionsList';

/**
 * The content behind the help menu.
 *
 * Five panels — a usage guide, the methodology, the data sources, "what's new"
 * and "about" — rendered in a Strato `Sheet`. Every sentence is a dictionary key,
 * so the panels read correctly in both languages and are covered by the
 * translation scanner like the rest of the app.
 *
 * Nothing here is invented: the creator and contact are the credit the app has
 * always shown, and the only external links are the official Dynatrace pages the
 * project already cites. There is no support portal or issue tracker, so none is
 * offered.
 */

export type HelpPanelId = 'guide' | 'methodology' | 'assumptions' | 'sources' | 'whatsNew' | 'about';

const TITLE: Record<HelpPanelId, StringKey> = {
  guide: 'help.guide.title',
  methodology: 'help.methodology.title',
  assumptions: 'help.assumptions.title',
  sources: 'help.sources.title',
  whatsNew: 'help.whatsNew.title',
  about: 'help.about.title',
};

const GUIDE_STEPS: readonly StringKey[] = [
  'help.guide.s1',
  'help.guide.s2',
  'help.guide.s3',
  'help.guide.s4',
  'help.guide.s5',
];

/**
 * 3.5.3 (owner's request of 2026-11-20: "the text is already huge — keep only the last 10 releases, with the date each
 * was published"): the panel lists the ten latest releases, newest first, each with its version and the day it reached
 * the lab tenant (a release built and published inside the next one carries that one's day). The older keys stay in
 * the i18n fragments, out of the panel; the full history lives in the repository (`AGENTS.md`, the release docs).
 */
export const WHATS_NEW_SHOWN = 10;

export const WHATS_NEW: readonly { key: StringKey; published: string }[] = [
  { key: 'help.whatsNew.i126', published: '2026-11-28' },
  { key: 'help.whatsNew.i125', published: '2026-11-27' },
  { key: 'help.whatsNew.i124', published: '2026-11-27' },
  { key: 'help.whatsNew.i123', published: '2026-11-27' },
  { key: 'help.whatsNew.i122', published: '2026-11-26' },
  { key: 'help.whatsNew.i121', published: '2026-11-23' },
  { key: 'help.whatsNew.i120', published: '2026-11-23' },
  { key: 'help.whatsNew.i119', published: '2026-11-23' },
  { key: 'help.whatsNew.i118', published: '2026-11-23' },
  { key: 'help.whatsNew.i117', published: '2026-11-23' },
];

const Steps = ({ keys }: { keys: readonly StringKey[] }) => {
  const { t } = useTranslation();
  return (
    <ol className="pvs-prose pvs-list">
      {keys.map((key) => (
        <li key={key}>
          <Paragraph>{t(key)}</Paragraph>
        </li>
      ))}
    </ol>
  );
};

/** "3.5.2 — text" → the version apart, so it heads its entry beside the day it was published. */
const splitVersion = (text: string): { version: string | null; body: string } => {
  const match = /^(\d+\.\d+\.\d+)\s+—\s+([\s\S]*)$/.exec(text);
  return match === null ? { version: null, body: text } : { version: match[1] ?? null, body: match[2] ?? text };
};

const ReleaseNotes = () => {
  const { t, formatDay } = useTranslation();
  return (
    <>
      <ol className="pvs-prose pvs-list pvs-whatsnew" data-testid="whats-new">
        {WHATS_NEW.slice(0, WHATS_NEW_SHOWN).map(({ key, published }) => {
          const { version, body } = splitVersion(t(key));
          return (
            <li key={key} className="pvs-whatsnew__item">
              <Text className="pvs-whatsnew__head">
                {version !== null && <strong className="pvs-whatsnew__version">{version}</strong>}
                <span className="pvs-whatsnew__date">{t('help.whatsNew.published', { day: formatDay(published) })}</span>
              </Text>
              <Paragraph>{body}</Paragraph>
            </li>
          );
        })}
      </ol>
      <Paragraph className="pvs-caption">{t('help.whatsNew.older', { n: String(WHATS_NEW_SHOWN) })}</Paragraph>
    </>
  );
};

const EvidenceLegend = () => {
  const { t } = useTranslation();
  return (
    <Stack gap="tight" role="group" aria-label={t('evidence.legend.title')}>
      <Heading level={5}>{t('evidence.legend.title')}</Heading>
      <Paragraph>{t('evidence.legend.intro')}</Paragraph>
      <ul className="pvs-list pvs-legend">
        {EVIDENCE_ORDER.map((provenance) => {
          const entry = EVIDENCE[provenance];
          const Icon = entry.Icon;
          return (
            <li key={provenance} className="pvs-legend__item" data-border={entry.border}>
              <Icon aria-hidden="true" />
              <Text>
                <strong>{t(entry.labelKey)}</strong> — {t(entry.descriptionKey)}
              </Text>
            </li>
          );
        })}
      </ul>
      <Paragraph>{t('evidence.legend.solid')}</Paragraph>
      <Paragraph>{t('evidence.legend.dashed')}</Paragraph>
    </Stack>
  );
};

const Body = ({ panel }: { panel: HelpPanelId }) => {
  const { t } = useTranslation();

  switch (panel) {
    case 'guide':
      return <Steps keys={GUIDE_STEPS} />;
    case 'methodology':
      return (
        <Stack gap="group">
          <Paragraph>{t('help.methodology.p1')}</Paragraph>
          <Paragraph>{t('help.methodology.p2')}</Paragraph>
          <Paragraph>{t('help.methodology.p3')}</Paragraph>
          <Paragraph>{t('help.methodology.p4')}</Paragraph>
          <EvidenceLegend />
        </Stack>
      );
    case 'assumptions':
      return <AssumptionsList />;
    case 'sources':
      return (
        <Stack gap="group">
          <Paragraph>{t('help.sources.p1')}</Paragraph>
          <Paragraph>{t('help.sources.p2')}</Paragraph>
          <Paragraph>{t('help.sources.p3')}</Paragraph>
        </Stack>
      );
    case 'whatsNew':
      return (
        <Stack gap="group">
          <Paragraph>{t('help.whatsNew.intro')}</Paragraph>
          <ReleaseNotes />
        </Stack>
      );
    case 'about':
      return (
        <Stack gap="group">
          <Paragraph>{t('help.about.tagline')}</Paragraph>
          <dl className="pvs-facts">
            <dt>{t('help.about.version')}</dt>
            <dd>{installedVersion()}</dd>
            <dt>{t('help.about.concept')}</dt>
            <dd>{t('help.about.conceptName')}</dd>
            <dt>{t('help.about.creator')}</dt>
            <dd>
              {APP_CREATOR.name} · {APP_CREATOR.role}
            </dd>
            <dt>{t('help.about.contact')}</dt>
            <dd>
              <Link href={`mailto:${APP_CREATOR.email}`}>{APP_CREATOR.email}</Link>
            </dd>
          </dl>
          <Paragraph>{t('help.sources.p2')}</Paragraph>
        </Stack>
      );
  }
};

export interface HelpPanelsProps {
  /** The open panel, or `null` when none is. */
  panel: HelpPanelId | null;
  onClose: () => void;
}

export const HelpPanels = ({ panel, onClose }: HelpPanelsProps) => {
  const { t } = useTranslation();
  return (
    <Sheet
      show={panel !== null}
      onDismiss={onClose}
      title={panel === null ? t('help.label') : t(TITLE[panel])}
      aria-label={panel === null ? t('help.label') : t(TITLE[panel])}
      // A sheet covers the whole viewport and Strato closes it only on Escape, so a
      // mouse or touch user needs an explicit way out. It is also the one focusable
      // element the sheet requires.
      actions={
        <Button variant="emphasized" onClick={onClose}>
          {t('help.close')}
        </Button>
      }
    >
      {panel !== null && (
        <div className="pvs-sheet">
          <Body panel={panel} />
        </div>
      )}
    </Sheet>
  );
};
