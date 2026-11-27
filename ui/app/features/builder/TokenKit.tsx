import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox, TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useAccess } from '../../config/AccessContext';
import { useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { browserTimeZone } from './PocAutomationKits';
import { openInWorkflows, parseRecipients, workflowFile } from './pocAutomation';
import { buildTokenWorkflow, type TokenWords } from './pocTokens';

/**
 * 3.8.3 — the PoC Builder's token security agent (the Workflows tab): a daily workflow that audits the environment's access
 * tokens and credential vault and, only when it finds something, e-mails what to disable with Dynatrace Assist's reading.
 * Handed to the Workflows app (its intent, or .json) and saved there by the SE — the app never writes a workflow.
 */

type T = (key: StringKey, values?: Record<string, string>) => string;

/** The workflow's words in the screen's language. */
export function tokenWords(t: T, customer: string): TokenWords {
  return {
    title: t('tok.wf.name', { customer }),
    description: t('tok.wf.description'),
    auditDescription: t('tok.wf.auditTask'),
    aiDescription: t('builder.wf.aiTask'),
    aiPrompt: t('tok.wf.aiPrompt'),
    aiHeading: t('builder.wf.aiHeading'),
    mailDescription: t('builder.wf.task'),
    heading: t('tok.mail.heading', { customer }),
    gist: t('tok.mail.gist'),
    subject: t('tok.mail.subject', { customer }),
    colKind: t('tok.mail.col.kind'),
    colTotal: t('tok.mail.col.total'),
    colActive: t('tok.mail.col.active'),
    colNoExpiry: t('tok.mail.col.noExpiry'),
    colExpiring: t('tok.mail.col.expiring'),
    colUnused: t('tok.mail.col.unused'),
    colNever: t('tok.mail.col.never'),
    colBroad: t('tok.mail.col.broad'),
    kindApi: t('tok.mail.kind.api'),
    kindActiveGate: t('tok.mail.kind.activeGate'),
    personalOf: t('tok.mail.personalOf'),
    findingsHeading: t('tok.mail.findings'),
    colToken: t('tok.mail.col.token'),
    colOwner: t('tok.mail.col.owner'),
    colLastUsed: t('tok.mail.col.lastUsed'),
    colExpires: t('tok.mail.col.expires'),
    colFindings: t('tok.mail.col.findings'),
    colAction: t('tok.mail.col.action'),
    never: t('tok.mail.never'),
    noExpiry: t('tok.mail.noExpiry'),
    more: t('tok.mail.more'),
    vaultHeading: t('tok.mail.vaultHeading'),
    vault: t('tok.mail.vault'),
    unread: t('tok.mail.unread'),
    accountHeading: t('tok.mail.account'),
    accountSteps: [t('tok.mail.account.oauth'), t('tok.mail.account.platform'), t('tok.mail.account.admins'), t('tok.mail.account.link')],
    method: t('tok.mail.method'),
    footer: t('tok.mail.footer'),
    finding: {
      noExpiry: t('tok.finding.noExpiry'),
      expiring: t('tok.finding.expiring'),
      unused: t('tok.finding.unused'),
      neverUsed: t('tok.finding.neverUsed'),
      broad: t('tok.finding.broad'),
    },
    kind: { api: t('tok.kind.api'), personal: t('tok.kind.personal'), activeGate: t('tok.kind.activeGate') },
    action: { disable: t('tok.action.disable'), rotate: t('tok.action.rotate'), review: t('tok.action.review') },
  };
}

export const TokenKit = () => {
  const { t } = useTranslation();
  const { parameters } = useStudio();
  const access = useAccess();
  const customer = parameters.customerName.trim() === '' ? 'PoC' : parameters.customerName.trim();
  const [to, setTo] = useState(access.identity.email || '');
  const [shared, setShared] = useState(false);
  const [opened, setOpened] = useState(false);
  const recipients = parseRecipients(to);
  const timezone = browserTimeZone();

  const body = () => buildTokenWorkflow({ recipients: recipients.valid, shared, timezone }, tokenWords(t, customer));
  const download = () => {
    const url = URL.createObjectURL(workflowFile(body()));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poc-token-security-workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel pad="roomy" data-testid="builder-token-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('tok.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('tok.what')}</Paragraph>
        </Stack>
        <ol className="pvs-doc-steps">
          <li>{t('tok.step1', { timezone })}</li>
          <li>{t('tok.step2')}</li>
          <li>{t('tok.step3')}</li>
        </ol>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.wf.to')}</Text>
          <TextInput value={to} onChange={setTo} aria-label={t('builder.wf.to')} data-testid="builder-token-to" />
          {recipients.invalid.length > 0 && <Text className="pvs-caption">{t('builder.wf.invalid', { list: recipients.invalid.join(', ') })}</Text>}
        </Stack>
        {/* Private by default: the e-mail names tokens and their owners. */}
        <Checkbox value={shared} onChange={(value) => setShared(value === true)}>
          {t('builder.wf.shared')}
        </Checkbox>
        <Cluster>
          <Button
            variant="emphasized"
            onClick={() => {
              openInWorkflows(body());
              setOpened(true);
            }}
            disabled={recipients.valid.length === 0}
            data-testid="builder-token-open"
          >
            {t('cap.open')}
          </Button>
          <Button onClick={download} disabled={recipients.valid.length === 0} data-testid="builder-token-download">
            {t('cap.download')}
          </Button>
        </Cluster>
        {opened && (
          <MessageContainer variant="primary">
            <MessageContainer.Title>{t('builder.wf.opened.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t('tok.opened')}</MessageContainer.Description>
          </MessageContainer>
        )}
        <Text className="pvs-caption">{t('tok.why')}</Text>
      </Stack>
    </Panel>
  );
};
