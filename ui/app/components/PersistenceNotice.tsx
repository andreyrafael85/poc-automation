import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CheckmarkIcon, RefreshIcon } from '@dynatrace/strato-icons';

import { useStudio } from '../config/StudioContext';
import { Callout, Cluster, Panel, Stack } from '../engine';
import { clearPrintDocuments } from '../features/wrapup/prints/store/printStore';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Says where the configuration is: kept on the tenant, being saved, or not kept — and why.
 *
 * Silence is what lost people their settings in 3.1: nothing said they were session-only. So
 * this always states what is true, and when the tenant refuses it quotes the exact permission
 * that is missing instead of an apology.
 */
export const PersistenceNotice = () => {
  const { persistence } = useStudio();
  const { t, formatTime } = useTranslation();
  const { status, savedAt, savedBy, detail, missingScopes } = persistence;

  if (status === 'off') return null;

  if (status === 'forbidden') {
    return (
      <Callout kind="limitation" title={t('persist.forbidden.title')}>
        <Stack gap="tight">
          <Paragraph>{t('persist.forbidden.body', { scopes: missingScopes.join(', ') })}</Paragraph>
          <Cluster>
            <Button onClick={persistence.retry}>
              <Button.Prefix>
                <RefreshIcon aria-hidden="true" />
              </Button.Prefix>
              {t('persist.btn.retry')}
            </Button>
          </Cluster>
        </Stack>
      </Callout>
    );
  }

  if (status === 'error') {
    return (
      <Callout kind="limitation" title={t('persist.error.title')}>
        <Stack gap="tight">
          <Paragraph>
            {t('persist.error.body', { detail: detail === 'too-large' ? t('persist.tooLarge') : (detail ?? '—') })}
          </Paragraph>
          <Cluster>
            <Button onClick={persistence.retry}>
              <Button.Prefix>
                <RefreshIcon aria-hidden="true" />
              </Button.Prefix>
              {t('persist.btn.retry')}
            </Button>
          </Cluster>
        </Stack>
      </Callout>
    );
  }

  if (status === 'conflict') {
    return (
      <Callout kind="pending" title={t('persist.conflict.title')}>
        <Stack gap="tight">
          <Paragraph>
            {t('persist.conflict.body', {
              who: savedBy === null ? '' : t('persist.conflict.by', { who: savedBy }),
              time: savedAt === null ? '—' : formatTime(savedAt),
            })}
          </Paragraph>
          <Cluster>
            <Button onClick={persistence.reload}>{t('persist.btn.reload')}</Button>
            <Button variant="emphasized" onClick={persistence.overwrite}>
              {t('persist.btn.overwrite')}
            </Button>
          </Cluster>
        </Stack>
      </Callout>
    );
  }

  const line =
    status === 'loading'
      ? t('persist.loading')
      : status === 'saving'
        ? t('persist.saving')
        : savedAt === null
          ? t('persist.nothingYet')
          : savedBy === null
            ? t('persist.saved', { time: formatTime(savedAt) })
            : t('persist.savedBy', { time: formatTime(savedAt), who: savedBy });

  return (
    <Cluster gap="tight" role="status" aria-live="polite">
      {status === 'saved' && savedAt !== null && <CheckmarkIcon aria-hidden="true" />}
      <Text className="pvs-muted">{line}</Text>
    </Cluster>
  );
};

/**
 * "New PoC": deletes the saved configuration after a second, explicit confirmation. A single
 * click never deletes anything.
 *
 * 3.2.7: it also clears the SE's real prints (the two private documents of the "Teste Deck Wrapup
 * Print" tab), so a new customer's deck never starts with the last customer's screens. Both run
 * side by side and neither waits on the other; the prints are overwritten with a tombstone, never
 * deleted (`clearPrintDocuments`).
 */
export const NewPocPanel = () => {
  const { persistence } = useStudio();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  if (persistence.status === 'off') return null;

  return (
    <Panel pad="roomy">
      <Stack gap="tight">
        <Text textStyle="base-emphasized">{t('persist.newPoc.title')}</Text>
        <Paragraph className="pvs-prose">{t('persist.newPoc.body')}</Paragraph>
        <Paragraph className="pvs-prose">{t('prt.newPoc.note')}</Paragraph>
        {confirming ? (
          <Stack gap="tight">
            <Text role="alert">{t('persist.newPoc.confirm')}</Text>
            <Cluster>
              <Button
                variant="emphasized"
                color="critical"
                onClick={() => {
                  setConfirming(false);
                  void Promise.allSettled([persistence.reset(), clearPrintDocuments()]);
                }}
              >
                {t('persist.newPoc.yes')}
              </Button>
              <Button onClick={() => setConfirming(false)}>{t('persist.newPoc.no')}</Button>
            </Cluster>
          </Stack>
        ) : (
          <Cluster>
            <Button onClick={() => setConfirming(true)}>{t('persist.newPoc.btn')}</Button>
          </Cluster>
        )}
      </Stack>
    </Panel>
  );
};
