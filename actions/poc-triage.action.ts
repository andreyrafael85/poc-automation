import { getEnvironmentUrl } from '@dynatrace-sdk/app-environment';
import { userLogger } from '@dynatrace-sdk/automation-action-utils/actions';
import { queryExecutionClient, type QueryResult } from '@dynatrace-sdk/client-query';

import { getQuery, type CatalogId } from '../ui/app/queries/catalog';
import { runTriage, type QueryWindow, type TriageInput } from '../ui/app/features/triage/triage';
import type { GrailRecord } from '../ui/app/utils/records';

/**
 * 3.7.0 — "PoC Automation · Triage", the app's workflow action. A workflow's problem trigger hands it the problem's event id;
 * it reads the problem, its logs around the incident and the callers of its root cause through the app's own catalog
 * (`features/triage/triage.ts`), with the workflow actor's own permissions, and returns a subject and a summary the next
 * task (an e-mail) sends. It writes nothing anywhere.
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

export default async (payload: TriageInput) => {
  const result = await runTriage(payload, { query: readCatalog, environmentUrl: getEnvironmentUrl(), appId: APP_ID }, (line) => userLogger.info(line));
  userLogger.info(result.found ? `Triage of ${result.problem?.displayId ?? '—'}: ${result.subject}` : result.summary);
  return result;
};
