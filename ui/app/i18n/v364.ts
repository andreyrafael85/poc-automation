import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.4 (the owner's choice on 2026-11-22: the presentation mode, the status rows, the log
 * console and the harness debt): the discreet presentation mode and Coverage's depth map, the status rows of Dynatrace
 * Intelligence, the most recent log errors as a console. Merged in `strings.ts`.
 */

export const v364Strings = {
  'catalog.purpose.prob.status.rows': {
    en: 'Problems by category and the 3-hour slot each began in, with how many of them are still open — the status rows of Dynatrace Intelligence, one bar per slot. One row per problem (duplicates and repeated records left out).',
    'pt-BR': 'Os problemas por categoria e pela faixa de 3 horas em que cada um começou, com quantos seguem abertos — as linhas de status da Dynatrace Intelligence, uma barra por faixa. Uma linha por problema (sem duplicados nem registros repetidos).',
  },
  'catalog.purpose.log.errors.recent': {
    en: 'The most recent error records of every readable bucket in the last 30 minutes, as console lines: when, where they came from (service, workload, host or bucket) and the start of the message. A list; the total comes from log.quality.',
    'pt-BR': 'Os registros de erro mais recentes de todos os buckets legíveis nos últimos 30 minutos, como linhas de console: quando, de onde vieram (serviço, workload, host ou bucket) e o começo da mensagem. Uma lista; o total vem de log.quality.',
  },
  'v6.status.title': { en: 'Status by category', 'pt-BR': 'Status por categoria' },
  'v6.status.subtitle': {
    en: 'One row per problem category, one bar per {hours}-hour slot of the last 7 days — taller when more problems began then.',
    'pt-BR': 'Uma linha por categoria de problema, uma barra por faixa de {hours} horas dos últimos 7 dias — mais alta quando mais problemas começaram ali.',
  },
  'v6.status.rowLabel': {
    en: '{name}: {count} problems began in the last 7 days, {open} still open',
    'pt-BR': '{name}: {count} problemas começaram nos últimos 7 dias, {open} ainda abertos',
  },
  'v6.status.open': { en: '{count} open', 'pt-BR': '{count} abertos' },
  'v6.status.allClosed': { en: 'All closed', 'pt-BR': 'Todos fechados' },
  'v6.status.caption': {
    en: 'From prob.status.rows: every problem of the window counted once, by the slot it began in.',
    'pt-BR': 'De prob.status.rows: cada problema da janela contado uma vez, pela faixa em que começou.',
  },
  'v6.status.captionBefore': {
    en: 'From prob.status.rows: every problem of the window counted once, by the slot it began in. {count} still open began before the window — counted as open, not drawn.',
    'pt-BR': 'De prob.status.rows: cada problema da janela contado uma vez, pela faixa em que começou. {count} ainda abertos começaram antes da janela — contados como abertos, sem barra.',
  },
  'v6.logconsole.title': { en: 'Most recent log errors', 'pt-BR': 'Erros de log mais recentes' },
  'v6.logconsole.level': { en: 'ERROR', 'pt-BR': 'ERRO' },
  'v6.logconsole.none': {
    en: 'No error record in the last 30 minutes.',
    'pt-BR': 'Nenhum registro de erro nos últimos 30 minutos.',
  },
  'v6.logconsole.caption': {
    en: 'The {shown} most recent error records of the last 30 minutes (log.errors.recent) — a list, not a count.',
    'pt-BR': 'Os {shown} registros de erro mais recentes dos últimos 30 minutos (log.errors.recent) — uma lista, não uma contagem.',
  },
  'v6.logconsole.captionTotal': {
    en: 'The {shown} most recent of {total} error records in the last 30 minutes (the list from log.errors.recent, the total from log.quality).',
    'pt-BR': 'Os {shown} mais recentes de {total} registros de erro nos últimos 30 minutos (a lista de log.errors.recent, o total de log.quality).',
  },
  'present.start': { en: 'Present', 'pt-BR': 'Apresentar' },
  'present.label': { en: 'Presentation', 'pt-BR': 'Apresentação' },
  'present.now': { en: 'Now:', 'pt-BR': 'Agora:' },
  'present.step': { en: '{n} of {of}', 'pt-BR': '{n} de {of}' },
  'present.previous': { en: 'Previous panel', 'pt-BR': 'Painel anterior' },
  'present.next': { en: 'Next panel', 'pt-BR': 'Próximo painel' },
  'present.exit': { en: 'Exit', 'pt-BR': 'Sair' },
  'present.keys': { en: '← → move · Esc exits', 'pt-BR': '← → navegar · Esc sai' },
  'asm.tab.depth': { en: 'Depth map', 'pt-BR': 'Mapa de profundidade' },
  'asm.depth.title': { en: 'The depth of the coverage, host by host', 'pt-BR': 'A profundidade da cobertura, host a host' },
  'asm.depth.lead': {
    en: 'Each square is a host, grouped by where it runs and coloured by how deep Dynatrace sees it: {full} of {total} hosts in Full-Stack, {infra} in Infrastructure — the next step of the conversation.',
    'pt-BR': 'Cada quadrado é um host, agrupado por onde roda e colorido pela profundidade com que a Dynatrace o enxerga: {full} de {total} hosts em Full-Stack, {infra} em Infraestrutura — o próximo passo da conversa.',
  },
  'asm.depth.mode.fullStack': { en: 'Full-Stack', 'pt-BR': 'Full-Stack' },
  'asm.depth.mode.infra': { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
  'asm.depth.mode.discovery': { en: 'Discovery', 'pt-BR': 'Discovery' },
  'asm.depth.mode.unknown': { en: 'Mode not reported', 'pt-BR': 'Modo não informado' },
  'asm.depth.delivers.fullStack': {
    en: 'code, services, traces and the user experience they serve',
    'pt-BR': 'código, serviços, traces e a experiência que eles entregam',
  },
  'asm.depth.delivers.infra': {
    en: 'the host and its processes; one step from the code',
    'pt-BR': 'o host e seus processos; a um passo do código',
  },
  'asm.depth.delivers.discovery': {
    en: 'the host is seen, with its processes and connections',
    'pt-BR': 'o host já é visto, com seus processos e conexões',
  },
  'asm.depth.delivers.unknown': {
    en: 'the platform did not report a mode — not the same as unmonitored',
    'pt-BR': 'a plataforma não informou o modo — o que é diferente de não monitorado',
  },
  'asm.depth.noCloud': { en: 'No cloud reported', 'pt-BR': 'Sem nuvem informada' },
  'asm.depth.hosts': { en: '{count} hosts', 'pt-BR': '{count} hosts' },
  'asm.depth.caption': {
    en: 'From cov.hosts.breakdown: every host counted by cloud and monitoring mode (an aggregate, nothing left out).',
    'pt-BR': 'De cov.hosts.breakdown: cada host contado por nuvem e modo de monitoramento (um agregado, nada fica de fora).',
  },
  'asm.depth.scaled': {
    en: 'From cov.hosts.breakdown: every host counted by cloud and monitoring mode; each square stands for up to {per} hosts.',
    'pt-BR': 'De cov.hosts.breakdown: cada host contado por nuvem e modo de monitoramento; cada quadrado vale até {per} hosts.',
  },
  'asm.depth.none': { en: 'No host was read in this window.', 'pt-BR': 'Nenhum host foi lido nesta janela.' },
  'help.whatsNew.i106': {
    en: '3.6.4 — Present from the app, and three new reads. "Present" in the header turns on a discreet presentation mode: the panel under discussion stands out, the others fade, and a thin bar at the bottom names it and moves with ← → (Esc exits) — the page stays the page. Coverage gains a "Depth map" tab: every host as a square, grouped by where it runs and coloured by its monitoring mode. Dynatrace Intelligence shows the status by category, one bar per 3-hour slot of the week; Logs shows its most recent errors as console lines.',
    'pt-BR': '3.6.4 — Apresentar pelo app, e três leituras novas. "Apresentar", no cabeçalho, liga um modo apresentação discreto: o painel em discussão fica em destaque, os outros esmaecem, e uma barra fina embaixo diz qual é e avança com ← → (Esc sai) — a página continua sendo a página. A Cobertura ganha a guia "Mapa de profundidade": cada host um quadrado, agrupado por onde roda e colorido pelo modo de monitoramento. A Dynatrace Intelligence mostra o status por categoria, uma barra por faixa de 3 horas da semana; Logs mostra os erros mais recentes como linhas de console.',
  },
} satisfies Record<string, Entry>;
