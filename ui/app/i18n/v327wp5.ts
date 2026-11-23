import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP5 of the real-prints deck (keys not already in v327prints.ts).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 *
 * The evidence engine's own words: the unit of errors per 100 requests (never a "%": it can pass
 * 100), the D9 headline when a cluster restarts without OOM kills, the D8a headline and finding
 * when the idle reservation is CPU rather than memory, and the row and column labels of the
 * analysis charts.
 */

export const v327Wp5Strings = {
  'prt.an.unit.per100': { en: '{value} per 100 req', 'pt-BR': '{value} por 100 req' },
  'prt.anom.D9.restarts': { en: '{restarts} restarts in 24 h', 'pt-BR': '{restarts} reinícios em 24 h' },
  'prt.anom.D8a.cpu': { en: 'CPU {req} reserved, {used} in use', 'pt-BR': 'CPU {req} reservada, {used} em uso' },
  'prt.an.f.reservedCpu': {
    en: '{reqPct} of the allocatable CPU is reserved and only {usedPct} of the reservation is in use: a reservation alert, not saturation.',
    'pt-BR': '{reqPct} da CPU alocável está reservada e só {usedPct} do reservado está em uso: alerta de reserva, não de saturação.',
  },
  'prt.an.viz.cpuRow': { en: 'CPU (cores)', 'pt-BR': 'CPU (cores)' },
  'prt.an.viz.memRow': { en: 'Memory (GiB)', 'pt-BR': 'Memória (GiB)' },
  'prt.an.viz.h.caller': { en: 'Caller', 'pt-BR': 'Chamador' },
  'prt.an.viz.h.failures': { en: 'Failures', 'pt-BR': 'Falhas' },
  'prt.an.viz.h.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'prt.an.viz.otherSeverity': { en: 'Medium and low', 'pt-BR': 'Médias e baixas' },
  'prt.an.viz.fleetMedian': { en: 'Fleet median', 'pt-BR': 'Mediana da frota' },
} as const satisfies Record<string, Entry>;
