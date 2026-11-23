import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.7 — the maturity journey rebuilt on four pillars with positive wording and rings, and
 * Platform adoption over time (owner's review of 3.4.6, 2026-11-18). Merged in `strings.ts`.
 */

export const v347Strings = {
  // ---------------------------------------------------------------- maturity: pillars and reading
  'asm.mat.p.visibility': { en: 'Visibility', 'pt-BR': 'Visibilidade' },
  'asm.mat.p.context': { en: 'Context', 'pt-BR': 'Contexto' },
  'asm.mat.p.experience': { en: 'Experience & business', 'pt-BR': 'Experiência e negócio' },
  'asm.mat.p.operations': { en: 'AI & automation', 'pt-BR': 'IA e automação' },
  'asm.mat.pillars': { en: 'The four pillars of the journey', 'pt-BR': 'Os quatro pilares da jornada' },
  'asm.mat.pillarLevel': { en: 'step {level}, {name}', 'pt-BR': 'etapa {level}, {name}' },
  'asm.mat.inPlace': {
    en: 'Already in place with Dynatrace: {met} of the {total} criteria of the journey.',
    'pt-BR': 'Já em prática com a Dynatrace: {met} dos {total} critérios da jornada.',
  },
  'asm.mat.rings.aria': {
    en: 'Maturity rings: step {level}, {name}; one ring per pillar, closed at step 5',
    'pt-BR': 'Anéis de maturidade: etapa {level}, {name}; um anel por pilar, fechado na etapa 5',
  },
  'asm.mat.spectrum': { en: 'The five steps of the journey', 'pt-BR': 'As cinco etapas da jornada' },

  // ---------------------------------------------------------------- maturity: the sixteen criteria
  'asm.mat.c.visibility2': { en: 'Hosts and services with traffic observed', 'pt-BR': 'Hosts e serviços com tráfego observados' },
  'asm.mat.c.context2': { en: 'Logs reaching the platform', 'pt-BR': 'Logs chegando à plataforma' },
  'asm.mat.c.experience2': { en: 'Web applications or synthetic checks in view', 'pt-BR': 'Aplicações web ou verificações sintéticas visíveis' },
  'asm.mat.c.operations2': { en: 'Problems detected automatically by Dynatrace Intelligence', 'pt-BR': 'Problemas detectados automaticamente pela Dynatrace Intelligence' },
  'asm.mat.c.visibility3': {
    en: 'Full-stack on at least {fs}% of hosts and a coverage index of {index} or more',
    'pt-BR': 'Full-stack em pelo menos {fs}% dos hosts e índice de cobertura a partir de {index}',
  },
  'asm.mat.c.context3': {
    en: 'At least {ctx}% of logs with service context, on one platform (no other monitoring tool running)',
    'pt-BR': 'Pelo menos {ctx}% dos logs com contexto de serviço, numa plataforma única (sem outra ferramenta de monitoramento em execução)',
  },
  'asm.mat.c.experience3': { en: 'Real users monitored (RUM)', 'pt-BR': 'Usuários reais monitorados (RUM)' },
  'asm.mat.c.operations3': { en: 'Problems resolved in {h} h or less on average', 'pt-BR': 'Problemas resolvidos em até {h} h, em média' },
  'asm.mat.c.visibility4': {
    en: 'Full-stack on at least {fs}% of hosts and every Kubernetes cluster reporting',
    'pt-BR': 'Full-stack em pelo menos {fs}% dos hosts e todos os clusters Kubernetes reportando',
  },
  'asm.mat.c.context4': {
    en: 'At least {ctx}% of logs with context and {own}% of services with an owner',
    'pt-BR': 'Pelo menos {ctx}% dos logs com contexto e {own}% dos serviços com responsável',
  },
  'asm.mat.c.experience4': {
    en: 'Real users on at least {rum}% of web apps, and synthetic checks running',
    'pt-BR': 'Usuários reais em pelo menos {rum}% das aplicações web e verificações sintéticas ativas',
  },
  'asm.mat.c.operations4': { en: 'Workflows running and succeeding, and runtime security in view', 'pt-BR': 'Workflows rodando com sucesso e segurança em runtime visível' },
  'asm.mat.c.visibility5': {
    en: 'Full-stack on at least {fs}% of hosts and a coverage index of {index} or more',
    'pt-BR': 'Full-stack em pelo menos {fs}% dos hosts e índice de cobertura a partir de {index}',
  },
  'asm.mat.c.context5': {
    en: 'At least {ctx}% of logs with context and {own}% of services with an owner',
    'pt-BR': 'Pelo menos {ctx}% dos logs com contexto e {own}% dos serviços com responsável',
  },
  'asm.mat.c.experience5': {
    en: 'Real users on at least {rum}% of web apps, and business events captured',
    'pt-BR': 'Usuários reais em pelo menos {rum}% das aplicações web e eventos de negócio capturados',
  },
  'asm.mat.c.operations5': {
    en: 'Problems resolved in {h} h or less, at least {wf} workflows succeeding, and no vulnerability in the act-now queue',
    'pt-BR': 'Problemas resolvidos em até {h} h, pelo menos {wf} workflows com sucesso e nenhuma vulnerabilidade na fila de agir agora',
  },

  // ---------------------------------------------------------------- maturity: the assumptions
  'assumption.group.maturity': { en: 'Maturity journey (four pillars)', 'pt-BR': 'Jornada de maturidade (quatro pilares)' },
  'assumption.maturity.fullStack.proficient': { en: 'Proficient: hosts in full-stack, at least', 'pt-BR': 'Proficiente: hosts em full-stack, pelo menos' },
  'assumption.maturity.fullStack.proficient.basis': { en: 'With a coverage index from the “good” line.', 'pt-BR': 'Com o índice de cobertura a partir da linha “boa”.' },
  'assumption.maturity.fullStack.strategic': { en: 'Strategic: hosts in full-stack, at least', 'pt-BR': 'Estratégico: hosts em full-stack, pelo menos' },
  'assumption.maturity.fullStack.strategic.basis': { en: 'With every Kubernetes cluster reporting.', 'pt-BR': 'Com todos os clusters Kubernetes reportando.' },
  'assumption.maturity.fullStack.visionary': { en: 'Visionary: hosts in full-stack, at least', 'pt-BR': 'Visionário: hosts em full-stack, pelo menos' },
  'assumption.maturity.fullStack.visionary.basis': { en: 'With a coverage index from the “excellent” line.', 'pt-BR': 'Com o índice de cobertura a partir da linha “excelente”.' },
  'assumption.maturity.logContext.strategic': { en: 'Strategic: logs with service context, at least', 'pt-BR': 'Estratégico: logs com contexto de serviço, pelo menos' },
  'assumption.maturity.logContext.strategic.basis': { en: 'Proficient uses the findings’ “low” line.', 'pt-BR': 'O Proficiente usa a linha “baixa” dos achados.' },
  'assumption.maturity.logContext.visionary': { en: 'Visionary: logs with service context, at least', 'pt-BR': 'Visionário: logs com contexto de serviço, pelo menos' },
  'assumption.maturity.logContext.visionary.basis': { en: 'Context pillar.', 'pt-BR': 'Pilar de contexto.' },
  'assumption.maturity.ownership.visionary': { en: 'Visionary: services with an owner, at least', 'pt-BR': 'Visionário: serviços com responsável, pelo menos' },
  'assumption.maturity.ownership.visionary.basis': { en: 'Strategic uses the Coverage page’s ownership line.', 'pt-BR': 'O Estratégico usa a linha de responsáveis da página Cobertura.' },
  'assumption.maturity.rum.strategic': { en: 'Strategic: web apps with real users, at least', 'pt-BR': 'Estratégico: aplicações web com usuários reais, pelo menos' },
  'assumption.maturity.rum.strategic.basis': { en: 'With synthetic checks running.', 'pt-BR': 'Com verificações sintéticas ativas.' },
  'assumption.maturity.rum.visionary': { en: 'Visionary: web apps with real users, at least', 'pt-BR': 'Visionário: aplicações web com usuários reais, pelo menos' },
  'assumption.maturity.rum.visionary.basis': { en: 'With business events captured.', 'pt-BR': 'Com eventos de negócio capturados.' },
  'assumption.maturity.automation.visionary': { en: 'Visionary: workflows succeeding, at least', 'pt-BR': 'Visionário: workflows com sucesso, pelo menos' },
  'assumption.maturity.automation.visionary.basis': {
    en: 'Distinct workflows run in the window, with the success line of the Coverage page.',
    'pt-BR': 'Workflows distintos executados no período, com a linha de sucesso da página Cobertura.',
  },

  // ---------------------------------------------------------------- adoption over time
  'adopt.trend.title': { en: 'Use over time', 'pt-BR': 'Uso ao longo do tempo' },
  'adopt.trend.caption': {
    en: 'Distinct users and browser actions for each day of the window (UTC days), the busiest day marked and weekends shaded. A day without activity counts as zero.',
    'pt-BR': 'Usuários distintos e ações no navegador em cada dia do período (dias em UTC), com o dia de pico marcado e os fins de semana sombreados. Um dia sem atividade conta como zero.',
  },
  'adopt.trend.users': { en: 'Active users per day', 'pt-BR': 'Usuários ativos por dia' },
  'adopt.trend.actions': { en: 'Actions per day', 'pt-BR': 'Ações por dia' },
  'adopt.trend.peak': { en: 'Peak: {value} on {day}', 'pt-BR': 'Pico: {value} em {day}' },
  'adopt.trend.stat.peak': { en: 'Busiest day', 'pt-BR': 'Dia de pico' },
  'adopt.trend.stat.peakValue': { en: '{day}: {actions} actions by {users} users', 'pt-BR': '{day}: {actions} ações de {users} usuários' },
  'adopt.trend.stat.active': { en: 'Days with activity', 'pt-BR': 'Dias com atividade' },
  'adopt.trend.stat.activeValue': { en: '{active} of {days}', 'pt-BR': '{active} de {days}' },
  'adopt.trend.stat.rhythm': { en: 'Weekdays × weekends', 'pt-BR': 'Dias úteis × fins de semana' },
  'adopt.trend.stat.rhythmValue': { en: '{weekday} × {weekend} actions a day on average', 'pt-BR': '{weekday} × {weekend} ações por dia, em média' },
  'adopt.hours.title': { en: 'When people use the platform', 'pt-BR': 'Quando as pessoas usam a plataforma' },
  'adopt.hours.caption': {
    en: 'Browser actions by weekday and hour over the window, in your time zone ({tz}).',
    'pt-BR': 'Ações no navegador por dia da semana e hora no período, no seu fuso horário ({tz}).',
  },
  'adopt.hours.cell': { en: '{count} actions — {weekday}, {hour}:00', 'pt-BR': '{count} ações — {weekday}, {hour}h' },
  'adopt.hours.less': { en: 'less', 'pt-BR': 'menos' },
  'adopt.hours.more': { en: 'more', 'pt-BR': 'mais' },
  'adopt.hours.peak': {
    en: 'Busiest hour: {weekday} at {hour}:00 ({count} actions). Within working hours (Monday to Friday, 08:00–18:59): {pct}% of the actions.',
    'pt-BR': 'Horário de pico: {weekday} às {hour}h ({count} ações). Dentro do horário comercial (segunda a sexta, 08:00–18:59): {pct}% das ações.',
  },
  'adopt.area.title': { en: 'Areas of the platform in use', 'pt-BR': 'Áreas da plataforma em uso' },
  'adopt.area.caption': {
    en: 'Actions by area, summed over every app opened. Distinct users do not add up across apps, so each area shows at least the users of its most used app.',
    'pt-BR': 'Ações por área, somadas sobre todos os apps abertos. Usuários distintos não se somam entre apps, então cada área mostra pelo menos os usuários do seu app mais usado.',
  },
  'adopt.area.value': { en: '{actions} actions · {apps} apps · ≥ {users} users', 'pt-BR': '{actions} ações · {apps} apps · ≥ {users} usuários' },
  'adopt.area.analytics': { en: 'Dashboards & analysis', 'pt-BR': 'Dashboards e análise' },
  'adopt.area.infrastructure': { en: 'Infrastructure & cloud', 'pt-BR': 'Infraestrutura e nuvem' },
  'adopt.area.applications': { en: 'Applications & services', 'pt-BR': 'Aplicações e serviços' },
  'adopt.area.logs': { en: 'Logs', 'pt-BR': 'Logs' },
  'adopt.area.experience': { en: 'Digital experience', 'pt-BR': 'Experiência digital' },
  'adopt.area.ai': { en: 'Dynatrace Intelligence', 'pt-BR': 'Dynatrace Intelligence' },
  'adopt.area.automation': { en: 'Automation & reliability', 'pt-BR': 'Automação e confiabilidade' },
  'adopt.area.security': { en: 'Security', 'pt-BR': 'Segurança' },
  'adopt.area.platform': { en: 'Platform & administration', 'pt-BR': 'Plataforma e administração' },
  'adopt.area.other': { en: 'Other Dynatrace apps', 'pt-BR': 'Outros apps Dynatrace' },
  'adopt.area.custom': { en: 'Custom apps', 'pt-BR': 'Apps próprios' },
  'catalog.purpose.adopt.platform.trend': {
    en: 'Distinct browser users and their actions for each day of the window, so the page draws how use rises and falls over time and names the busiest day. A day without a row had no browser activity. Counted only; no user is named.',
    'pt-BR': 'Usuários distintos no navegador e suas ações em cada dia do período, para a página desenhar como o uso sobe e desce ao longo do tempo e apontar o dia de pico. Um dia sem linha não teve atividade no navegador. Somente contagens; nenhum usuário é nomeado.',
  },
  'catalog.purpose.adopt.platform.hours': {
    en: "Browser actions for each hour of the window, so the page shows on which weekdays and at which hours the platform is used, folded into the viewer's own time zone. At most one row per hour. Counted only; no user is named.",
    'pt-BR': 'Ações no navegador em cada hora do período, para a página mostrar em que dias da semana e horários a plataforma é usada, no fuso de quem lê. No máximo uma linha por hora. Somente contagens; nenhum usuário é nomeado.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i80': {
    en: '3.4.7 — the maturity journey rebuilt: four pillars (visibility, context, experience and business, AI and automation) advance together, with higher lines at every step, so reaching Visionary takes time; activity-style rings and a spectrum of the five steps show where the environment stands, in positive words with the next steps with Dynatrace. Platform adoption gains use over time (users and actions per day, the peak marked), when people use the platform (weekday × hour) and the areas of the platform in use.',
    'pt-BR': '3.4.7 — a jornada de maturidade refeita: quatro pilares (visibilidade, contexto, experiência e negócio, IA e automação) avançam juntos, com linhas mais altas a cada etapa, para que chegar ao Visionário leve tempo; anéis no estilo de atividade e um espectro das cinco etapas mostram onde o ambiente está, em palavras positivas e com os próximos passos com a Dynatrace. A Adoção da plataforma ganha o uso ao longo do tempo (usuários e ações por dia, com o pico marcado), quando as pessoas usam a plataforma (dia da semana × hora) e as áreas da plataforma em uso.',
  },
} satisfies Record<string, Entry>;
