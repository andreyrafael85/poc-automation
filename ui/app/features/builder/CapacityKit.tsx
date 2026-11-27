import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox, Select, TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useAccess } from '../../config/AccessContext';
import { useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { browserTimeZone } from './PocAutomationKits';
import { openInWorkflows, parseRecipients, workflowFile } from './pocAutomation';
import {
  CAPACITY_HORIZONS,
  CAPACITY_KINDS,
  CAPACITY_THRESHOLD,
  buildCapacityWorkflow,
  type CapacityHorizon,
  type CapacityKind,
  type CapacityWords,
} from './pocCapacity';

/**
 * 3.8.2 — the PoC Builder's "Predictive capacity" kit (the Workflows tab): four workflows that ask Dynatrace Intelligence for
 * a forecast of the environment's capacity every day and, only when it reaches the line, send an e-mail with Dynatrace
 * Assist's reading and raise a resource-contention event (it opens a problem). Each is handed to the Workflows app (by its
 * intent, or as .json) and saved there by the SE — the app never writes a workflow.
 */

/** The lines the SE may pick for each forecast, in percent. */
const LINES: Record<CapacityKind, readonly number[]> = { disk: [80, 85, 90, 95], memory: [80, 85, 90, 95], cpu: [75, 80, 85, 90], k8sMemory: [85, 90, 95, 100] };

export const CapacityKit = () => {
  const { t, locale } = useTranslation();
  const { parameters } = useStudio();
  const access = useAccess();
  const customer = parameters.customerName.trim() === '' ? 'PoC' : parameters.customerName.trim();
  const [to, setTo] = useState(access.identity.email || '');
  const [horizon, setHorizon] = useState<CapacityHorizon>(7);
  const [shared, setShared] = useState(true);
  const [lines, setLines] = useState<Record<CapacityKind, number>>({ ...CAPACITY_THRESHOLD });
  const [opened, setOpened] = useState<CapacityKind | null>(null);
  const recipients = parseRecipients(to);
  const timezone = browserTimeZone();

  const words = (kind: CapacityKind): CapacityWords => {
    const signal = t(`cap.kind.${kind}` as StringKey);
    return {
      title: t('cap.wf.name', { signal, customer }),
      description: t('cap.wf.description', { signal }),
      forecastDescription: t('cap.wf.forecastTask'),
      aiDescription: t('builder.wf.aiTask'),
      aiPrompt: t('cap.wf.aiPrompt'),
      aiHeading: t('builder.wf.aiHeading'),
      mailDescription: t('builder.wf.task'),
      eventDescription: t('cap.wf.eventTask'),
      eventTitleNow: t('cap.ev.titleNow', { signal }),
      eventTitleLikely: t('cap.ev.titleLikely', { signal }),
      eventTextNow: t('cap.ev.textNow', { signal }),
      eventTextLikely: t('cap.ev.textLikely', { signal }),
      heading: t('cap.mail.heading', { signal, customer }),
      gist: t('cap.mail.gist'),
      subject: t('cap.mail.subject', { signal, customer }),
      colName: t(`cap.mail.col.name.${kind === 'k8sMemory' ? 'k8s' : kind === 'disk' ? 'disk' : 'host'}` as StringKey),
      colStatus: t('cap.mail.col.status'),
      statusNow: t('cap.mail.status.now'),
      statusLikely: t('cap.mail.status.likely'),
      statusPossible: t('cap.mail.status.possible'),
      colWhen: t('cap.mail.col.when'),
      colDays: t('cap.mail.col.days'),
      colTop: t('cap.mail.col.top'),
      colEnd: t('cap.mail.col.end'),
      more: t('cap.mail.more'),
      method: t('cap.mail.method'),
      footer: t('cap.mail.footer'),
    };
  };

  const body = (kind: CapacityKind) =>
    buildCapacityWorkflow(
      { kind, threshold: lines[kind], horizon, recipients: recipients.valid, raiseEvents: true, shared, timezone },
      words(kind),
    );

  const download = (kind: CapacityKind) => {
    const url = URL.createObjectURL(workflowFile(body(kind)));
    const link = document.createElement('a');
    link.href = url;
    link.download = `poc-capacity-${kind}-workflow.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel pad="roomy" data-testid="builder-capacity-kit">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('cap.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('cap.what')}</Paragraph>
        </Stack>
        <ol className="pvs-doc-steps">
          <li>{t('cap.step1', { timezone })}</li>
          <li>{t('cap.step2')}</li>
          <li>{t('cap.step3')}</li>
        </ol>
        <Cluster>
          <Stack gap="tight">
            <Text className="pvs-label" id="cap-horizon-label">
              {t('cap.horizon')}
            </Text>
            <Select
              value={String(horizon)}
              onChange={(value) => setHorizon(value === '14' ? 14 : 7)}
              aria-labelledby="cap-horizon-label"
              data-testid="builder-capacity-horizon"
            >
              <Select.Content>
                {CAPACITY_HORIZONS.map((days) => (
                  <Select.Option key={days} value={String(days)}>
                    {t('cap.horizon.days', { n: String(days) })}
                  </Select.Option>
                ))}
              </Select.Content>
            </Select>
          </Stack>
        </Cluster>
        <ul className="pvs-capkit" aria-label={t('cap.title')}>
          {CAPACITY_KINDS.map((kind) => (
            <li key={kind} className="pvs-capkit__item" data-testid={`builder-capacity-${kind}`}>
              <Stack gap="tight">
                <Text className="pvs-capkit__name">{t(`cap.kind.${kind}` as StringKey)}</Text>
                <Text className="pvs-caption">{t(`cap.kind.${kind}.what` as StringKey)}</Text>
                <Cluster>
                  <Text className="pvs-caption" id={`cap-line-${kind}`}>
                    {t('cap.line')}
                  </Text>
                  <Select
                    value={String(lines[kind])}
                    onChange={(value) => typeof value === 'string' && setLines({ ...lines, [kind]: Number(value) })}
                    aria-labelledby={`cap-line-${kind}`}
                  >
                    <Select.Content>
                      {LINES[kind].map((line) => (
                        <Select.Option key={line} value={String(line)}>
                          {`${line}%`}
                        </Select.Option>
                      ))}
                    </Select.Content>
                  </Select>
                </Cluster>
                <Cluster>
                  <Button
                    variant="emphasized"
                    onClick={() => {
                      openInWorkflows(body(kind));
                      setOpened(kind);
                    }}
                    disabled={recipients.valid.length === 0}
                    data-testid={`builder-capacity-open-${kind}`}
                  >
                    {t('cap.open')}
                  </Button>
                  <Button onClick={() => download(kind)} disabled={recipients.valid.length === 0} data-testid={`builder-capacity-download-${kind}`}>
                    {t('cap.download')}
                  </Button>
                </Cluster>
              </Stack>
            </li>
          ))}
        </ul>
        <Stack gap="tight">
          <Text className="pvs-label">{t('builder.wf.to')}</Text>
          <TextInput value={to} onChange={setTo} aria-label={t('builder.wf.to')} data-testid="builder-capacity-to" />
          {recipients.invalid.length > 0 && <Text className="pvs-caption">{t('builder.wf.invalid', { list: recipients.invalid.join(', ') })}</Text>}
        </Stack>
        <Text className="pvs-caption" data-testid="builder-capacity-events">
          {t('cap.events.always')}
        </Text>
        <Checkbox value={shared} onChange={(value) => setShared(value === true)}>
          {t('builder.wf.shared')}
        </Checkbox>
        {opened !== null && (
          <MessageContainer variant="primary">
            <MessageContainer.Title>{t('builder.wf.opened.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t('cap.opened', { signal: t(`cap.kind.${opened}` as StringKey) })}</MessageContainer.Description>
          </MessageContainer>
        )}
        <Text className="pvs-caption">{t('cap.why')}</Text>
        {/* Keeps the language of the e-mails the same as the screen's (the workflows carry their own texts). */}
        <Text className="pvs-caption" data-locale={locale}>
          {t('cap.language')}
        </Text>
      </Stack>
    </Panel>
  );
};
