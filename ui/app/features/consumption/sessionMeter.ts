import { useSyncExternalStore } from 'react';

/**
 * The session meter (3.4.11, proposal §C8 F-16 layer 1 — the owner's order of 2026-11-18 to "criar alguma
 * estratégia para gerar esse cálculo de custo do próprio app"). Every answer Grail sends carries the bytes it
 * scanned on demand (`metadata.grail.scannedBytes`, read by `queries/grailMetadata.ts`); the meter adds them up
 * for this browser session, by catalog query and by the page that asked. No query of its own: it only counts what
 * already came back, so measuring costs nothing.
 *
 * One answer is counted once: a cached answer shared by several panels is the same object, so it is recorded the
 * first time it is seen; a refetch is a new answer and is counted again, because Grail read again. Bytes only —
 * money stays in Licensing (rule 6). The meter lives in memory and starts at zero with every session.
 */

export interface MeterRead {
  id: string;
  bytes: number;
  page: string;
  at: number;
}

let reads: MeterRead[] = [];
let page = '/';
const listeners = new Set<() => void>();
const seen = new WeakSet<object>();

const emit = () => listeners.forEach((listener) => listener());

/** The page the next reads belong to (set by `MeterPageTracker` inside the router). */
export function setMeterPage(path: string): void {
  page = path;
}

/** Records one answer; returns false when the answer was already counted or carries no figure. */
export function recordRead(answer: object, id: string, bytes: number | null, now: number = Date.now()): boolean {
  if (seen.has(answer)) return false;
  seen.add(answer);
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return false;
  reads = [...reads, { id, bytes, page, at: now }];
  emit();
  return true;
}

export function resetMeter(): void {
  reads = [];
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const meterSnapshot = (): readonly MeterRead[] => reads;

export function useSessionMeter(): readonly MeterRead[] {
  return useSyncExternalStore(subscribe, meterSnapshot, meterSnapshot);
}

export interface MeterGroup {
  key: string;
  reads: number;
  bytes: number;
}

/** Reads grouped by a key (query id or page), the heaviest first — exact sums over every recorded answer. */
export function groupReads(list: readonly MeterRead[], by: 'id' | 'page'): MeterGroup[] {
  const out = new Map<string, MeterGroup>();
  for (const read of list) {
    const key = by === 'id' ? read.id : read.page;
    const current = out.get(key) ?? { key, reads: 0, bytes: 0 };
    current.reads += 1;
    current.bytes += read.bytes;
    out.set(key, current);
  }
  return [...out.values()].sort((a, b) => b.bytes - a.bytes || b.reads - a.reads);
}

export const GIB = 1024 ** 3;
