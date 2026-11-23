import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CheckmarkIcon } from '@dynatrace/strato-icons';

import { Panel, Stack } from '../../engine';
import { StratoTicks } from '../../engine/strato/StratoTicks';
import { useTranslation } from '../../i18n/useTranslation';
import { STEP_LABEL, STEP_WHY, type Readiness } from './readiness';
import './setup.css';

/**
 * 3.7.7 — the first-run wizard (the owner: "um wizard na tela indicando que o SE/Parceiro precisa seguir as etapas das
 * configurações e atingir ao menos 5/7 … para seguir com o App full"). While the PoC has fewer than five of its seven
 * readiness steps, the SE and the partner see this instead of the story's pages: how far the PoC is, what each step brings
 * to the story and a button that opens the place where it is done. Settings and the PoC Builder stay open; the app opens in
 * full on its own once the fifth step is saved. A customer and executive mode never see it.
 */
export const SetupWizard = ({ readiness }: { readiness: Readiness }) => {
  const { t, formatNumber } = useTranslation();
  const navigate = useNavigate();
  const missing = Math.max(0, readiness.required - readiness.done);
  const next = readiness.steps.find((step) => !step.done);

  return (
    <Stack gap="section" data-testid="setup-wizard">
      <Panel pad="roomy" className="pvs-setup">
        <Stack gap="group">
          <Text className="pvs-label">{t('setup.eyebrow')}</Text>
          <Heading level={1}>{t('setup.title')}</Heading>
          <Paragraph className="pvs-prose">{t('setup.lead')}</Paragraph>
          <div className="pvs-setup__progress" data-testid="setup-progress">
            <StratoTicks
              value={readiness.done}
              max={readiness.total}
              ticks={readiness.total}
              name={t('setup.progressName')}
              reading={t('setup.progress', { done: formatNumber(readiness.done), total: formatNumber(readiness.total) })}
            />
            <Text>
              <strong>{t('setup.progress', { done: formatNumber(readiness.done), total: formatNumber(readiness.total) })}</strong>{' '}
              {t('setup.missing', { missing: formatNumber(missing), required: formatNumber(readiness.required) })}
            </Text>
          </div>
          {next !== undefined && (
            <div>
              <Button variant="accent" color="primary" onClick={() => void navigate(next.path)} data-testid="setup-next">
                {t('setup.next', { step: t(STEP_LABEL[next.key]) })}
              </Button>
            </div>
          )}
        </Stack>
      </Panel>
      <ol className="pvs-setup__steps">
        {readiness.steps.map((step, index) => (
          <li key={step.key} className="pvs-setup__step" data-done={step.done ? 'true' : 'false'} data-testid={`setup-step-${step.key}`}>
            <span className="pvs-setup__mark" aria-hidden="true">
              {step.done ? <CheckmarkIcon /> : formatNumber(index + 1)}
            </span>
            <span className="pvs-setup__body">
              <Text className="pvs-setup__name">{t(STEP_LABEL[step.key])}</Text>
              <Text className="pvs-caption">{t(STEP_WHY[step.key])}</Text>
            </span>
            <span className="pvs-setup__action">
              {step.done ? (
                <Text className="pvs-caption">{t('setup.done')}</Text>
              ) : (
                <Button onClick={() => void navigate(step.path)} data-testid={`setup-go-${step.key}`}>
                  {t('setup.go')}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <Text className="pvs-caption">{t('setup.note')}</Text>
    </Stack>
  );
};

/** While the PoC is being prepared, Settings and the PoC Builder carry a slim line with the progress and the rule. */
export const SetupBanner = ({ readiness }: { readiness: Readiness }) => {
  const { t, formatNumber } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="pvs-setup-banner" role="status" data-testid="setup-banner">
      <StratoTicks value={readiness.done} max={readiness.total} ticks={readiness.total} name={t('setup.progressName')} reading={t('setup.progress', { done: formatNumber(readiness.done), total: formatNumber(readiness.total) })} />
      <Text>
        {t('setup.banner', { done: formatNumber(readiness.done), total: formatNumber(readiness.total), required: formatNumber(readiness.required) })}
      </Text>
      {/* 3.7.8: with the menu hidden while the PoC is prepared, the way back to the guide. */}
      <Button variant="emphasized" onClick={() => void navigate('/')} data-testid="setup-back">
        {t('setup.back')}
      </Button>
    </div>
  );
};
