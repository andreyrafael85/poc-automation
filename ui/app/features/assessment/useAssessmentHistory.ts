import { useCallback, useEffect, useState } from 'react';

import { useStudio } from '../../config/StudioContext';
import { addSnapshot, EMPTY_HISTORY, HISTORY_KEY, parseHistory, removeSnapshot, type AssessmentHistory, type AssessmentSnapshot } from './history';

/**
 * The Assessment's kept readings on the tenant (3.4.2, F-01). Read once when the page opens; a save
 * reads the stored document again first, so a reading kept by someone else in the meantime is not
 * lost. Every outcome is a state the page names — never a silent failure.
 */

export type HistoryStatus = 'loading' | 'ready' | 'saving' | 'saved' | 'removed' | 'offline' | 'forbidden' | 'too-large' | 'failed';

export interface AssessmentHistoryState {
  history: AssessmentHistory;
  status: HistoryStatus;
  save: (snapshot: AssessmentSnapshot) => Promise<void>;
  remove: (readAt: string) => Promise<void>;
}

export function useAssessmentHistory(): AssessmentHistoryState {
  const { stateStore } = useStudio();
  const [history, setHistory] = useState<AssessmentHistory>(EMPTY_HISTORY);
  const [status, setStatus] = useState<HistoryStatus>(stateStore === null ? 'offline' : 'loading');

  const load = useCallback(async (): Promise<AssessmentHistory | null> => {
    if (stateStore === null) return null;
    const outcome = await stateStore.read('app', HISTORY_KEY);
    if (outcome.kind === 'found') return parseHistory(outcome.value);
    if (outcome.kind === 'missing') return EMPTY_HISTORY;
    setStatus(outcome.kind === 'forbidden' ? 'forbidden' : 'failed');
    return null;
  }, [stateStore]);

  useEffect(() => {
    let live = true;
    if (stateStore === null) {
      setStatus('offline');
      return;
    }
    void load().then((loaded) => {
      if (!live || loaded === null) return;
      setHistory(loaded);
      setStatus('ready');
    });
    return () => {
      live = false;
    };
  }, [stateStore, load]);

  const write = useCallback(
    async (next: AssessmentHistory, done: HistoryStatus) => {
      if (stateStore === null) return;
      const outcome = await stateStore.write('app', HISTORY_KEY, JSON.stringify(next));
      if (outcome.kind === 'saved') {
        setHistory(next);
        setStatus(done);
      } else setStatus(outcome.kind === 'forbidden' ? 'forbidden' : outcome.kind === 'too-large' ? 'too-large' : 'failed');
    },
    [stateStore],
  );

  const save = useCallback(
    async (snapshot: AssessmentSnapshot) => {
      setStatus('saving');
      const latest = await load();
      if (latest === null) return;
      await write(addSnapshot(latest, snapshot), 'saved');
    },
    [load, write],
  );

  const remove = useCallback(
    async (readAt: string) => {
      setStatus('saving');
      const latest = await load();
      if (latest === null) return;
      await write(removeSnapshot(latest, readAt), 'removed');
    },
    [load, write],
  );

  return { history, status, save, remove };
}
