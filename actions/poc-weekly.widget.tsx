import React from 'react';

import { ActionWidget } from '@dynatrace-sdk/automation-action-utils';
import { AutomationSelect, AutomationTextInput } from '@dynatrace/automation-action-components';
import { FormField, Label, SelectOption } from '@dynatrace/strato-components/forms';

/**
 * 3.7.4 — the form of the "PoC Automation · Weekly" action in the Workflows editor: the customer's name (shown in the
 * summary) and the language of the summary.
 */

interface PocWeeklyInput {
  customer: string;
  language: string;
  /** 3.7.6: the PoC's overview dashboard, linked in the e-mail (optional). */
  dashboardId?: string;
  /** 3.7.7: "on" (default) writes the week's report notebook and links it; "off" leaves it out. */
  notebook?: string;
}

const PocWeeklyWidget: ActionWidget<PocWeeklyInput> = (props) => {
  const { value, onValueChanged } = props;
  const update = (next: Partial<PocWeeklyInput>) => onValueChanged({ ...value, ...next });

  return (
    <>
      <FormField>
        <Label>Customer name</Label>
        <AutomationTextInput value={value.customer ?? ''} onChange={(customer) => update({ customer })} />
      </FormField>
      <FormField>
        <Label>Overview dashboard id (optional, linked in the e-mail)</Label>
        <AutomationTextInput value={value.dashboardId ?? ''} onChange={(dashboardId) => update({ dashboardId })} />
      </FormField>
      <FormField>
        <Label>Write the week’s report notebook (shared with the environment’s users)</Label>
        <AutomationSelect value={value.notebook ?? 'on'} onChange={(notebook) => update({ notebook: notebook === 'off' ? 'off' : 'on' })}>
          <SelectOption value="on">Yes</SelectOption>
          <SelectOption value="off">No</SelectOption>
        </AutomationSelect>
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

export default PocWeeklyWidget;
