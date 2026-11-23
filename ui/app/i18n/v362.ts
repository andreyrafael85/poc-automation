import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.2: the Experience funnel (the v5 proposal, approved 2026-11-21) and the dials of the
 * app as an arc of segments (the owner: "os gauges serão reestilizados também … o atual está bem antigo"). Merged in
 * `strings.ts`.
 */

export const v362Strings = {
  'catalog.purpose.rum.funnel': {
    en: 'The experience funnel per application, real users only: every user action, the actions not frustrated (satisfied or tolerating) and the satisfied ones, by the experience level the platform gives each action; and the requests, those answered without a 4xx or 5xx, and those with one. Each step is part of the one before, in the same unit.',
    'pt-BR': 'O funil da experiência por aplicação, só usuários reais: todas as ações dos usuários, as ações sem frustração (satisfeitas ou toleradas) e as satisfeitas, pelo nível de experiência que a plataforma dá a cada ação; e as requisições, as respondidas sem 4xx ou 5xx e as com um deles. Cada degrau é parte do anterior, na mesma unidade.',
  },
  'exp.funnel.title': {
    en: 'From the action to a satisfied experience',
    'pt-BR': 'Da ação à experiência satisfeita',
  },
  'exp.funnel.subtitle': {
    en: 'What real users did in the window across {apps} applications, each step part of the one before — the experience level Dynatrace gives each action.',
    'pt-BR': 'O que os usuários reais fizeram na janela em {apps} aplicações, cada degrau parte do anterior — o nível de experiência que a Dynatrace dá a cada ação.',
  },
  'exp.funnel.unit.actions': { en: 'User actions', 'pt-BR': 'Ações dos usuários' },
  'exp.funnel.unit.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'exp.funnel.step.actions': { en: 'Every user action', 'pt-BR': 'Todas as ações' },
  'exp.funnel.step.notFrustrated': { en: 'Not frustrated', 'pt-BR': 'Sem frustração' },
  'exp.funnel.step.satisfied': { en: 'Satisfied', 'pt-BR': 'Satisfeitas' },
  'exp.funnel.step.requests': { en: 'Every request', 'pt-BR': 'Todas as requisições' },
  'exp.funnel.step.requestsOk': { en: 'Answered without 4xx/5xx', 'pt-BR': 'Respondidas sem 4xx/5xx' },
  'exp.funnel.drop.frustrated': { en: '−{count} frustrated', 'pt-BR': '−{count} com frustração' },
  'exp.funnel.drop.tolerating': { en: '−{count} tolerating', 'pt-BR': '−{count} toleradas' },
  'exp.funnel.drop.failed': { en: '−{count} with a 4xx/5xx', 'pt-BR': '−{count} com 4xx/5xx' },
  'exp.funnel.worst': {
    en: 'Where to look first: {app} — {count} of its {actions} actions frustrated ({pct} %).',
    'pt-BR': 'Onde olhar primeiro: {app} — {count} das suas {actions} ações com frustração ({pct} %).',
  },
  'exp.funnel.legend': {
    en: 'Dynatrace grades every user action as satisfied, tolerating or frustrated from its duration and errors; the funnel adds up the applications in the window (rum.funnel, dt.frontend.* metrics, real users). It counts user actions, the unit the platform grades.',
    'pt-BR': 'A Dynatrace classifica cada ação do usuário como satisfeita, tolerada ou frustrada pela duração e pelos erros; o funil soma as aplicações da janela (rum.funnel, métricas dt.frontend.*, usuários reais). Ele conta ações dos usuários, a unidade que a plataforma classifica.',
  },
  'help.whatsNew.i104': {
    en: '3.6.2 — The Experience funnel, and new dials. Digital experience opens with a funnel of what real users did: every user action, the ones not frustrated and the satisfied ones — the experience level Dynatrace gives each action —, each step part of the one before, beside the requests answered without a 4xx or 5xx, and the application to look at first. Every dial of the app — the Overview’s header, Dynatrace Intelligence’s posture, the rings of every page and the Core Web Vitals — is now an arc of segments lit up to the reading, as the v6 tick bars; the older value cards are flat like the rest.',
    'pt-BR': '3.6.2 — O funil da Experiência e medidores novos. A Experiência digital abre com um funil do que os usuários reais fizeram: todas as ações, as sem frustração e as satisfeitas — o nível de experiência que a Dynatrace dá a cada ação —, cada degrau parte do anterior, ao lado das requisições respondidas sem 4xx ou 5xx e da aplicação para olhar primeiro. Todos os medidores do app — o topo da Visão geral, a postura da Dynatrace Intelligence, os anéis de cada página e as Core Web Vitals — viraram um arco de segmentos aceso até a leitura, como as barras de tiques da v6; os cartões de valor mais antigos ficaram planos como os demais.',
  },
} satisfies Record<string, Entry>;
