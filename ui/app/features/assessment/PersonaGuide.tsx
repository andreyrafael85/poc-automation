import React, { useState } from 'react';

import { Checkbox, ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { ExternalLink, Heading, Text } from '@dynatrace/strato-components/typography';

import { Panel, Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import type { CoverageIndex } from './coverageIndex';
import { docFor } from './docLinks';
import type { AssessmentFinding, AssessmentSignals } from './findings';
import { findingsForPersona, openingFigures, PERSONA_KEY, PERSONA_SHOW, PERSONAS, personasOf, type Persona } from './personas';
import './assessment.css';

type Choice = Persona | 'all';

/**
 * The conversation guide by audience (3.4.9, F-08). "All" keeps the 3.4.1 guide — one question per finding, with
 * the audiences it concerns; an audience shows what it cares about, the measured figures that open the talk,
 * three opening questions, its findings with the question to ask, and what to show on the platform with a link to
 * the documentation. SE and partner material: on screen only, unless the SE ticks "print this guide".
 */
export const PersonaGuide = ({
  findings,
  signals,
  index,
  valueEvents,
  t,
  formatNumber,
}: {
  findings: readonly AssessmentFinding[];
  signals: AssessmentSignals;
  index: CoverageIndex;
  valueEvents: number | null;
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
}) => {
  const [choice, setChoice] = useState<Choice>('all');
  const [print, setPrint] = useState(false);
  const asked = findings.filter((finding) => finding.kind === 'finding' || finding.cls !== 'strength');
  const rows = choice === 'all' ? asked : findingsForPersona(choice, asked);
  const figures = choice === 'all' ? [] : openingFigures(choice, { signals, index, valueEvents, findings }, formatNumber);
  return (
    <div data-print-hide={print ? undefined : true}>
      <Panel as="section" pad="roomy" data-testid="asm-guide" data-print-section={print ? true : undefined}>
        <Stack gap="group">
          <Heading level={3} as="h2">
            {choice === 'all' ? t('asm.persona.title') : t('asm.persona.titleFor', { audience: t(PERSONA_KEY[choice]) })}
          </Heading>
          <Text className="pvs-caption">{t('asm.persona.caption')}</Text>
          <div className="pvs-persona__controls" data-print-hide>
            <Text id="asm-persona-label" className="pvs-label">
              {t('asm.persona.audience')}
            </Text>
            <ToggleButtonGroup value={choice} onChange={(value) => setChoice((value === '' ? 'all' : value) as Choice)} aria-labelledby="asm-persona-label">
              <ToggleButtonGroup.Item value="all">{t('asm.persona.all')}</ToggleButtonGroup.Item>
              {PERSONAS.map((persona) => (
                <ToggleButtonGroup.Item key={persona} value={persona}>
                  {t(PERSONA_KEY[persona])}
                </ToggleButtonGroup.Item>
              ))}
            </ToggleButtonGroup>
            <Checkbox value={print} onChange={() => setPrint((current) => !current)}>
              {t('asm.persona.print')}
            </Checkbox>
          </div>

          {choice !== 'all' && (
            <div className="pvs-persona" data-persona={choice} data-testid={`asm-persona-${choice}`}>
              <p className="pvs-persona__focus">{t(`asm.persona.${choice}.focus` as StringKey)}</p>
              {figures.length > 0 && (
                <div>
                  <Text className="pvs-label">{t('asm.persona.figures')}</Text>
                  <ul className="pvs-persona__figures">
                    {figures.map((figure) => (
                      <li key={figure.key}>{t(figure.key, figure.params)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <Text className="pvs-label">{t('asm.persona.opening')}</Text>
                <ol className="pvs-persona__questions">
                  {([1, 2, 3] as const).map((n) => (
                    <li key={n}>{t(`asm.persona.${choice}.q${n}` as StringKey)}</li>
                  ))}
                </ol>
              </div>
              <div>
                <Text className="pvs-label">{t('asm.persona.show')}</Text>
                <ul className="pvs-persona__show">
                  {PERSONA_SHOW[choice].map((capability) => {
                    const docs = docFor(capability);
                    return (
                      <li key={capability} className="pvs-doc">
                        <span>{t(capability)}</span>
                        {docs !== null && (
                          <ExternalLink href={docs} aria-label={t('asm.plan.docsFor', { capability: t(capability) })}>
                            {t('asm.plan.docsShort')}
                          </ExternalLink>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <Text>{t('asm.persona.none')}</Text>
          ) : (
            <div className="pvs-asm-table-wrap">
              <table className="pvs-asm-table" data-testid="asm-guide-table">
                <thead>
                  <tr>
                    <th scope="col">{t('p.asm.guide.finding')}</th>
                    <th scope="col">{t('p.asm.guide.question')}</th>
                    <th scope="col">{t('p.asm.guide.show')}</th>
                    {choice === 'all' && <th scope="col">{t('asm.persona.audience')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((finding) => (
                    <tr key={finding.rule}>
                      <td>{`${finding.rule} · ${finding.title}`}</td>
                      <td>{t(`asm.q.${finding.rule}` as StringKey)}</td>
                      <td>{finding.capability}</td>
                      {choice === 'all' && (
                        <td>
                          {personasOf(finding.rule)
                            .map((persona) => t(PERSONA_KEY[persona]))
                            .join(', ')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Stack>
      </Panel>
    </div>
  );
};
