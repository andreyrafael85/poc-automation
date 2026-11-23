import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2.7 — strings of the v3.2.6 validation round (deep links to the platform's own
 * app pages, the competitor overlap in red, the Executive summary's value chain, problem hours as
 * count × duration, Licensing tabs, and the deck built from real Dynatrace screenshots).
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v327Strings = {
  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i37': {
    en: '3.2.7 — A new Report SE tab, "Wrapup deck test — real prints": the app plans which Dynatrace screen proves each point, the capture companion takes the real screens in a browser the SE signed in to, and each print gets a pinned "how to read this screen" legend and an analytic reading of the same entity and window, with the DQL that ran.',
    'pt-BR': '3.2.7 — Uma aba nova no Report SE, “Teste Deck Wrapup Print”: o app planeja qual tela do Dynatrace prova cada ponto, o capturador tira as telas reais num navegador em que o SE entrou, e cada print ganha a legenda “como ler esta tela” com pinos e uma leitura analítica da mesma entidade e janela, com a DQL que rodou.',
  },
  'help.whatsNew.i38': {
    en: '3.2.7 — Root-cause trail boxes open the right Dynatrace page: a service in the Services app, a frontend on its Experience Vitals page, and a database root cause through the service that failed most calling it, listed with its callers. No box opens the home page any more.',
    'pt-BR': '3.2.7 — As caixas da trilha de causa raiz abrem a página certa do Dynatrace: o serviço no app Services, o frontend na sua página do Experience Vitals e um banco causa raiz pelo serviço que mais falhou ao chamá-lo, listado com os seus chamadores. Nenhuma caixa abre mais a página inicial.',
  },
  'help.whatsNew.i39': {
    en: '3.2.7 — The Executive summary shows "the incident that shows the value" in place of the cloud estate; problem hours read as problems × mean time to resolve per category; the competitor side of the overlap is in soft red; Licensing tabs run DPS, Classic, Cost projection, and the money stays in the projection.',
    'pt-BR': '3.2.7 — O Resumo executivo mostra “o incidente que mostra o valor” no lugar do parque em nuvem; as horas de problema viram problemas × tempo médio de resolução por categoria; o lado dos concorrentes no overlap fica em vermelho suave; as abas de Licenciamento seguem DPS, Classic, Projeção de custo, e o dinheiro fica só na projeção.',
  },
  'help.whatsNew.i40': {
    en: '3.2.7 — Tech Wrapup deck: on a slide with a capture of the app, the three figures beside the picture take the section\'s short values first (counts, durations) and leave the long ones (an incident id, a service name, already named in the pin legend) for last, and each figure is sized to read whole in its tile (a slide may show fewer, wider tiles instead of a cut value). Which figures a capture slide shows can therefore differ from 3.2.6; the slides without captures are unchanged.',
    'pt-BR': '3.2.7 — Deck Tech Wrapup: num slide com captura do app, os três números ao lado da imagem levam primeiro os valores curtos da seção (contagens, durações) e deixam por último os longos (um id de incidente, o nome de um serviço, já citados na legenda dos pinos), e cada número ganha o tamanho que cabe inteiro no seu bloco (o slide pode mostrar menos blocos, mais largos, em vez de um valor cortado). Por isso os números de um slide de captura podem diferir da 3.2.6; os slides sem captura não mudaram.',
  },
  // ------------------------------------------------------------------ Deep links into the platform
  'catalog.purpose.rum.frontend.ids': {
    en:
      'The Experience Vitals id (FRONTEND-…) of each web application Dynatrace Intelligence reports by its classic id (APPLICATION-…), ' +
      'read from the dimensions of the frontend request metric, so a frontend opens straight on its own page in the ' +
      'platform. Problems never carry the FRONTEND id.',
    'pt-BR':
      'O id do Experience Vitals (FRONTEND-…) de cada aplicação web que a Dynatrace Intelligence informa pelo id clássico ' +
      '(APPLICATION-…), lido das dimensões da métrica de requisições do frontend, para o frontend abrir direto na ' +
      'sua página na plataforma. Os problemas nunca trazem o id FRONTEND.',
  },
  'p.rca.kind.database': { en: 'Database', 'pt-BR': 'Banco de dados' },
  // 3.2.7 review UX-M4: the unit of a busy service on the frontend's flow map when "req. · …" does not fit its node.
  'p.dx3.flow.failShort': { en: '· {pct}% failed', 'pt-BR': '· {pct}% falhas' },
  'p.rca.trail.rootViaAria': {
    en: 'Root cause: {name} (database). Opens {caller}, the service that failed most calling it',
    'pt-BR': 'Causa raiz: {name} (banco de dados). Abre {caller}, o serviço que mais falhou ao chamá-lo',
  },
  'p.rca.trail.legend.database': {
    en: 'The database has no page of its own in the Services app: its box opens {caller}, the service that failed most calling it, where the database calls are listed',
    'pt-BR': 'O banco não tem página própria no app Services: a caixa dele abre {caller}, o serviço que mais falhou ao chamá-lo, onde as chamadas ao banco aparecem',
  },
  'p.rca.trail.callers': { en: 'Who calls {name} (failures during the incident)', 'pt-BR': 'Quem chama {name} (falhas durante o incidente)' },
  'p.rca.trail.callerFailures': { en: '{count} failures', 'pt-BR': '{count} falhas' },
  // ------------------------------------------------------------------ Licensing
  'p.lic.dps.pricedElsewhere': {
    en: 'Usage only. The same rows at the public list price are on the "Cost projection" tab, with the rate card switched on.',
    'pt-BR': 'Só uso. As mesmas linhas ao preço de lista público estão na aba “Projeção de custo”, com a tabela de preços ligada.',
  },
  'p.lic.proj.dpsTitle': { en: 'The DPS sizing at the public list price', 'pt-BR': 'O sizing do DPS ao preço de lista público' },
  'p.lic.proj.dpsBody': {
    en: 'The estimated annual usage of the DPS tab, priced per capability: a list-price estimate, never a quote.',
    'pt-BR': 'O uso anual estimado da aba DPS, com preço por capacidade: uma estimativa de lista, nunca uma cotação.',
  },
  'p.lic.proj.consTitle': { en: 'The billed consumption, projected', 'pt-BR': 'O consumo faturado, projetado' },

  // ------------------------------------------------------------------ Executive summary: the incident that shows the value
  'exec3.spot.eyebrow': { en: 'In the spotlight · {id}', 'pt-BR': 'Em destaque · {id}' },
  'exec3.spot.title': { en: 'The incident that shows the value', 'pt-BR': 'O incidente que mostra o valor' },
  'exec3.spot.lead': {
    en: 'Dynatrace Intelligence caught "{name}", named {root} as the root cause by itself and mapped {count} affected entities — no alerting rule written, no war room.',
    'pt-BR': 'A Dynatrace Intelligence detectou “{name}”, apontou {root} como causa raiz sozinha e mapeou {count} entidades afetadas — sem regra de alerta escrita, sem sala de guerra.',
  },
  'exec3.spot.leadNoRoot': {
    en: 'Dynatrace Intelligence caught "{name}" and mapped {count} affected entities — no alerting rule written.',
    'pt-BR': 'A Dynatrace Intelligence detectou “{name}” e mapeou {count} entidades afetadas — sem regra de alerta escrita.',
  },
  // 3.2.7 final review P1: a CUSTOM_ALERT problem is raised by an alerting rule someone wrote, so its
  // lead keeps what Dynatrace Intelligence did by itself and drops the "no alerting rule written" clause.
  'exec3.spot.leadCustom': {
    en: 'A custom alert raised "{name}"; Dynatrace Intelligence named {root} as the root cause by itself and mapped {count} affected entities — no war room.',
    'pt-BR': 'Um alerta personalizado abriu “{name}”; a Dynatrace Intelligence apontou {root} como causa raiz sozinha e mapeou {count} entidades afetadas — sem sala de guerra.',
  },
  'exec3.spot.leadCustomNoRoot': {
    en: 'A custom alert raised "{name}" and Dynatrace Intelligence mapped {count} affected entities by itself.',
    'pt-BR': 'Um alerta personalizado abriu “{name}” e a Dynatrace Intelligence mapeou sozinha {count} entidades afetadas.',
  },
  'exec3.spot.lasted': { en: 'It lasted', 'pt-BR': 'Durou' },
  'exec3.spot.openFor': { en: 'Open for', 'pt-BR': 'Aberto há' },
  'exec3.spot.root': { en: 'Root cause, named by Dynatrace Intelligence', 'pt-BR': 'Causa raiz, apontada pela Dynatrace Intelligence' },
  'exec3.spot.reach': { en: 'Reach', 'pt-BR': 'Alcance' },
  'exec3.spot.entities': { en: 'entities', 'pt-BR': 'entidades' },
  'exec3.spot.open': { en: 'See the full analysis', 'pt-BR': 'Ver a análise completa' },

  // ------------------------------------------------------------------ problem hours, explained
  'roi4.next.hoursBody': {
    en: '{category} took {share} of the problem hours ({hours}): it leads the ranking above, with the action it calls for.',
    'pt-BR': 'A categoria {category} consumiu {share} das horas de problema ({hours}): lidera o ranking acima, com a ação que pede.',
  },
  'roi4.hours.total': {
    en: '{hours} of problem time across {problems} closed problems — each row: how many problems × how long each stayed open.',
    'pt-BR': '{hours} de problema em {problems} problemas encerrados — cada linha: quantos problemas × quanto tempo cada um ficou aberto.',
  },
  'roi4.hours.share': { en: '{share} of the total', 'pt-BR': '{share} do total' },
  // "≈", not "=": the mean is printed rounded (2 decimals), so its product with the count lands
  // within rounding of the measured total, never exactly on it (REG-1, lab tenant: 1,703 × 7.91 h).
  'roi4.hours.math': {
    en: '{problems} problems × {mttr} on average ≈ {hours}',
    'pt-BR': '{problems} problemas × {mttr} em média ≈ {hours}',
  },
  'roi4.hours.noMath': { en: 'Count or average not read for this category.', 'pt-BR': 'Contagem ou média não lida para esta categoria.' },
} as const satisfies Record<string, Entry>;
