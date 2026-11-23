import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.2 — the Tech Wrapup's captures of the app.
 *
 * The labels the SE picks a section's panels by (`CAPTURE_REGISTRY`), the pins of the new panels
 * (cloud, technologies, executive), the readiness strip before the download and the choice of up to
 * two panels per section. Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment
 * silently overrides a key defined by another.
 */

export const v332CapsStrings = {
  // ------------------------------------------------------------------ the panels, by section
  'cap.opt.problems.arrivals': { en: 'When problems begin, every 6 hours, with the mean of the window', 'pt-BR': 'Quando os problemas começam, a cada 6 horas, com a média da janela' },
  'cap.opt.rca.trail': { en: 'Root-cause trail', 'pt-BR': 'Trilha da causa raiz' },
  'cap.opt.infra.cpu': { en: 'Host CPU over time', 'pt-BR': 'CPU dos hosts ao longo do tempo' },
  'cap.opt.infra.memory': { en: 'Host memory over time', 'pt-BR': 'Memória dos hosts ao longo do tempo' },
  'cap.opt.cloud.hosts': { en: 'Hosts per cloud provider', 'pt-BR': 'Hosts por provedor de nuvem' },
  'cap.opt.cloud.services': { en: 'Cloud services per provider', 'pt-BR': 'Serviços de nuvem por provedor' },
  'cap.opt.k8s.restarts': { en: 'Container restarts over time', 'pt-BR': 'Reinícios de contêiner ao longo do tempo' },
  'cap.opt.k8s.oom': { en: 'Out-of-memory kills over time', 'pt-BR': 'Encerramentos por falta de memória ao longo do tempo' },
  'cap.opt.svc.failureRate': { en: 'Service failure rate over time', 'pt-BR': 'Taxa de falhas dos serviços ao longo do tempo' },
  'cap.opt.svc.responseTime': { en: 'Service response time over time', 'pt-BR': 'Tempo de resposta dos serviços ao longo do tempo' },
  'cap.opt.tech.bars': { en: 'Busiest technologies', 'pt-BR': 'Tecnologias com mais instâncias' },
  'cap.opt.tech.chips': { en: 'Technologies at a glance', 'pt-BR': 'Tecnologias num relance' },
  'cap.opt.logs.ingest': { en: 'Log ingest over time', 'pt-BR': 'Ingestão de logs ao longo do tempo' },
  'cap.opt.security.posture': { en: 'Vulnerabilities and severity mix', 'pt-BR': 'Vulnerabilidades e mix de severidade' },
  'cap.opt.experience.vitals': { en: 'Core Web Vitals dials', 'pt-BR': 'Mostradores de Core Web Vitals' },
  'cap.opt.competitor.consolidation': { en: 'Tools today → one platform', 'pt-BR': 'Ferramentas hoje → uma plataforma' },
  'cap.opt.overview.stack': { en: 'Stack map of the estate', 'pt-BR': 'Mapa da pilha do ambiente' },
  'cap.opt.exec.mttr': { en: 'Time to resolve per category', 'pt-BR': 'Tempo de resolução por categoria' },
  'cap.opt.exec.rings': { en: 'Coverage, problems closed and healthy services', 'pt-BR': 'Cobertura, problemas encerrados e serviços saudáveis' },
  'cap.opt.roi.chain': { en: 'Value chain', 'pt-BR': 'Cadeia de valor' },

  // ------------------------------------------------------------------ pins of the new panels
  'cap.pin.bar': { en: 'Largest: {name} — {value}', 'pt-BR': 'Maior: {name} — {value}' },
  'cap.pin.exec.slowest': { en: 'Longest to resolve: {name} — {value}', 'pt-BR': 'Resolução mais longa: {name} — {value}' },
  'cap.pin.cloud.total': { en: '{value} hosts in the cloud', 'pt-BR': '{value} hosts na nuvem' },
  'cap.pin.cloud.provider': { en: '{name}: {value} hosts ({share} of all)', 'pt-BR': '{name}: {value} hosts ({share} do total)' },
  'cap.pin.tech.top': { en: 'Most instances: {name} ({value})', 'pt-BR': 'Mais instâncias: {name} ({value})' },
  'cap.value.hours': { en: '{value} h', 'pt-BR': '{value} h' },

  // ------------------------------------------------------------------ readiness before the download
  'deck.ready.title': { en: 'Captures on the slides', 'pt-BR': 'Capturas nos slides' },
  'deck.ready.summary': { en: '{done} of {total} sections ready', 'pt-BR': '{done} de {total} seções prontas' },
  'deck.ready.persisted': {
    en: 'Kept in this browser tab, also across a reload, for up to 24 hours. Nothing leaves the browser.',
    'pt-BR': 'Guardadas nesta aba do navegador, inclusive ao recarregar, por até 24 horas. Nada sai do navegador.',
  },
  'deck.ready.memoryOnly': {
    en: 'Kept while the app stays open in this tab.',
    'pt-BR': 'Guardadas enquanto o app estiver aberto nesta aba.',
  },
  'deck.ready.status.captured': { en: 'On the slides · captured at {time}', 'pt-BR': 'Nos slides · capturada às {time}' },
  'deck.ready.status.stale': {
    en: 'From another read (captured at {time}) — capture again to bring it to this read',
    'pt-BR': 'De outra leitura (capturada às {time}) — capture de novo para trazê-la para esta leitura',
  },
  'deck.ready.status.missing': { en: 'Ready to capture', 'pt-BR': 'Pronta para capturar' },
  'deck.ready.status.noData': {
    en: 'No picture in this read yet — try again; meanwhile the slide shows the drawn chart with the same figures',
    'pt-BR': 'Ainda sem imagem nesta leitura — tente de novo; enquanto isso, o slide mostra o gráfico desenhado com os mesmos números',
  },
  'deck.ready.captureSection': { en: 'Capture', 'pt-BR': 'Capturar' },
  'deck.ready.captureMissing': { en: 'Capture what is missing ({count})', 'pt-BR': 'Capturar o que falta ({count})' },
  'deck.ready.allSet': {
    en: 'Every included section has its captures for this read.',
    'pt-BR': 'Todas as seções incluídas têm suas capturas desta leitura.',
  },

  // ------------------------------------------------------------------ choice of panels
  'deck.choice.title': { en: 'Panels per section', 'pt-BR': 'Painéis por seção' },
  'deck.choice.body': {
    en: 'Pick one or two panels of the app for each section (each section keeps at least one); the first one is the default. Your choice is kept with your private settings.',
    'pt-BR': 'Escolha um ou dois painéis do app para cada seção (cada seção mantém ao menos um); o primeiro é o padrão. Sua escolha fica guardada nas suas configurações privadas.',
  },
  'deck.choice.aria': { en: 'Panels for {section}', 'pt-BR': 'Painéis de {section}' },
} satisfies Record<string, Entry>;
