import { useCallback, useEffect, useState } from 'react';

import { useStudio } from '../../config/StudioContext';
import { EMPTY_PLAN, mergePlan, parsePlan, PLAN_KEY, type ActionPlan, type PlanItem } from './actionPlan';

/**
 * The Assessment's action plan on the tenant (3.4.6, F-06). Read once when the page opens; a save reads the
 * stored plan again first and lays only the entries edited here over it, so an entry someone else saved in
 * the meantime is not lost. Every outcome is a state the page names — never a silent failure.
 */

export type PlanSaveStatus = 'loading' | 'ready' | 'saving' | 'saved' | 'offline' | 'forbidden' | 'too-large' | 'failed';

export interface ActionPlanState {
  plan: ActionPlan;
  status: PlanSaveStatus;
  save: (edited: Readonly<Record<string, PlanItem>>) => Promise<boolean>;
}

export function useActionPlan(): ActionPlanState {
  const { stateStore } = useStudio();
  const [plan, setPlan] = useState<ActionPlan>(EMPTY_PLAN);
  const [status, setStatus] = useState<PlanSaveStatus>(stateStore === null ? 'offline' : 'loading');

  const load = useCallback(async (): Promise<ActionPlan | null> => {
    if (stateStore === null) return null;
    const outcome = await stateStore.read('app', PLAN_KEY);
    if (outcome.kind === 'found') return parsePlan(outcome.value);
    if (outcome.kind === 'missing') return EMPTY_PLAN;
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
      setPlan(loaded);
      setStatus('ready');
    });
    return () => {
      live = false;
    };
  }, [stateStore, load]);

  const save = useCallback(
    async (edited: Readonly<Record<string, PlanItem>>) => {
      if (stateStore === null) return false;
      setStatus('saving');
      const latest = await load();
      if (latest === null) return false;
      const next = mergePlan(latest, edited, new Date().toISOString());
      const outcome = await stateStore.write('app', PLAN_KEY, JSON.stringify(next));
      if (outcome.kind === 'saved') {
        setPlan(next);
        setStatus('saved');
        return true;
      }
      setStatus(outcome.kind === 'forbidden' ? 'forbidden' : outcome.kind === 'too-large' ? 'too-large' : 'failed');
      return false;
    },
    [stateStore, load],
  );

  return { plan, status, save };
}
