import React, { useEffect, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import { useTranslation } from '../../i18n/useTranslation';
import type { PocPlan } from '../../models/pocPlan';
import { ACCOUNT_UUID, SERVICE_USER_ID, checkActor, listDetectorActors, serviceUsersLink, type DetectorActor } from './pocSettings';

/**
 * 3.8.1 (the owner: "incluir a criação do usuário de serviço nos passos de configurações … e no PoC Builder apenas validar"):
 * Settings → PoC plan holds the service user that runs the PoC's anomaly detectors — a person's own account is refused as a
 * detector's actor. The SE gives the account's UUID (for the link to its service users in Account Management), then picks one
 * of the service users already running detectors here (offered once the platform accepts them) or pastes the id of one made
 * for the PoC; "Check and use" asks the platform (nothing written) and saves it with the PoC. Creating the service user stays
 * in Account Management: its API takes an account-level OAuth client (`account-idm-write`), which the app does not hold.
 */

/** How many of the tenant's detector actors are checked (each check writes nothing). */
const ACTORS_CHECKED = 8;

/** A suggested name for the service user the SE creates for the PoC. */
export const SERVICE_USER_NAME = 'poc-automation-detectors';

export const ServiceUserPicker = ({ onSaved }: { onSaved?: (patch: Partial<PocPlan>) => void }) => {
  const { t, formatNumber } = useTranslation();
  const { pocPlan, setPocPlan } = useStudio();
  const access = useAccess();
  const canSet = access.canManageAccess;
  const saved = pocPlan.detectorActor ?? '';
  const [account, setAccount] = useState(pocPlan.accountUuid ?? '');
  const [typed, setTyped] = useState('');
  const [actors, setActors] = useState<DetectorActor[] | null>(null);
  const [check, setCheck] = useState<{ state: 'checking' | 'ok' | 'refused'; reason?: string } | null>(null);

  const save = (patch: Partial<PocPlan>) => {
    setPocPlan({ ...pocPlan, ...patch });
    onSaved?.(patch);
  };

  useEffect(() => {
    if (!canSet) return;
    let live = true;
    listDetectorActors()
      .then(async (found) => {
        // Only the service users the platform accepts for this person are offered.
        const accepted: DetectorActor[] = [];
        for (const actor of found.slice(0, ACTORS_CHECKED)) if ((await checkActor(actor.id)) === null) accepted.push(actor);
        if (live) setActors(accepted);
      })
      .catch(() => live && setActors([]));
    return () => {
      live = false;
    };
  }, [canSet]);

  const use = async (id: string) => {
    const actor = id.trim().toLowerCase();
    if (!SERVICE_USER_ID.test(actor)) {
      setCheck({ state: 'refused', reason: t('builder.ad.actor.notId') });
      return;
    }
    setCheck({ state: 'checking' });
    const refusal = await checkActor(actor);
    if (refusal === null) {
      setCheck({ state: 'ok' });
      save({ detectorActor: actor });
    } else setCheck({ state: 'refused', reason: refusal === 'not-an-id' ? t('builder.ad.actor.notId') : refusal });
  };

  const accountValid = ACCOUNT_UUID.test(account.trim());
  const accountSaved = (pocPlan.accountUuid ?? '') === account.trim().toLowerCase();

  return (
    <Panel pad="roomy" data-testid="settings-service-user">
      <Stack gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('su.title')}
          </Heading>
          <Paragraph className="pvs-prose">{t('su.what')}</Paragraph>
        </Stack>

        {saved !== '' ? (
          <Text data-testid="su-saved">✓ {t('builder.ad.actor.saved', { id: saved })}</Text>
        ) : (
          <Text className="pvs-muted" data-testid="su-none">
            {t('su.none')}
          </Text>
        )}

        {!canSet ? (
          <Text className="pvs-muted">{t('builder.seOnly')}</Text>
        ) : (
          <>
            <Stack gap="tight">
              <Text className="pvs-label">{t('su.account.title')}</Text>
              <Text className="pvs-caption">{t('su.account.why')}</Text>
              <Cluster>
                <div className="pvs-ad-actor-input">
                  <TextInput
                    value={account}
                    onChange={(value) => setAccount(value.slice(0, 60))}
                    placeholder={t('su.account.placeholder')}
                    aria-label={t('su.account.title')}
                    data-testid="su-account"
                  />
                </div>
                <Button
                  variant="emphasized"
                  onClick={() => save({ accountUuid: account.trim().toLowerCase() })}
                  disabled={!accountValid || accountSaved}
                  data-testid="su-account-save"
                >
                  {t('su.account.save')}
                </Button>
              </Cluster>
              {account.trim() !== '' && !accountValid && <Text className="pvs-caption">{t('su.account.invalid')}</Text>}
              <Link href={serviceUsersLink(pocPlan.accountUuid)} target="_blank" rel="noopener noreferrer" data-testid="su-link">
                {t(pocPlan.accountUuid === undefined ? 'su.link.root' : 'su.link.account')} <ExternalLinkIcon />
              </Link>
            </Stack>

            <Stack gap="tight">
              <Text className="pvs-label">{t('su.steps.title')}</Text>
              <ol className="pvs-prose pvs-list" data-own-numbers>
                <li>{t('su.steps.1', { name: SERVICE_USER_NAME })}</li>
                <li>{t('su.steps.2')}</li>
                <li>{t('su.steps.3')}</li>
              </ol>
              <Text className="pvs-caption">{t('su.steps.why')}</Text>
            </Stack>

            <Stack gap="tight">
              <Text className="pvs-label">{t('su.pick.title')}</Text>
              {actors === null && <Text className="pvs-muted">{t('builder.ad.actor.looking')}</Text>}
              {actors !== null && actors.length === 0 && <Text className="pvs-caption">{t('su.pick.none')}</Text>}
              {actors !== null && actors.length > 0 && (
                <Cluster>
                  {actors.map((actor) => (
                    <Button
                      key={actor.id}
                      variant={saved === actor.id ? 'accent' : 'default'}
                      onClick={() => void use(actor.id)}
                      data-testid={`builder-ad-actor-${actor.id}`}
                    >
                      {t('builder.ad.actor.offer', { id: actor.id.slice(0, 8), n: formatNumber(actor.detectors), example: actor.example.slice(0, 40) })}
                    </Button>
                  ))}
                </Cluster>
              )}
              <Cluster>
                <div className="pvs-ad-actor-input">
                  <TextInput
                    value={typed}
                    onChange={(value) => setTyped(value.slice(0, 60))}
                    placeholder={t('builder.ad.actor.placeholder')}
                    aria-label={t('builder.ad.actor.title')}
                    data-testid="builder-ad-actor-input"
                  />
                </div>
                <Button
                  variant="emphasized"
                  onClick={() => void use(typed)}
                  disabled={typed.trim() === '' || check?.state === 'checking'}
                  data-testid="builder-ad-actor-check"
                >
                  {t('builder.ad.actor.check')}
                </Button>
              </Cluster>
              {check !== null && (
                <Text className="pvs-caption" data-testid="builder-ad-actor-result" data-state={check.state}>
                  {check.state === 'checking'
                    ? t('builder.ad.actor.checking')
                    : check.state === 'ok'
                      ? t('builder.ad.actor.ok')
                      : t('builder.ad.actor.refused', { reason: check.reason ?? '' })}
                </Text>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Panel>
  );
};
