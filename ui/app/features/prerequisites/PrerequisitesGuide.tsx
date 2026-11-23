import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@dynatrace/strato-components/buttons';
import { ExternalLink, Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ActiveGateSignetIcon, AgentIcon, DownloadIcon, FirewallIcon, KeyIcon, PlatformSignetIcon, UserSessionsIcon } from '@dynatrace/strato-icons';

import { useStudio } from '../../config/StudioContext';

import { Callout, Panel, Stack } from '../../engine';
import { useTranslation, type Translation } from '../../i18n/useTranslation';
import { EXAMPLE_ADDRESSES, FIREWALL_STEPS, PREREQ_DOCS, PREREQ_SECTIONS, type PrereqDocId, type PrereqSection } from './content';
import './prerequisites.css';

/**
 * Settings → "Prerequisites" (3.4.13): what a Dynatrace SaaS PoC needs before day one, for the SE and the partner —
 * a drawing of how the data reaches Dynatrace, five checklists by team (network, ActiveGate, OneAgent, RUM, access),
 * each line with the documentation page it came from (`content.ts`), and a drawing of where the customer finds the
 * addresses a strict firewall must allow. Static: no query, no tenant data.
 *
 * 3.4.17 (owner's feedback of 2026-11-20): six cards three by two — the tenant first (sign up for the free trial,
 * get started) — and "Download as PDF" instead of the text file: the browser's print dialog, as the SE Report and the
 * Coverage page do, prints a document of its own (a portal straight under <body>, everything else hidden) with the
 * drawing, the six cards and every documentation link — never the example addresses, which could mislead a customer.
 */

const ICON: Record<PrereqSection['id'], React.ReactNode> = {
  tenant: <PlatformSignetIcon />,
  network: <FirewallIcon />,
  activegate: <ActiveGateSignetIcon />,
  oneagent: <AgentIcon />,
  rum: <UserSessionsIcon />,
  access: <KeyIcon />,
};

const DocLinks = ({ ids, t }: { ids: readonly PrereqDocId[]; t: Translation['t'] }) => (
  <span className="pvs-prq__docs">
    <span className="pvs-prq__docs-label">{t('prq.readDocs')}</span>{' '}
    {ids.map((id, index) => (
      <React.Fragment key={id}>
        {index > 0 && ' · '}
        <ExternalLink href={PREREQ_DOCS[id].url}>{PREREQ_DOCS[id].title}</ExternalLink>
      </React.Fragment>
    ))}
  </span>
);

/** How the data reaches Dynatrace SaaS: every arrow starts where the connection starts. */
/**
 * A label that never leaves its box (3.5.0, the owner's validation of 3.4.18: "palavras saindo do quadrado"): a text
 * longer than `maxChars` is split into two lines at the word break that keeps the longer line shortest.
 */
export function splitLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  if (words.length < 2) return [text];
  let best: string[] = [text];
  let bestLongest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const lines = [words.slice(0, index).join(' '), words.slice(index).join(' ')];
    const longest = Math.max(...lines.map((line) => line.length));
    if (longest < bestLongest) {
      best = lines;
      bestLongest = longest;
    }
  }
  return best;
}

const Lines = ({ x, y, text, maxChars, lineHeight, className }: { x: number; y: number; text: string; maxChars: number; lineHeight: number; className: string }) => {
  const lines = splitLabel(text, maxChars);
  // Centred on y: one line sits on it, two lines straddle it.
  const first = y - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text x={x} y={first} textAnchor="middle" className={className}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

/** How the data reaches Dynatrace SaaS: every connection leaves the customer's network outbound, over TLS. */
const ConnectivityDiagram = ({ t, idPrefix = 'pvs-prq' }: { t: Translation['t']; idPrefix?: string }) => (
  <svg className="pvs-prq-diagram" viewBox="0 0 820 262" role="img" aria-label={t('prq.diagram.aria')} data-testid={idPrefix === 'pvs-prq' ? 'prq-diagram' : undefined}>
    <defs>
      <marker id={`${idPrefix}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="pvs-prq-diagram__head" />
      </marker>
    </defs>
    {/* The customer's side, up to the firewall. */}
    <rect x="8" y="8" width="500" height="246" rx="12" className="pvs-prq-diagram__zone" />
    <text x="24" y="32" className="pvs-prq-diagram__zone-label">{t('prq.diagram.network')}</text>
    <line x1="508" y1="16" x2="508" y2="246" className="pvs-prq-diagram__wall" />
    <text x="516" y="32" className="pvs-prq-diagram__zone-label">{t('prq.diagram.firewall')}</text>

    <rect x="24" y="48" width="200" height="84" rx="10" className="pvs-prq-diagram__node" />
    <Lines x={124} y={82} text={t('prq.diagram.hosts')} maxChars={20} lineHeight={17} className="pvs-prq-diagram__title" />
    <Lines x={124} y={110} text={t('prq.diagram.oneagent')} maxChars={26} lineHeight={15} className="pvs-prq-diagram__sub" />

    <rect x="296" y="48" width="196" height="84" rx="10" className="pvs-prq-diagram__node pvs-prq-diagram__node--optional" />
    <Lines x={394} y={76} text={t('prq.diagram.activegate')} maxChars={22} lineHeight={16} className="pvs-prq-diagram__title pvs-prq-diagram__title--fit" />
    <Lines x={394} y={108} text={t('prq.diagram.optional')} maxChars={26} lineHeight={15} className="pvs-prq-diagram__sub" />

    <rect x="24" y="172" width="200" height="70" rx="10" className="pvs-prq-diagram__node" />
    <Lines x={124} y={211} text={t('prq.diagram.browsers')} maxChars={20} lineHeight={17} className="pvs-prq-diagram__title" />

    <rect x="608" y="48" width="200" height="194" rx="14" className="pvs-prq-diagram__cloud" />
    <Lines x={708} y={136} text={t('prq.diagram.cluster')} maxChars={20} lineHeight={17} className="pvs-prq-diagram__title" />
    <Lines x={708} y={166} text={t('prq.diagram.clusterSub')} maxChars={24} lineHeight={15} className="pvs-prq-diagram__sub" />

    {/* OneAgent → ActiveGate (9999) → cluster (443). */}
    <line x1="224" y1="84" x2="292" y2="84" className="pvs-prq-diagram__flow" markerEnd={`url(#${idPrefix}-arrow)`} />
    <rect x="236" y="62" width="44" height="18" rx="9" className="pvs-prq-diagram__port" />
    <text x="258" y="75" textAnchor="middle" className="pvs-prq-diagram__port-text">9999</text>
    <line x1="492" y1="84" x2="604" y2="84" className="pvs-prq-diagram__flow" markerEnd={`url(#${idPrefix}-arrow)`} />
    <rect x="532" y="62" width="40" height="18" rx="9" className="pvs-prq-diagram__port" />
    <text x="552" y="75" textAnchor="middle" className="pvs-prq-diagram__port-text">443</text>
    {/* OneAgent → cluster directly (443), when there is no ActiveGate. */}
    <path d="M124,132 L124,154 L570,154 L570,124 L604,124" className="pvs-prq-diagram__flow pvs-prq-diagram__flow--alt" markerEnd={`url(#${idPrefix}-arrow)`} fill="none" />
    <text x="346" y="147" textAnchor="middle" className="pvs-prq-diagram__sub">{t('prq.diagram.direct')}</text>
    <rect x="530" y="145" width="40" height="18" rx="9" className="pvs-prq-diagram__port" />
    <text x="550" y="158" textAnchor="middle" className="pvs-prq-diagram__port-text">443</text>
    {/* Browsers → the environment's beacon endpoint. */}
    <line x1="224" y1="207" x2="604" y2="207" className="pvs-prq-diagram__flow pvs-prq-diagram__flow--rum" markerEnd={`url(#${idPrefix}-arrow)`} />
    <text x="390" y="199" textAnchor="middle" className="pvs-prq-diagram__sub">{t('prq.diagram.beacon')}</text>
  </svg>
);

/** A drawing of the installation page, its box of addresses highlighted (documentation-example addresses). */
const InstallPageMock = ({ t }: { t: Translation['t'] }) => (
  <div className="pvs-prq-mock" role="img" aria-label={t('prq.ips.mock.aria')} data-testid="prq-mock">
    <div className="pvs-prq-mock__bar" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
    <div className="pvs-prq-mock__body" aria-hidden="true">
      <div className="pvs-prq-mock__title">{t('prq.ips.mock.title')}</div>
      <div className="pvs-prq-mock__steps">{t('prq.ips.mock.steps')}</div>
      <div className="pvs-prq-mock__lines">
        <span />
        <span />
        <span />
      </div>
      <div className="pvs-prq-mock__box">
        <div className="pvs-prq-mock__box-title">{t('prq.ips.mock.box')}</div>
        {EXAMPLE_ADDRESSES.map((address) => (
          <code key={address}>{address}</code>
        ))}
      </div>
    </div>
  </div>
);

/** The six cards, three by two (two by three, then one, on narrower screens; three by two on the PDF). */
const SectionCards = ({ t }: { t: Translation['t'] }) => (
  <div className="pvs-prq-grid">
    {PREREQ_SECTIONS.map((section) => (
      <Panel as="section" pad="roomy" key={section.id} data-testid={`prq-${section.id}`} className="pvs-prq-card">
        <Stack gap="group">
          <div className="pvs-prq-head">
            <span className="pvs-prq-head__icon" aria-hidden="true">
              {ICON[section.id]}
            </span>
            <div>
              <Heading level={5} as="h3">
                {t(section.titleKey)}
              </Heading>
              <Text className="pvs-caption">{t(section.whoKey)}</Text>
            </div>
          </div>
          <ul className="pvs-prq-list">
            {section.items.map((item) => (
              <li key={item.key}>
                <span>{t(item.key)}</span>
                <DocLinks ids={item.docs} t={t} />
              </li>
            ))}
          </ul>
        </Stack>
      </Panel>
    ))}
  </div>
);

/** "Where to find the addresses": the steps, and — on screen only — the drawing with example addresses. */
const FirewallSteps = ({ t, print }: { t: Translation['t']; print: boolean }) => (
  <Panel as="section" pad="roomy" data-testid={print ? undefined : 'prq-ips'} className="pvs-prq-steps-panel">
    <Stack gap="group">
      <Heading level={4} as="h2">
        {t('prq.ips.title')}
      </Heading>
      <Text className="pvs-caption">{t('prq.ips.caption')}</Text>
      <div className={print ? undefined : 'pvs-prq-ips'}>
        <ol className="pvs-prq-steps">
          {FIREWALL_STEPS.map((step) => (
            <li key={step.key}>
              <span>{t(step.key)}</span>
              <DocLinks ids={step.docs} t={t} />
            </li>
          ))}
        </ol>
        {!print && (
          <div>
            <InstallPageMock t={t} />
            <Text className="pvs-caption">{t('prq.ips.mock.example')}</Text>
          </div>
        )}
      </div>
      <Callout kind="note" title={t('prq.ips.noteTitle')}>
        {t('prq.ips.note')}
      </Callout>
      <DocLinks ids={['ipAllowlist']} t={t} />
    </Stack>
  </Panel>
);

/** The document the PDF prints: title, the customer, the drawing, the six cards, the steps, the source. */
const PrintDocument = ({ t, customer }: { t: Translation['t']; customer: string }) => (
  <div className="pvs-prq-print" data-testid="prq-print">
    <header className="pvs-prq-print__head">
      <h1>{t('prq.pdf.title')}</h1>
      {customer !== '' && <p className="pvs-prq-print__for">{t('prq.pdf.for', { customer })}</p>}
      {/* 3.5.0: the PDF speaks to the customer's teams (the screen's intro is the SE's and the partner's). */}
      <p>{t('prq.pdf.intro')}</p>
      <p>{t('prq.pdf.when')}</p>
    </header>
    <section className="pvs-prq-print__diagram">
      <h2>{t('prq.diagram.title')}</h2>
      <ConnectivityDiagram t={t} idPrefix="pvs-prq-print" />
      <p className="pvs-caption">{t('prq.diagram.caption')}</p>
    </section>
    {/* Page 1 holds the drawing and where to find the addresses; the six cards follow, a row of three a page. */}
    <FirewallSteps t={t} print />
    <SectionCards t={t} />
    <p className="pvs-prq-print__foot">{t('prq.pdf.footer')}</p>
  </div>
);

export const PrerequisitesGuide = () => {
  const { t } = useTranslation();
  const { parameters } = useStudio();
  const [printing, setPrinting] = useState(false);

  // Print once the portal is on the page, then take it away (and the class that hides the app) after the dialog.
  useEffect(() => {
    if (!printing) return;
    const root = document.documentElement;
    root.classList.add('pvs-printing-prq');
    const done = () => {
      root.classList.remove('pvs-printing-prq');
      setPrinting(false);
    };
    window.addEventListener('afterprint', done, { once: true });
    const timer = window.setTimeout(() => window.print(), 300);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', done);
      root.classList.remove('pvs-printing-prq');
    };
  }, [printing]);

  return (
    <Stack gap="section" data-testid="prq-guide">
      <Panel as="section" pad="roomy">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('prq.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('prq.intro')}</Paragraph>
          <Callout kind="recommendation" title={t('prq.pdf')}>
            <Stack gap="tight">
              <Text>{t('prq.when')}</Text>
              <Text className="pvs-caption">{t('prq.pdf.hint')}</Text>
              <div>
                <Button onClick={() => setPrinting(true)} disabled={printing} data-testid="prq-pdf">
                  <Button.Prefix>
                    <DownloadIcon />
                  </Button.Prefix>
                  {t('prq.pdf')}
                </Button>
              </div>
            </Stack>
          </Callout>
        </Stack>
      </Panel>

      <Panel as="section" pad="roomy">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('prq.diagram.title')}
          </Heading>
          <ConnectivityDiagram t={t} />
          <Text className="pvs-caption">{t('prq.diagram.caption')}</Text>
          <DocLinks ids={['connectivity', 'k8sNetwork']} t={t} />
        </Stack>
      </Panel>

      <SectionCards t={t} />
      <FirewallSteps t={t} print={false} />

      <Text className="pvs-caption">{t('prq.source')}</Text>
      {printing && createPortal(<PrintDocument t={t} customer={parameters.customerName.trim()} />, document.body)}
    </Stack>
  );
};
