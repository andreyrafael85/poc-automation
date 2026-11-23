import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — top-up keys of work package WP2 of the real-prints deck (keys not already in v327prints.ts).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 *
 * - `prt.app.*`: the platform app each layout shows (`LAYOUTS[layout].appLabelKey`), for the print
 *   caption ("Tela real · {app} · …"). Product names stay in English, as everywhere in the app.
 * - `prt.why.*.other`: the "por que esta tela" of an alternate ("Trocar entidade"). The keys of the
 *   chosen screen say "the most impactful", "the top failing caller", "the largest excess"…, which
 *   would be false for the second candidate, so an alternate states only its own numbers.
 * - `prt.title.failing.other`: the same for the failing-service title ("the most excess failures")
 *   when the slot shows a service other than the top of the excess ranking.
 * - `prt.title.*.none`: the title of a slot with no screen chosen (3.2.7 review UX-L7), with no name
 *   to fill — never "Problema —" or "Kubernetes · cluster —".
 */

export const v327Wp2Strings = {
  'prt.app.problems': { en: 'Problems', 'pt-BR': 'Problems' },
  'prt.app.services': { en: 'Services', 'pt-BR': 'Services' },
  'prt.app.vitals': { en: 'Experience Vitals', 'pt-BR': 'Experience Vitals' },
  'prt.app.kubernetes': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'prt.app.tracing': { en: 'Distributed Tracing', 'pt-BR': 'Distributed Tracing' },
  'prt.app.logs': { en: 'Logs', 'pt-BR': 'Logs' },
  'prt.app.smartscape': { en: 'Smartscape', 'pt-BR': 'Smartscape' },
  'prt.app.vulnerabilities': { en: 'Vulnerabilities', 'pt-BR': 'Vulnerabilities' },
  'prt.app.infraops': { en: 'Infrastructure & Operations', 'pt-BR': 'Infrastructure & Operations' },
  'prt.app.free': { en: 'Dynatrace', 'pt-BR': 'Dynatrace' },
  'prt.why.problem.other': {
    en: '{id} “{name}”: another problem with a root cause in 15 days — root cause {root}, {count} affected entities, lasted {duration}.',
    'pt-BR': '{id} “{name}”: outro problema com causa raiz em 15 dias — causa raiz {root}, {count} entidades afetadas, durou {duration}.',
  },
  'prt.why.problem.other.open': {
    en: '{id} “{name}”: another problem with a root cause in 15 days — root cause {root}, {count} affected entities, open for {duration}.',
    'pt-BR': '{id} “{name}”: outro problema com causa raiz em 15 dias — causa raiz {root}, {count} entidades afetadas, aberto há {duration}.',
  },
  'prt.why.rootDb.other': {
    en: '{caller} also calls the database {root} — {failures} failures in {requests} requests, {share} of all callers\' failures ({window}).',
    'pt-BR': '{caller} também chama o banco de dados {root} — {failures} falhas em {requests} requisições, {share} das falhas de todos os chamadores ({window}).',
  },
  'prt.why.frontend.other': {
    en: '{frontend}: {requests} requests in 7 days.',
    'pt-BR': '{frontend}: {requests} requisições em 7 dias.',
  },
  'prt.why.k8s.other': {
    en: '{cluster}: another cluster with metrics in the environment.',
    'pt-BR': '{cluster}: outro cluster com métricas no ambiente.',
  },
  'prt.why.failing.other': {
    en: '{name}: failures above the environment rate — {failures} in {requests} requests ({rate}), {times} the environment rate ({window}).',
    'pt-BR': '{name}: falhas acima da taxa do ambiente — {failures} em {requests} requisições ({rate}), {times} a taxa do ambiente ({window}).',
  },
  'prt.why.host.other': {
    en: '{host}: CPU peak {cpu}, memory peak {mem}.',
    'pt-BR': '{host}: pico de CPU {cpu}, pico de memória {mem}.',
  },
  'prt.title.failing.other': { en: 'Service with excess failures · {name}', 'pt-BR': 'Serviço com falhas em excesso · {name}' },
  'prt.title.problem.none': { en: 'Problem', 'pt-BR': 'Problema' },
  'prt.title.rootCause.none': { en: 'Root cause', 'pt-BR': 'Causa raiz' },
  'prt.title.frontend.none': { en: 'User experience', 'pt-BR': 'Experiência do usuário' },
  'prt.title.k8s.none': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'prt.title.failing.none': { en: 'Service with the most excess failures', 'pt-BR': 'Serviço com mais falhas em excesso' },
  'prt.title.host.none': { en: 'Host', 'pt-BR': 'Host' },
} as const satisfies Record<string, Entry>;
