import React, { useEffect, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { CodeSnippet, MessageContainer } from '@dynatrace/strato-components/content';
import { TextInput } from '@dynatrace/strato-components/forms';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { useStudio } from '../../config/StudioContext';
import { Cluster, Panel, Stack } from '../../engine';
import { useTranslation } from '../../i18n/useTranslation';
import type { PocPlan } from '../../models/pocPlan';
import {
  ACCOUNT_UUID,
  DETECTOR_ACTOR_POLICY,
  SERVICE_USER_ID,
  checkActor,
  listDetectorActors,
  listServiceUsers,
  serviceUsersLink,
  type DetectorActor,
} from './pocSettings';

/**
 * 3.8.1 (the owner: "incluir a criação do usuário de serviço nos passos de configurações … e no PoC Builder apenas validar"):
 * Settings → PoC plan holds the service user that runs the PoC's anomaly detectors — a person's own account is refused as a
 * detector's actor. The SE gives the account's UUID (for the link to its service users in Account Management), then picks one
 * of the service users already running detectors here (offered once the platform accepts them) or pastes the id of one made
 * for the PoC; "Check and use" asks the platform (nothing written) and saves it with the PoC. Creating the service user stays
 * in Account Management: its API takes an account-level OAuth client (`account-idm-write`), which the app does not hold.
 */

/**
 * 3.8.2: the platform's refusal in the SE's words. "User has no permission to use service users" is about the app, not the
 * service user: until 3.8.1 the app's token lacked `iam:service-users:use` (declared since 3.8.2); with it declared, the
 * message means the SE's own user lacks that permission.
 */
export function refusalWords(reason: string, t: (key: 'builder.ad.actor.notId' | 'su.refused.noUse') => string): string {
  if (reason === 'not-an-id') return t('builder.ad.actor.notId');
  if (/no permission to use service users/i.test(reason)) return t('su.refused.noUse');
  return reason;
}

/** 3.8.3: the saved service user as people read it — its name and its id, or the id alone when no name is known. */
export function actorLabel(id: string, name: string | undefined): string {
  return name !== undefined && name.trim() !== '' ? `${name.trim()} (${id})` : id;
}

/** 3.8.4 (the owner: "vamos deixar apenas um top 5"): how many of the service users the person may use are offered — those already running detectors first. */
export const USERS_SHOWN = 5;

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
  // 3.8.3: the offers — the service users this person may use, by name (the IAM service), the ones already running detectors
  // first; when the IAM service does not answer, the actors of the tenant's detectors the platform accepts (as in 3.8.1).
  const [actors, setActors] = useState<(DetectorActor & { name: string })[] | null>(null);
  // Every service user this person may use, by id — to name an id pasted below, beyond the five offered.
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [check, setCheck] = useState<{ state: 'checking' | 'ok' | 'refused'; reason?: string } | null>(null);

  const save = (patch: Partial<PocPlan>) => {
    setPocPlan({ ...pocPlan, ...patch });
    onSaved?.(patch);
  };

  useEffect(() => {
    if (!canSet) return;
    let live = true;
    void (async () => {
      const [users, running] = await Promise.all([listServiceUsers(), listDetectorActors().catch(() => [] as DetectorActor[])]);
      const runs = new Map(running.map((actor) => [actor.id, actor]));
      if (users !== null && users.length > 0) {
        const offers = users
          .map((user) => ({ id: user.id, name: user.name, detectors: runs.get(user.id)?.detectors ?? 0, example: runs.get(user.id)?.example ?? '' }))
          .sort((a, b) => b.detectors - a.detectors || a.name.localeCompare(b.name))
          .slice(0, USERS_SHOWN);
        if (live) {
          setActors(offers);
          setNames(new Map(users.map((user) => [user.id, user.name])));
        }
        return;
      }
      // Only the service users the platform accepts for this person are offered.
      const accepted: (DetectorActor & { name: string })[] = [];
      for (const actor of running.slice(0, ACTORS_CHECKED)) if ((await checkActor(actor.id)) === null) accepted.push({ ...actor, name: '' });
      if (live) setActors(accepted);
    })().catch(() => live && setActors([]));
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
      // 3.8.4 (the owner: an id pasted after a suggestion was chosen "não gravou"): the id checked is the one saved, whatever
      // was chosen before, and the panel says so in words with its name and id.
      const name = names.get(actor) ?? actors?.find((offer) => offer.id === actor)?.name ?? '';
      save({ detectorActor: actor, detectorActorName: name === '' ? undefined : name });
      setCheck({ state: 'ok', reason: actorLabel(actor, name) });
      setTyped('');
    } else setCheck({ state: 'refused', reason: `${refusalWords(refusal, t)} (${actor})` });
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
          <Text data-testid="su-saved">✓ {t('builder.ad.actor.saved', { id: actorLabel(saved, pocPlan.detectorActorName) })}</Text>
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
              {/* 3.8.3: the least the service user needs to run the detectors (a new user with only "Pro User" failed at run time). */}
              <Text className="pvs-label">{t('su.policy.title')}</Text>
              <Text className="pvs-caption">{t('su.policy.why')}</Text>
              <div data-testid="su-policy">
                <CodeSnippet showLineNumbers={false} size="condensed">
                  <CodeSnippet.ActionsMenu>
                    <CodeSnippet.Copy />
                  </CodeSnippet.ActionsMenu>
                  {DETECTOR_ACTOR_POLICY}
                </CodeSnippet>
              </div>
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
                      {actor.name !== ''
                        ? actor.detectors > 0
                          ? t('su.offer.namedRuns', { name: actor.name, id: actor.id.slice(0, 8), n: formatNumber(actor.detectors) })
                          : t('su.offer.named', { name: actor.name, id: actor.id.slice(0, 8) })
                        : t('builder.ad.actor.offer', { id: actor.id.slice(0, 8), n: formatNumber(actor.detectors), example: actor.example.slice(0, 40) })}
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
                <div data-testid="builder-ad-actor-result" data-state={check.state}>
                  {check.state === 'checking' ? (
                    <Text className="pvs-caption">{t('builder.ad.actor.checking')}</Text>
                  ) : (
                    <MessageContainer variant={check.state === 'ok' ? 'success' : 'critical'}>
                      <MessageContainer.Description>
                        {check.state === 'ok' ? t('su.result.saved', { who: check.reason ?? '' }) : t('builder.ad.actor.refused', { reason: check.reason ?? '' })}
                      </MessageContainer.Description>
                    </MessageContainer>
                  )}
                </div>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Panel>
  );
};
