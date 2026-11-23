import React, { useId, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { PasswordInput } from '@dynatrace/strato-components/forms';
import { Text } from '@dynatrace/strato-components/typography';

import { useAccess, type UnlockResult } from '../config/AccessContext';
import { useTranslation } from '../i18n/useTranslation';
import '../engine/spectrum.css';
import '../engine/v6.css';

/**
 * The partner's mini logon.
 *
 * Shown instead of the app to anyone who is neither a Dynatrace SE (by e-mail) nor a partner who
 * entered the PoC password. The "vault" lights one segment per character so the screen answers
 * the typing, shakes on a wrong password, and turns turquoise when it opens. Beside it a viewer
 * without the password can still choose the read-only executive view.
 *
 * What it does and does not protect is written in `config/access.ts`.
 */

const SEGMENTS = 8;
const RADIUS = 50;
const CENTER = 66;
const GAP_DEGREES = 12;

/** One arc of the ring, from `start` to `end` degrees (0 = top, clockwise). */
function arc(start: number, end: number): string {
  const point = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return `${(CENTER + RADIUS * Math.cos(radians)).toFixed(2)} ${(CENTER + RADIUS * Math.sin(radians)).toFixed(2)}`;
  };
  return `M ${point(start)} A ${RADIUS} ${RADIUS} 0 0 1 ${point(end)}`;
}

const SEGMENT_PATHS = Array.from({ length: SEGMENTS }, (_, index) => {
  const span = 360 / SEGMENTS;
  return arc(index * span + GAP_DEGREES / 2, (index + 1) * span - GAP_DEGREES / 2);
});

type VaultState = 'idle' | 'wrong' | 'ok';

export const AccessGate = ({ opened = false }: { opened?: boolean }) => {
  const { t } = useTranslation();
  const access = useAccess();
  const labelId = useId();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<VaultState>('idle');
  const [last, setLast] = useState<UnlockResult | null>(null);

  const open = opened || state === 'ok';
  const lit = open ? SEGMENTS : Math.min(SEGMENTS, password.length);
  const locked = access.lockedForSeconds > 0;

  // Read at render time, so the count includes the failure the throttle has just recorded.
  const message =
    last === 'wrong'
      ? t('gate.wrong', { n: access.attemptsLeft })
      : last === 'unavailable'
        ? t('gate.unavailable')
        : // 3.3.1 (S2): this PoC has no password yet. Saying "wrong" would send the partner
          // hunting for a secret that does not exist; the SE has to set one first.
          last === 'no-password'
          ? t('gate.noPassword')
          : null;

  const submit = async () => {
    if (busy || locked || password === '') return;
    setBusy(true);
    setLast(null);
    const result = await access.unlock(password);
    setBusy(false);
    if (result === 'ok') {
      setState('ok');
      return;
    }
    setLast(result);
    setState('wrong');
    setPassword('');
    setTimeout(() => setState('idle'), 420);
  };

  const who =
    access.identity.known
      ? t('gate.signedAs', { who: access.identity.name !== '' ? `${access.identity.name} (${access.identity.email})` : access.identity.email })
      : t('gate.signedAsUnknown');

  return (
    <main className="pvs-gate" aria-labelledby="pvs-gate-title">
      <div className="pvs-gate__card">
        <svg
          className="pvs-vault"
          data-state={open ? 'ok' : state}
          viewBox="0 0 132 132"
          role="img"
          aria-label={t('gate.vault.aria', { n: lit })}
        >
          <defs>
            <linearGradient id="pvs-vault-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--pvs-spec-a)' }} />
              <stop offset="1" style={{ stopColor: 'var(--pvs-spec-b)' }} />
            </linearGradient>
          </defs>
          {SEGMENT_PATHS.map((path, index) => (
            <path key={path} className="pvs-vault__seg" data-lit={index < lit} d={path} />
          ))}
          {/* A padlock that closes into a check when the vault opens. */}
          {open ? (
            <path className="pvs-vault__mark" d="M50 68 L62 80 L84 54" />
          ) : (
            <>
              <rect className="pvs-vault__mark" x="48" y="62" width="36" height="26" rx="5" />
              <path className="pvs-vault__mark" d="M55 62 V55 a11 11 0 0 1 22 0 V62" />
            </>
          )}
        </svg>

        <h1 className="pvs-gate__title" id="pvs-gate-title">
          {t('gate.title')}
        </h1>
        <p className="pvs-gate__lead">{t('gate.lead')}</p>
        <p className="pvs-gate__who">{who}</p>

        <div className="pvs-gate__field">
          <Text id={labelId}>{t('gate.password.label')}</Text>
          <div className="pvs-gate__row">
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="off"
              aria-labelledby={labelId}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
              }}
            />
            <Button variant="emphasized" disabled={busy || locked || password === ''} onClick={() => void submit()}>
              {busy ? t('gate.checking') : t('gate.enter')}
            </Button>
          </div>
          <p className="pvs-gate__msg" role="status" aria-live="polite" data-tone={open ? 'ok' : undefined}>
            {open ? t('gate.success') : locked ? t('gate.locked', { s: access.lockedForSeconds }) : message}
          </p>
        </div>

        <Button onClick={access.enterRestrictedView}>{t('gate.restricted.btn')}</Button>
        <p className="pvs-gate__foot">{t('gate.restricted.note')}</p>
        <p className="pvs-gate__foot">{t('gate.footer')}</p>
      </div>
    </main>
  );
};
