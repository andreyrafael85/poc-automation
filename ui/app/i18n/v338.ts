import { type Entry } from './locales';

/** PoC Value Studio 3.3.8 — measured splits under the Overview headlines, the compact stack map and the lighthouse pages. Merged in `strings.ts`. */

export const v338Strings = {
  'cc.meter.entities': { en: 'The estate by layer', 'pt-BR': 'O ambiente por camada' },
  'cc.meter.services': { en: 'Services by failure band', 'pt-BR': 'Serviços por faixa de falha' },
  'cc.meter.services.above': { en: 'Above the 1 % line', 'pt-BR': 'Acima da linha de 1 %' },
  'cc.meter.services.failing': { en: 'With failures, under 1 %', 'pt-BR': 'Com falhas, abaixo de 1 %' },
  'cc.meter.services.clean': { en: 'Without failures', 'pt-BR': 'Sem falhas' },
  'cc.meter.services.caption': {
    en: '{above} above 1 % · {failing} with failures · {clean} without',
    'pt-BR': '{above} acima de 1 % · {failing} com falhas · {clean} sem falhas',
  },
  'cc.meter.closed': { en: 'Problems closed and still open', 'pt-BR': 'Problemas encerrados e ainda abertos' },
  'cc.meter.closed.caption': { en: '{pct} of {total} problems closed', 'pt-BR': '{pct} de {total} problemas encerrados' },
  'cc.meter.frontend': { en: 'Front-end errors by app', 'pt-BR': 'Erros de front-end por aplicação' },
  'cc.meter.frontend.caption': { en: '{app}: {pct} of the errors', 'pt-BR': '{app}: {pct} dos erros' },
  'cockpit.obj.title': { en: 'PoC objectives × measured', 'pt-BR': 'Objetivos da PoC × medido' },
  'cockpit.obj.count': { en: '{met} of {total} met', 'pt-BR': '{met} de {total} atingidos' },
  'cockpit.obj.caption': {
    en: 'Each objective of the PoC plan, judged live by the same query and rule as its page; the ones still open first. Objectives the team assesses carry the team’s verdict.',
    'pt-BR': 'Cada objetivo do plano da PoC, avaliado ao vivo pela mesma consulta e regra da página dele; os que ainda estão em aberto primeiro. Os objetivos avaliados pelo time trazem o veredito do time.',
  },
  'cockpit.obj.objective': { en: 'Objective', 'pt-BR': 'Objetivo' },
  'cockpit.obj.measure': { en: 'Measured by', 'pt-BR': 'Medido por' },
  'cockpit.obj.target': { en: 'Target', 'pt-BR': 'Meta' },
  'cockpit.obj.manual': { en: 'The team’s assessment', 'pt-BR': 'Avaliação do time' },
  'cockpit.rca.line': { en: 'PoC criterion: ≤ {target}', 'pt-BR': 'Critério da PoC: ≤ {target}' },
  'roi.mttrDaily.title': { en: 'Time to resolve, day by day in the PoC', 'pt-BR': 'Tempo de resolução, dia a dia na PoC' },
  'roi.mttrDaily.caption': {
    en: 'The mean time to resolve of the problems closed each day since the PoC began; a day with none closed is a gap. Dashed: the PoC criterion and, when given, the SE’s estimate of the time before Dynatrace — lines to read against, never data.',
    'pt-BR': 'O tempo médio de resolução dos problemas encerrados em cada dia desde o início da PoC; um dia sem encerramento é uma lacuna. Tracejado: o critério da PoC e, quando informado, a estimativa do SE para o tempo antes do Dynatrace — linhas de leitura, nunca dados.',
  },
  'roi.mttrDaily.criterion': { en: 'PoC criterion: ≤ {target}', 'pt-BR': 'Critério da PoC: ≤ {target}' },
  'roi.mttrDaily.before': { en: 'Before Dynatrace (SE estimate): {value}', 'pt-BR': 'Antes do Dynatrace (estimativa do SE): {value}' },
  'help.whatsNew.i59': {
    en: '3.3.8 — Every Overview headline carries a measured graphic (the line where a series exists, a measured split where it does not); a compact stack map; the Executive summary opens on the PoC objectives × measured; Root cause reads time to close against the PoC criterion; Value & ROI shows the daily time to resolve against the criterion and the “before” estimate.',
    'pt-BR': '3.3.8 — Todo indicador da Visão geral traz um gráfico medido (a linha onde há série, uma divisão medida onde não há); o mapa da stack ficou compacto; o Resumo executivo abre com os objetivos da PoC × medido; a Causa raiz lê o tempo de encerramento contra o critério da PoC; Valor & ROI mostra o tempo de resolução dia a dia contra o critério e a estimativa de "antes".',
  },
} satisfies Record<string, Entry>;
