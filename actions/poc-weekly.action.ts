import { getEnvironmentUrl } from '@dynatrace-sdk/app-environment';
import { userLogger } from '@dynatrace-sdk/automation-action-utils/actions';
import { documentsClient } from '@dynatrace-sdk/client-document';
import { queryExecutionClient, type QueryResult } from '@dynatrace-sdk/client-query';

import { getQuery, type CatalogId } from '../ui/app/queries/catalog';
import type { QueryWindow } from '../ui/app/features/triage/triage';
import { runWeekly, type WeeklyInput } from '../ui/app/features/weekly/weekly';
import type { GrailRecord } from '../ui/app/utils/records';

/**
 * 3.7.4 — "PoC Automation · Weekly", the app's second workflow action. A scheduled workflow (Mondays) hands it the
 * customer's name and the language; it reads the last seven days of problems against the seven before, what repeated most
 * and the services that failed most, through the app's own catalog (`features/weekly/weekly.ts`) with the workflow actor's
 * permissions, and returns a subject and a summary the next tasks (Dynatrace Assist, the e-mail) use. Since 3.7.7 it also
 * writes the week's report notebook (a document shared with the tenant's users, `document:documents:write` of the actor)
 * and links it in the e-mail; with the input `notebook: "off"` it writes nothing.
 */

const APP_ID = 'my.poc.automation';
const POLL_MS = 1000;
const MAX_POLLS = 60;

async function readCatalog(id: CatalogId, dql: string, window: QueryWindow): Promise<GrailRecord[]> {
  const guards = getQuery(id).guards ?? {};
  const started = await queryExecutionClient.queryExecute({
    body: {
      query: dql,
      defaultTimeframeStart: window.startIso,
      defaultTimeframeEnd: window.endIso,
      requestTimeoutMilliseconds: 15000,
      ...(guards.scanLimitGbytes === undefined ? {} : { defaultScanLimitGbytes: guards.scanLimitGbytes }),
      ...(guards.maxResultRecords === undefined ? {} : { maxResultRecords: guards.maxResultRecords }),
    },
  });
  let result: QueryResult | undefined = started.result;
  for (let poll = 0; result === undefined && started.requestToken !== undefined && poll < MAX_POLLS; poll += 1) {
    const response = await queryExecutionClient.queryPoll({ requestToken: started.requestToken, requestTimeoutMilliseconds: POLL_MS });
    if (response.state === 'SUCCEEDED') result = response.result;
    else if (response.state !== 'RUNNING' && response.state !== 'NOT_STARTED') throw new Error(`${id}: the query ended ${response.state}`);
  }
  if (result === undefined) throw new Error(`${id}: no result in time`);
  return result.records.flatMap((record): GrailRecord[] => (record === null ? [] : [record]));
}

export default async (payload: WeeklyInput) => {
  const result = await runWeekly(
    payload,
    {
      query: readCatalog,
      environmentUrl: getEnvironmentUrl(),
      appId: APP_ID,
      writeNotebook: async (content, name) => {
        const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
        const metadata = await documentsClient.createDocument({ body: { name, type: 'notebook', content: blob, isPrivate: false } });
        return metadata.id;
      },
    },
    (line) => userLogger.info(line),
  );
  userLogger.info(result.subject);
  return result;
};
