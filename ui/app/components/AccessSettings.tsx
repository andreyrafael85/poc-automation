import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { PasswordInput, Select } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useAccess } from '../config/AccessContext';
import { EXPIRY_CHOICES_HOURS, suggestPassword } from '../config/access';
import { Callout, Cluster, Panel, Stack } from '../engine';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The Sales Engineer's side of partner access: the PoC password, how long a partner stays in,
 * and who is in now (with a button to put them out). Only a Dynatrace e-mail sees this tab.
 */
export const AccessSettings = () => {
  const { t, formatDateTime } = useTranslation();
  const access = useAccess();
  const [password, setPassword] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<'done' | 'too-short' | 'unavailable' | null>(null);

  const days = (hours: number) => (hours >= 24 && hours % 24 === 0 ? t('access.expiry.days', { n: hours / 24 }) : t('access.expiry.hours', { n: hours }));

  const apply = async () => {
    const outcome = await access.setPassword(password);
    setResult(outcome === 'ok' ? 'done' : outcome);
    if (outcome === 'ok') {
      setPassword('');
      setSuggestion(null);
    }
  };

  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('access.heading')}
        </Heading>
        <Paragraph className="pvs-prose">{t('access.intro')}</Paragraph>

        <Callout kind={access.passwordIsCustom ? 'note' : 'limitation'} title={t('access.tab')}>
          {access.passwordIsCustom
            ? t('access.pw.custom', {
                who: access.passwordSetBy ?? '—',
                when: access.passwordSetAt === null ? '—' : formatDateTime(access.passwordSetAt),
              })
            : t('access.pw.builtin')}
        </Callout>

        <Stack gap="tight">
          <Text id="access-pw-label">{t('access.pw.label')}</Text>
          <Cluster>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" aria-labelledby="access-pw-label" />
            <Button
              onClick={() => {
                const next = suggestPassword();
                setSuggestion(next);
                setPassword(next);
                setCopied(false);
                setResult(null);
              }}
            >
              {t('access.pw.suggest')}
            </Button>
            <Button variant="emphasized" disabled={password.trim() === ''} onClick={() => void apply()}>
              {t('access.pw.set')}
            </Button>
          </Cluster>
          {suggestion !== null && (
            <Cluster gap="tight">
              <Text>
                <code>{t('access.pw.suggested', { pw: suggestion })}</code>
              </Text>
              <Button
                onClick={() => {
                  void navigator.clipboard?.writeText(suggestion).then(() => setCopied(true));
                }}
              >
                {copied ? t('access.pw.copied') : t('access.pw.copy')}
              </Button>
            </Cluster>
          )}
          <Text className="pvs-caption">{t('access.pw.warn')}</Text>
          {result === 'done' && <Text role="status">{t('access.pw.done')}</Text>}
          {result === 'too-short' && <Text role="alert">{t('access.pw.tooShort')}</Text>}
          {result === 'unavailable' && <Text role="alert">{t('access.pw.unavailable')}</Text>}
        </Stack>

        <Stack gap="tight">
          <Text id="access-expiry-label">{t('access.expiry.label')}</Text>
          <Select
            value={access.expiryHours}
            onChange={(value) => {
              if (typeof value === 'number') void access.setExpiryHours(value);
            }}
            aria-labelledby="access-expiry-label"
          >
            <Select.Content>
              {EXPIRY_CHOICES_HOURS.map((hours) => (
                <Select.Option key={hours} value={hours}>
                  {days(hours)}
                </Select.Option>
              ))}
            </Select.Content>
          </Select>
        </Stack>

        <Stack gap="tight">
          <Cluster>
            <Heading level={5} as="h3">
              {t('access.roster.title')}
            </Heading>
            {access.roster.length > 0 && (
              <Button onClick={() => void access.revokeAll()}>{t('access.roster.revokeAll')}</Button>
            )}
          </Cluster>
          {!access.rosterAvailable && <Text className="pvs-caption">{t('access.roster.unavailable')}</Text>}
          {access.roster.length === 0 ? (
            <Text className="pvs-muted">{t('access.roster.empty')}</Text>
          ) : (
            <Stack as="ul" gap="tight" className="pvs-b-plain">
              {access.roster.map((entry) => (
                <li key={entry.email}>
                  <Cluster>
                    <Stack gap="tight">
                      <Text textStyle="base-emphasized">{entry.name !== '' ? `${entry.name} · ${entry.email}` : entry.email}</Text>
                      <Text className="pvs-caption">
                        {t('access.roster.entry', {
                          since: formatDateTime(entry.unlockedAt),
                          until: formatDateTime(entry.expiresAt),
                        })}
                      </Text>
                    </Stack>
                    <Button onClick={() => void access.revoke(entry.email)}>{t('access.roster.revoke')}</Button>
                  </Cluster>
                </li>
              ))}
            </Stack>
          )}
        </Stack>

        <Text className="pvs-caption">{t('access.limits')}</Text>
      </Stack>
    </Panel>
  );
};
