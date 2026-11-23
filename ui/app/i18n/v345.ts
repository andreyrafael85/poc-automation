import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.5 — the Assessment's summary tightened, the maturity journey as a staircase after
 * Dynatrace's observability maturity model, and the impact × effort heat map redrawn (owner's review of 3.4.4,
 * 2026-11-18). Merged in `strings.ts`.
 */

export const v345Strings = {
  // ---------------------------------------------------------------- the glance
  'asm.exec.winsTitle': { en: 'What is going well', 'pt-BR': 'O que está indo bem' },
  'asm.exec.gapsTitle': { en: 'What to work on', 'pt-BR': 'O que trabalhar' },
  'asm.exec.kind.strength': { en: 'strength', 'pt-BR': 'ponto forte' },
  'asm.exec.kind.inUse': { en: 'in use', 'pt-BR': 'em uso' },
  'asm.exec.kind.critical': { en: 'critical', 'pt-BR': 'crítico' },
  'asm.exec.kind.warning': { en: 'attention', 'pt-BR': 'atenção' },
  'asm.exec.kind.notDetected': { en: 'not detected yet', 'pt-BR': 'ainda não detectado' },
  'asm.exec.moreWins': { en: 'And {count} more on the Coverage and usage tab.', 'pt-BR': 'E mais {count} na guia Cobertura e uso.' },
  'asm.exec.moreGaps': { en: 'And {count} more on the Findings and actions tab.', 'pt-BR': 'E mais {count} na guia Achados e ações.' },

  // ---------------------------------------------------------------- maturity, after Dynatrace's model
  'asm.mat.l1.tag': { en: 'The starting point', 'pt-BR': 'O ponto de partida' },
  'asm.mat.l2.tag': { en: 'The visibility foundation', 'pt-BR': 'A base de visibilidade' },
  'asm.mat.l3.tag': { en: 'Unified observability for faster decisions', 'pt-BR': 'Observabilidade unificada para decidir mais rápido' },
  'asm.mat.l4.tag': { en: 'AI-driven, preventive operations', 'pt-BR': 'Operações preventivas guiadas por IA' },
  'asm.mat.l5.tag': { en: 'The control plane for autonomous operations', 'pt-BR': 'O plano de controle de operações autônomas' },
  'asm.mat.now': { en: 'The environment is already at step {level}, {name} — with the way forward mapped below.', 'pt-BR': 'O ambiente já está na etapa {level}, {name} — com o caminho para avançar mapeado abaixo.' },
  'asm.mat.next': {
    en: 'Next steps with Dynatrace to reach {name}:',
    'pt-BR': 'Próximos passos com a Dynatrace para chegar a {name}:',
  },
  'asm.mat.aheadMet': {
    en: 'Already in practice here; it counts once the steps before it are reached.',
    'pt-BR': 'Já em prática aqui; passa a contar quando as etapas anteriores forem alcançadas.',
  },
  'asm.mat.top': { en: 'Every step of the journey is reached: Dynatrace is the control plane of these operations.', 'pt-BR': 'Todas as etapas da jornada estão alcançadas: a Dynatrace é o plano de controle dessas operações.' },
  'asm.mat.progress': { en: 'Already in place: {met} of {total}', 'pt-BR': 'Já em prática: {met} de {total}' },

  // ---------------------------------------------------------------- heat map
  'asm.heat.hint.quickWins': { en: 'Do first: high impact for little effort.', 'pt-BR': 'Faça primeiro: alto impacto com pouco esforço.' },
  'asm.heat.hint.strategic': { en: 'Plan as a project: high impact, more effort.', 'pt-BR': 'Planeje como projeto: alto impacto, mais esforço.' },
  'asm.heat.hint.plan': { en: 'Schedule in the next cycles.', 'pt-BR': 'Agende nos próximos ciclos.' },
  'asm.heat.hint.fillIns': { en: 'When there is room: small and simple.', 'pt-BR': 'Quando houver espaço: pequeno e simples.' },
  'asm.heat.hint.reconsider': { en: 'Reconsider: much effort for little impact.', 'pt-BR': 'Reavalie: muito esforço para pouco impacto.' },
  'asm.heat.more': { en: '+{count} more', 'pt-BR': '+{count} a mais' },
  'asm.heat.legend': {
    en: 'The hue marks the zone; the stronger the colour, the more actions in the cell. Numbers are the actions’ places in the table below.',
    'pt-BR': 'A cor marca a zona; quanto mais forte, mais ações na célula. Os números são as posições das ações na tabela abaixo.',
  },
  'asm.heat.start': { en: 'Start with the quick wins: {count} actions ({ranks}).', 'pt-BR': 'Comece pelos ganhos rápidos: {count} ações ({ranks}).' },

  'help.whatsNew.i78': {
    en: '3.4.5 — the Coverage page, clearer: the summary in one grid (the radar beside what is going well and what to work on, each line marked by what it is); the maturity journey as a rising staircase after Dynatrace’s maturity model, each step with its line, its criteria met and distinct marks for met, to work on and not read; and the impact × effort heat map redrawn with zones, what to do in each, the first actions by title and where to start.',
    'pt-BR': '3.4.5 — a página Cobertura mais claro: o resumo numa grade só (o radar ao lado do que está indo bem e do que trabalhar, cada linha marcada pelo que é); a jornada de maturidade como uma escada que sobe, segundo o modelo de maturidade da Dynatrace, cada etapa com a sua frase, os critérios atendidos e marcas diferentes para atendido, a trabalhar e sem leitura; e o mapa de calor impacto × esforço redesenhado com zonas, o que fazer em cada uma, as primeiras ações pelo título e por onde começar.',
  },
} satisfies Record<string, Entry>;
