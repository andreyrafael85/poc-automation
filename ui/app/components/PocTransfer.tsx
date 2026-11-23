import React, { useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';
import { DownloadIcon, UploadIcon } from '@dynatrace/strato-icons';

import { installedVersion } from '../config/appInfo';
import { POC_FILE_MAX_BYTES, pocFileContent, pocFileName, readPocFile, type CoverageDocs, type PocFileReading } from '../config/pocTransfer';
import { ASSESSMENT_HISTORY_KEY, ASSESSMENT_PLAN_KEY } from '../config/persistence';
import { parsePlan } from '../features/assessment/actionPlan';
import { parseHistory } from '../features/assessment/history';
import { useStudio } from '../config/StudioContext';
import { Cluster, Panel, Stack } from '../engine';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Settings → "Move this PoC" (3.3.6), for the SE: export the PoC on screen to a file, or import one
 * — how a PoC crosses from the app's old id (`my.poc.value.studio.v31`) to the new one, or from one
 * tenant to another. An import shows what the file holds and replaces the configuration only on a
 * second, explicit click; the partner password never travels (`config/pocTransfer.ts`).
 *
 * 3.4.14 (format 2): the file also carries the Coverage page's kept readings and its action plan, read from
 * App State on export and written back on import — so the move to `my.poc.automation` leaves nothing behind.
 */

type Reading = Extract<PocFileReading, { ok: true }>;

/** A picked file's text (FileReader: every browser has it, and so does the test DOM). */
function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}
const FAILURE: Record<Extract<PocFileReading, { ok: false }>['reason'], StringKey> = {
  tooLarge: 'transfer.failed.tooLarge',
  notJson: 'transfer.failed.notPocFile',
  notPocFile: 'transfer.failed.notPocFile',
  newerFormat: 'transfer.failed.newerFormat',
  empty: 'transfer.failed.empty',
};

export const PocTransferPanel = ({ imported, onImported }: { imported: string | null; onImported: (customer: string) => void }) => {
  const { t, formatDateTime } = useTranslation();
  const studio = useStudio();
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [failure, setFailure] = useState<StringKey | null>(null);

  /** The Coverage documents kept on this install (format 2); a key not read is simply not carried. */
  const coverageDocs = async (): Promise<CoverageDocs> => {
    const store = studio.stateStore;
    if (store === null) return { history: null, plan: null };
    const [history, plan] = await Promise.all([store.read('app', ASSESSMENT_HISTORY_KEY), store.read('app', ASSESSMENT_PLAN_KEY)]);
    return {
      history: history.kind === 'found' ? parseHistory(history.value) : null,
      plan: plan.kind === 'found' ? parsePlan(plan.value) : null,
    };
  };

  const exportPoc = async () => {
    const coverage = await coverageDocs().catch((): CoverageDocs => ({ history: null, plan: null }));
    const content = pocFileContent({
      coverage,
      shared: { parameters: studio.parameters, pillars: studio.selectedPillars, poc: studio.pocPlan },
      priv: {
        costModel: studio.costModel,
        baseline: studio.baseline,
        rateCard: studio.rateCard,
        locale: studio.locale,
        timeframe: studio.timeframe,
        captureChoice: studio.captureChoice,
      },
      appVersion: installedVersion(),
      exportedAt: new Date().toISOString(),
    });
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = pocFileName(studio.parameters.customerName, new Date());
    anchor.click();
    // Revoked a moment later: an immediate revoke can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const pick = async (file: File | undefined) => {
    setFailure(null);
    setReading(null);
    if (file === undefined) return;
    // Refused before it is read when it cannot be a PoC file (2 MB), so a huge pick is never loaded.
    if (file.size > POC_FILE_MAX_BYTES) {
      setFailure(FAILURE.tooLarge);
      return;
    }
    const result = readPocFile(await readText(file).catch(() => ''));
    if (result.ok) setReading(result);
    else setFailure(FAILURE[result.reason]);
  };

  const dashboards = (value: Reading) => (value.shared.poc.dashboard === null ? 0 : 1) + Object.values(value.shared.poc.specialtyDashboards ?? {}).filter((ref) => ref !== undefined).length;

  return (
    <Panel pad="roomy" data-testid="poc-transfer">
      <Stack gap="group">
        <Stack gap="tight">
          <Text textStyle="base-emphasized">{t('transfer.title')}</Text>
          <Paragraph className="pvs-prose">{t('transfer.body')}</Paragraph>
        </Stack>
        <Cluster>
          <Button onClick={() => void exportPoc()} data-testid="transfer-export">
            <Button.Prefix>
              <DownloadIcon />
            </Button.Prefix>
            {t('transfer.export')}
          </Button>
          <Button onClick={() => input.current?.click()}>
            <Button.Prefix>
              <UploadIcon />
            </Button.Prefix>
            {t('transfer.import')}
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label={t('transfer.import')}
            data-testid="transfer-file"
            onChange={(event) => {
              void pick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </Cluster>

        {failure !== null && (
          <MessageContainer variant="critical">
            <MessageContainer.Title>{t('transfer.failed.title')}</MessageContainer.Title>
            <MessageContainer.Description>{t(failure)}</MessageContainer.Description>
          </MessageContainer>
        )}

        {reading !== null && (
          <MessageContainer variant="warning">
            <MessageContainer.Title>{t('transfer.confirm.title', { customer: reading.shared.parameters.customerName || '—' })}</MessageContainer.Title>
            <MessageContainer.Description>
              <Stack gap="tight">
                <Text>
                  {t('transfer.confirm.holds', {
                    engagement: reading.shared.parameters.engagementName || '—',
                    criteria: String(reading.shared.poc.criteria.length),
                    dashboards: String(dashboards(reading)),
                  })}
                </Text>
                {(reading.coverage.history !== null || reading.coverage.plan !== null) && (
                  <Text data-testid="transfer-coverage">
                    {t('transfer.confirm.coverage', {
                      readings: String(reading.coverage.history?.snapshots.length ?? 0),
                      actions: String(Object.keys(reading.coverage.plan?.items ?? {}).length),
                    })}
                  </Text>
                )}
                <Text className="pvs-caption">
                  {t('transfer.confirm.from', {
                    version: reading.appVersion || '—',
                    at: reading.exportedAt === '' ? '—' : formatDateTime(reading.exportedAt),
                  })}
                </Text>
                <Text>{t('transfer.confirm.replaces')}</Text>
                <Cluster>
                  <Button
                    variant="accent"
                    color="primary"
                    data-testid="transfer-confirm"
                    onClick={() => {
                      studio.importPoc({ shared: reading.shared, priv: reading.priv });
                      // Format 2: the Coverage readings and action plan go back to App State as they were kept.
                      const store = studio.stateStore;
                      if (store !== null) {
                        if (reading.coverage.history !== null) void store.write('app', ASSESSMENT_HISTORY_KEY, JSON.stringify(reading.coverage.history));
                        if (reading.coverage.plan !== null) void store.write('app', ASSESSMENT_PLAN_KEY, JSON.stringify(reading.coverage.plan));
                      }
                      setReading(null);
                      onImported(reading.shared.parameters.customerName);
                    }}
                  >
                    {t('transfer.confirm.go')}
                  </Button>
                  <Button onClick={() => setReading(null)}>{t('transfer.confirm.cancel')}</Button>
                </Cluster>
              </Stack>
            </MessageContainer.Description>
          </MessageContainer>
        )}

        {imported !== null && reading === null && failure === null && (
          <MessageContainer variant="success">
            <MessageContainer.Title>{t('transfer.done.title', { customer: imported || '—' })}</MessageContainer.Title>
            <MessageContainer.Description>{t('transfer.done.body')}</MessageContainer.Description>
          </MessageContainer>
        )}
      </Stack>
    </Panel>
  );
};
