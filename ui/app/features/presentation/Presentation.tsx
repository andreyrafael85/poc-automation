import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { ArrowLeftIcon, ArrowRightIcon, XmarkIcon } from '@dynatrace/strato-icons';
import { useLocation, useNavigate } from 'react-router-dom';

import { storyNeighbours } from '../../config/navigation';
import { useAudience } from '../../hooks/useAudience';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * 3.6.4 — the discreet presentation mode (visual proposal v4, approved 2026-11-20: "uma barra fina embaixo — setas, a
 * frase do momento, passos — e destaque no painel em discussão; o resto esmaece; a página continua sendo a página").
 *
 * The SE turns it on from the header. The page stays the page: its top-level panels become the steps, the one under
 * discussion keeps its full ink and the others fade; a thin bar at the bottom says which step of how many, names the
 * panel (its own heading — never a sentence the app makes up), and moves with ← / → (after the last step, the next page
 * of the story) and closes with Esc. Nothing it does changes a figure, a query or an export; the bar and the fading are
 * screen only.
 */

interface PresentationState {
  presenting: boolean;
  start: () => void;
  stop: () => void;
}

const PresentationContext = createContext<PresentationState>({ presenting: false, start: () => undefined, stop: () => undefined });

export const usePresentation = (): PresentationState => useContext(PresentationContext);

export const PresentationProvider = ({ children }: { children: React.ReactNode }) => {
  const [presenting, setPresenting] = useState(false);
  const start = useCallback(() => setPresenting(true), []);
  const stop = useCallback(() => setPresenting(false), []);
  useEffect(() => {
    document.documentElement.classList.toggle('pvs-presenting', presenting);
    return () => document.documentElement.classList.remove('pvs-presenting');
  }, [presenting]);
  const value = useMemo(() => ({ presenting, start, stop }), [presenting, start, stop]);
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
};

/** The panels a page is made of, in reading order: the visible top-level panels and KPI rows of the main content. */
export function presentationSteps(root: ParentNode): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>('.pvs-panel, .pvs-skpi-row'));
  return all.filter((element) => {
    const parent = element.parentElement?.closest('.pvs-panel, .pvs-skpi-row');
    if (parent !== null && parent !== undefined) return false;
    // A panel inside a hidden tab, or not laid out, is not a step.
    if (element.closest('[hidden], [aria-hidden="true"]') !== null) return false;
    return element.getClientRects().length > 0;
  });
}

/** What the bar says about a step: its own heading, its accessible name, or the names of its first number cards. */
export function stepPhrase(element: HTMLElement): string {
  const heading = element.querySelector('h1, h2, h3, h4');
  // A row of number cards has no heading of its own: the names of its first cards say what it is.
  const labels = Array.from(element.querySelectorAll('.pvs-skpi__label'))
    .slice(0, 3)
    .map((label) => label.textContent?.trim() ?? '')
    .filter((label) => label !== '');
  const text = heading?.textContent?.trim() || element.getAttribute('aria-label')?.trim() || labels.join(' · ');
  return text.replace(/\s+/g, ' ');
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export const PresentationBar = () => {
  const { t, formatNumber } = useTranslation();
  const { presenting, stop } = usePresentation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const audience = useAudience();
  const [steps, setSteps] = useState<HTMLElement[]>([]);
  const [index, setIndex] = useState(0);
  const pendingFirst = useRef(true);

  // The steps of the page now shown — read again on each page and when the page finishes loading its panels.
  useEffect(() => {
    if (!presenting) return undefined;
    pendingFirst.current = true;
    setIndex(0);
    // The layout may mount the content area again (a breakpoint, a page loading), so each read looks it up anew and
    // the observer watches the whole document, at most once a frame.
    let frame = 0;
    const read = () => {
      frame = 0;
      const main = document.getElementById('pvs-main');
      const found = main === null ? [] : presentationSteps(main);
      // Only a different list of panels counts as a change (a chart redrawing inside a panel does not).
      setSteps((known) => (known.length === found.length && known.every((step, k) => step === found[k]) ? known : found));
    };
    read();
    const observer = new MutationObserver(() => {
      if (frame === 0) frame = window.requestAnimationFrame(read);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [presenting, pathname]);

  const current = steps[Math.min(index, Math.max(0, steps.length - 1))];

  // The panel under discussion keeps its ink; the others fade (CSS on `data-present-step` / `data-present-focus`).
  useEffect(() => {
    if (!presenting) return undefined;
    for (const step of steps) {
      step.setAttribute('data-present-step', 'true');
      step.toggleAttribute('data-present-focus', step === current);
    }
    if (current !== undefined && !pendingFirst.current) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      current.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    pendingFirst.current = false;
    return () => {
      for (const step of steps) {
        step.removeAttribute('data-present-step');
        step.removeAttribute('data-present-focus');
      }
    };
  }, [presenting, steps, current]);

  const { previous, next } = storyNeighbours(pathname, audience);
  const forward = useCallback(() => {
    if (index < steps.length - 1) setIndex(index + 1);
    else if (next !== undefined) void navigate(next.route);
  }, [index, steps.length, next, navigate]);
  const backward = useCallback(() => {
    if (index > 0) setIndex(index - 1);
    else if (previous !== undefined) void navigate(previous.route);
  }, [index, previous, navigate]);

  useEffect(() => {
    if (!presenting) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        forward();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        backward();
      } else if (event.key === 'Escape') {
        stop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, forward, backward, stop]);

  if (!presenting) return null;
  const phrase = current === undefined ? '' : stepPhrase(current);
  const position = steps.length === 0 ? '' : t('present.step', { n: formatNumber(Math.min(index, steps.length - 1) + 1), of: formatNumber(steps.length) });
  return (
    <div className="pvs-present" role="region" aria-label={t('present.label')} data-print-hide data-testid="present-bar">
      <Button variant="default" size="condensed" onClick={backward} aria-label={t('present.previous')} data-testid="present-prev">
        <Button.Prefix>
          <ArrowLeftIcon />
        </Button.Prefix>
      </Button>
      <span className="pvs-present__phrase" aria-live="polite">
        <span className="pvs-present__now">{t('present.now')}</span> {phrase === '' ? '—' : phrase}
      </span>
      <span className="pvs-present__step" data-testid="present-step">
        {position}
      </span>
      <Button variant="default" size="condensed" onClick={forward} aria-label={t('present.next')} data-testid="present-next">
        <Button.Prefix>
          <ArrowRightIcon />
        </Button.Prefix>
      </Button>
      <Button variant="default" size="condensed" onClick={stop} data-testid="present-exit">
        <Button.Prefix>
          <XmarkIcon />
        </Button.Prefix>
        {t('present.exit')}
      </Button>
      <span className="pvs-present__keys" aria-hidden="true">
        {t('present.keys')}
      </span>
    </div>
  );
};
