import { assumed } from '../../config/assumptions';
import { num, str, type GrailRecord } from '../../utils/records';
import { GIB } from './sessionMeter';

/**
 * The cost pre-flight (3.4.11, proposal §C8 F-14, ordered by the owner on 2026-11-18: "pré-voo de custo antes de
 * ler um tenant grande, só no app, fora do deck"). Before the SE walks a large tenant, the app projects what one
 * full visit will read, from the tenant's own log volume — read at 0 B from the platform's billing events
 * (`log.ingest`, already in the catalog) — and the visit measured on the lab tenant (docs/v3.4/CONSUMO-DO-APP.md):
 *
 *   visit ≈ lab logs part × (tenant logs per hour ÷ lab logs per hour) + lab Davis part + lab other part
 *
 * The log part scales with the log volume (the app's log reads have fixed windows and read what is in them); the
 * Davis and other parts are kept at the lab's figures and said so — a projection, never a measurement. Bytes only:
 * the price lives in Licensing (rule 6).
 */

export interface Preflight {
  /** Logs ingested per hour in the window, GiB; null when the read did not answer or the window is empty. */
  logsPerHour: number | null;
  /** Tenant ÷ lab log volume. */
  ratio: number | null;
  /** Projected GiB for one full visit, and its log part. */
  visitGiB: number | null;
  visitLogsGiB: number | null;
  /** The lab's Davis part (included with Full-Stack) and other billable part, as used. */
  visitEventsGiB: number;
  visitOtherGiB: number;
  /** Above the line in the assumptions register: a large tenant, read with care. */
  large: boolean | null;
  /** Log queries the platform billed in the window (any app), GiB: shows logs are pay-per-query here. */
  billedLogQueryGiB: number | null;
}

export function preflight(records: readonly GrailRecord[] | null, windowHours: number): Preflight {
  const events = assumed('consumption.lab.visitEvents');
  const other = assumed('consumption.lab.visitOther');
  const empty: Preflight = { logsPerHour: null, ratio: null, visitGiB: null, visitLogsGiB: null, visitEventsGiB: events, visitOtherGiB: other, large: null, billedLogQueryGiB: null };
  if (records === null || !(windowHours > 0)) return empty;
  const bytesOf = (needle: string) =>
    records.filter((record) => (str(record, 'event.type') ?? '').includes(needle)).reduce((sum, record) => sum + (num(record, 'bytes') ?? 0), 0);
  const logsPerHour = bytesOf('Ingest') / GIB / windowHours;
  const ratio = logsPerHour / assumed('consumption.lab.logsIngestPerHour');
  // 3.6.8: the Logs console's count reads the whole window, so its part grows with the window as well as the log volume.
  const visitLogsGiB = (assumed('consumption.lab.visitLogs') + assumed('consumption.lab.errorCountPerHour') * windowHours) * ratio;
  const visitGiB = visitLogsGiB + events + other;
  return {
    logsPerHour,
    ratio,
    visitGiB,
    visitLogsGiB,
    visitEventsGiB: events,
    visitOtherGiB: other,
    large: visitGiB > assumed('consumption.preflight.visitLine'),
    billedLogQueryGiB: bytesOf('Query') / GIB,
  };
}
