import { sha256Hex } from '../plan/planner';

/**
 * The customer tenants this app must never take a print from (AGENTS.md rule 11).
 *
 * The list lived in the capture companion until 3.3.2 (`pvs-capture.mjs`); when the owner retired
 * the companion it moved here, so every import path — the companion's ZIPs, which still import —
 * keeps refusing them. They are kept as SHA-256 of the environment id, never as the ids: the
 * release pack refuses a bundle that names them, and the app has no reason to know them by name.
 *
 * In this repository the two hashes below are placeholders (the SHA-256 of `custa001` and `custb002`) —
 * a short environment id can be recovered from its hash, so the real ones are not published. Replace
 * them with the SHA-256 (hex, of the lower-case environment id) of the tenants you must never take
 * a print from.
 */
export const BLOCKED_TENANT_SHA256: readonly string[] = [
  // Placeholders: the SHA-256 of `custa001` and `custb002`.
  'd0af30ffe99291f1e3e9a65c7000b749a4237d9afe71ec3bcc58b77af41f7fef',
  'cbfb075bad77dd6da6c4b32b5ef5e078863dd07c15def84278d34b1a5d51a2a7',
];

/** The environment id of a tenant host (`abc12345.apps.dynatrace.com` → `abc12345`), lower case. */
export function environmentIdOf(host: string): string {
  return (host.trim().toLowerCase().split('.')[0] ?? '').replace(/[^a-z0-9-]/g, '');
}

/** True when the host (or a bare id) is one of the blocked customer tenants. */
export function isBlockedTenant(hostOrId: string): boolean {
  const id = environmentIdOf(hostOrId);
  return id !== '' && BLOCKED_TENANT_SHA256.includes(sha256Hex(id));
}
