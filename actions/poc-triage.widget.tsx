import React from 'react';

import { ActionWidget } from '@dynatrace-sdk/automation-action-utils';
import { AutomationSelect, AutomationTextInput } from '@dynatrace/automation-action-components';
import { FormField, Label, SelectOption } from '@dynatrace/strato-components/forms';

/**
 * 3.7.0 — the form of the "PoC Automation · Triage" action in the Workflows editor: the problem's event id (an expression,
 * by default the trigger's) and the language of the summary.
 */

interface PocTriageInput {
  problemId: string;
  language: string;
}

export const DEFAULT_PROBLEM_ID = '{{ event()["event.id"] }}';

const PocTriageWidget: ActionWidget<PocTriageInput> = (props) => {
  const { value, onValueChanged } = props;
  const update = (next: Partial<PocTriageInput>) => onValueChanged({ ...value, ...next });

  return (
    <>
      <FormField>
        <Label>Problem event id</Label>
        <AutomationTextInput value={value.problemId ?? DEFAULT_PROBLEM_ID} onChange={(problemId) => update({ problemId })} />
      </FormField>
      <FormField>
        <Label>Language of the summary</Label>
        <AutomationSelect value={value.language ?? 'en'} onChange={(language) => update({ language: typeof language === 'string' ? language : 'en' })}>
          <SelectOption value="en">English</SelectOption>
          <SelectOption value="pt-BR">Português (Brasil)</SelectOption>
        </AutomationSelect>
      </FormField>
    </>
  );
};

export default PocTriageWidget;
