import { num, str, type GrailRecord } from '../utils/records';

/**
 * 3.7.7 — AI Observability (the owner approved the 3.7.6 proposal): what the environment's generative-AI clients report in the
 * OpenTelemetry GenAI metrics. Tokens are counted as read (every group of `ai.tokens` is a row with no limit, so the rows may be
 * added up — rule 7); a model the client does not report stays "not reported", never guessed. No price (rule 6).
 */

export interface AiTokenRow {
  service: string;
  /** null when the client does not report the model. */
  model: string | null;
  input: number;
  output: number;
}

/** The token rows by service and model, input and output side by side; the busiest first. Pure. */
export function aiTokenRows(records: readonly GrailRecord[]): AiTokenRow[] {
  const rows = new Map<string, AiTokenRow>();
  for (const record of records) {
    const service = str(record, 'service.name') ?? '—';
    const model = str(record, 'gen_ai.request.model');
    const kind = str(record, 'gen_ai.token.type');
    const total = num(record, 'total') ?? 0;
    const key = `${service}\u0000${model ?? ''}`;
    const row = rows.get(key) ?? { service, model, input: 0, output: 0 };
    if (kind === 'input') row.input += total;
    else if (kind === 'output') row.output += total;
    rows.set(key, row);
  }
  return [...rows.values()].filter((row) => row.input + row.output > 0).sort((a, b) => b.input + b.output - (a.input + a.output));
}

export interface AiTotals {
  input: number;
  output: number;
  services: number;
  /** Models named by the clients (a row without a model is not counted as one). */
  models: number;
}

export function aiTotals(rows: readonly AiTokenRow[]): AiTotals {
  return {
    input: rows.reduce((sum, row) => sum + row.input, 0),
    output: rows.reduce((sum, row) => sum + row.output, 0),
    services: new Set(rows.map((row) => row.service)).size,
    models: new Set(rows.flatMap((row) => (row.model === null ? [] : [row.model]))).size,
  };
}

/** Tokens by model (input + output); "not reported" gathers the rows without a model. */
export function tokensByModel(rows: readonly AiTokenRow[]): { model: string | null; tokens: number }[] {
  const by = new Map<string | null, number>();
  for (const row of rows) by.set(row.model, (by.get(row.model) ?? 0) + row.input + row.output);
  return [...by.entries()].map(([model, tokens]) => ({ model, tokens })).sort((a, b) => b.tokens - a.tokens);
}

export interface AiCallRow {
  service: string;
  model: string | null;
  /** null when the call succeeded. */
  error: string | null;
  calls: number;
  avgSeconds: number | null;
}

export function aiCallRows(records: readonly GrailRecord[]): AiCallRow[] {
  return records
    .map((record) => ({
      service: str(record, 'service.name') ?? '—',
      model: str(record, 'gen_ai.request.model'),
      error: str(record, 'error.type'),
      calls: num(record, 'calls') ?? 0,
      avgSeconds: num(record, 'avgSeconds'),
    }))
    .filter((row) => row.calls > 0);
}

/** Calls, failed calls and the call-weighted mean time; null figures when no call was read. */
export function aiCallTotals(rows: readonly AiCallRow[]): { calls: number; failed: number; meanSeconds: number | null } {
  const calls = rows.reduce((sum, row) => sum + row.calls, 0);
  const failed = rows.filter((row) => row.error !== null).reduce((sum, row) => sum + row.calls, 0);
  const timed = rows.filter((row) => row.avgSeconds !== null);
  const weight = timed.reduce((sum, row) => sum + row.calls, 0);
  const meanSeconds = weight === 0 ? null : timed.reduce((sum, row) => sum + row.calls * (row.avgSeconds ?? 0), 0) / weight;
  return { calls, failed, meanSeconds };
}

export interface AiModelCard {
  /** null gathers the clients that do not report their model. */
  model: string | null;
  services: string[];
  input: number;
  output: number;
  /** Share of every token read (input + output), 0–100. */
  share: number;
  calls: number | null;
  failed: number;
  meanSeconds: number | null;
}

/** 3.7.8: one card per model — its tokens, its share, the services calling it and its calls. Pure. */
export function aiModelCards(rows: readonly AiTokenRow[], calls: readonly AiCallRow[]): AiModelCard[] {
  const total = rows.reduce((sum, row) => sum + row.input + row.output, 0);
  const byModel = new Map<string | null, AiModelCard>();
  for (const row of rows) {
    const card = byModel.get(row.model) ?? { model: row.model, services: [], input: 0, output: 0, share: 0, calls: null, failed: 0, meanSeconds: null };
    card.input += row.input;
    card.output += row.output;
    if (!card.services.includes(row.service)) card.services.push(row.service);
    byModel.set(row.model, card);
  }
  for (const card of byModel.values()) {
    card.share = total === 0 ? 0 : (100 * (card.input + card.output)) / total;
    const mine = calls.filter((call) => call.model === card.model);
    if (mine.length > 0) {
      const totals = aiCallTotals(mine);
      card.calls = totals.calls;
      card.failed = totals.failed;
      card.meanSeconds = totals.meanSeconds;
    }
  }
  return [...byModel.values()].sort((a, b) => b.input + b.output - (a.input + a.output));
}

/** Tokens by service (input + output), the busiest first. */
export function tokensByService(rows: readonly AiTokenRow[]): { service: string; tokens: number }[] {
  const by = new Map<string, number>();
  for (const row of rows) by.set(row.service, (by.get(row.service) ?? 0) + row.input + row.output);
  return [...by.entries()].map(([service, tokens]) => ({ service, tokens })).sort((a, b) => b.tokens - a.tokens);
}
