import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { EVIDENCE, Panel } from '../engine';

/**
 * Dynatrace Assist callout.
 *
 * One reusable panel for the "here is what to do about it" voice. Callers build
 * the sentence list from measured signals only — the panel renders nothing when
 * that list is empty, so an untelemetered page never shows an empty Assist box.
 *
 * What it says is, by definition, a **recommendation**, so it wears that evidence
 * class: the recommendation icon, a solid edge and a primary-coloured rail. It is
 * a quiet card with one accent edge rather than a tinted block, so a page can hold
 * several without turning into a wall of colour.
 */
interface AssistPanelProps {
  eyebrow: string;
  title: string;
  sentences: readonly string[];
  note: string;
}

export const AssistPanel = ({ eyebrow, title, sentences, note }: AssistPanelProps) => {
  if (sentences.length === 0) return null;
  const Icon = EVIDENCE.recommendation.Icon;

  return (
    <Panel as="aside" rail railTone="primary" pad="roomy" aria-label={title}>
      <div className="pvs-stack" style={{ '--pvs-gap': 'var(--pvs-gap-tight)' } as React.CSSProperties}>
        <div className="pvs-cluster">
          <Icon aria-hidden="true" />
          <p className="pvs-eyebrow">{eyebrow}</p>
        </div>
        <Heading level={4} as="h2">
          {title}
        </Heading>
        <ul className="pvs-list pvs-prose">
          {sentences.map((sentence) => (
            <li key={sentence}>
              <Text>{sentence}</Text>
            </li>
          ))}
        </ul>
        <Text className="pvs-caption">{note}</Text>
      </div>
    </Panel>
  );
};
