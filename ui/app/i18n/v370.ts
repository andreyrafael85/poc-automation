import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.0 (the owner: "seguir com a ação customizada na próxima release"): the PoC triage workflow
 * action — the texts of its summary (read by the action itself, `features/triage/triage.ts`, so this fragment is imported
 * there on its own), its form and the PoC Builder's triage workflow that uses it. Merged in `strings.ts`.
 */

export const v370Strings = {
  // ------------------------------------------------------------------ the action's summary (e-mail)
  'triage.head': { en: '## {id} · {name}', 'pt-BR': '## {id} · {name}' },
  'triage.gist': { en: '{state} · root cause {root} · {count} entities reached', 'pt-BR': '{state} · causa raiz {root} · {count} entidades atingidas' },
  'triage.state.open': { en: '● Open', 'pt-BR': '● Aberto' },
  'triage.state.closed': { en: '○ Closed', 'pt-BR': '○ Fechado' },
  'triage.f.field': { en: 'Field', 'pt-BR': 'Campo' },
  'triage.f.value': { en: 'Value', 'pt-BR': 'Valor' },
  'triage.f.category': { en: 'Category', 'pt-BR': 'Categoria' },
  'triage.f.status': { en: 'Status', 'pt-BR': 'Situação' },
  'triage.f.began': { en: 'Began', 'pt-BR': 'Início' },
  'triage.f.lasted': { en: 'Lasted', 'pt-BR': 'Durou' },
  'triage.f.openFor': { en: 'Open for', 'pt-BR': 'Aberto há' },
  'triage.f.root': { en: 'Root cause', 'pt-BR': 'Causa raiz' },
  'triage.f.reach': { en: 'Reach', 'pt-BR': 'Alcance' },
  'triage.f.reachOne': { en: '1 entity', 'pt-BR': '1 entidade' },
  'triage.f.reachMany': { en: '{count} entities', 'pt-BR': '{count} entidades' },
  'triage.f.k8s': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'triage.l.count': { en: 'Records', 'pt-BR': 'Registros' },
  'triage.l.signature': { en: 'Message', 'pt-BR': 'Mensagem' },
  'triage.c.caller': { en: 'Caller', 'pt-BR': 'Quem chama' },
  'triage.c.failures': { en: 'Failures', 'pt-BR': 'Falhas' },
  'triage.c.requests': { en: 'Requests', 'pt-BR': 'Requisições' },
  'triage.sec.root': { en: '### Root cause', 'pt-BR': '### Causa raiz' },
  'triage.sec.reach': { en: '### Reach — {count} entities', 'pt-BR': '### Alcance — {count} entidades' },
  'triage.sec.logs': { en: '### Logs around the incident', 'pt-BR': '### Logs em torno do incidente' },
  'triage.sec.callers': { en: '### Who calls {root}', 'pt-BR': '### Quem chama {root}' },
  'triage.sec.links': { en: '### Links', 'pt-BR': '### Links' },
  'triage.sec.reachOne': { en: '### Reach — 1 entity', 'pt-BR': '### Alcance — 1 entidade' },
  'triage.root': { en: 'Root cause named by Dynatrace Intelligence: {root}.', 'pt-BR': 'Causa raiz apontada pela Dynatrace Intelligence: {root}.' },
  'triage.noRoot': {
    en: 'Dynatrace Intelligence has not named a root cause yet; the affected entities below are where to look first.',
    'pt-BR': 'A Dynatrace Intelligence ainda não apontou a causa raiz; as entidades atingidas abaixo são por onde começar.',
  },
  'triage.more': { en: 'and {more} more', 'pt-BR': 'e mais {more}' },
  'triage.logs': {
    en: '{total} error and warning records, {errors} of them errors. The most frequent:',
    'pt-BR': '{total} registros de erro e aviso, {errors} deles erros. Os mais frequentes:',
  },
  'triage.logsNone': {
    en: 'No error or warning log from the incident’s entities around it — the signal is in the metrics and traces.',
    'pt-BR': 'Nenhum log de erro ou aviso das entidades do incidente em torno dele — o sinal está nas métricas e nos traces.',
  },
  'triage.caller': { en: '{name}: {failures} failures of {requests} requests', 'pt-BR': '{name}: {failures} falhas de {requests} requisições' },
  'triage.openProblem': { en: '[Open the problem in Dynatrace]({link})', 'pt-BR': '[Abrir o problema no Dynatrace]({link})' },
  'triage.openApp': { en: '[Open the full analysis in PoC Automation]({link})', 'pt-BR': '[Abrir a análise completa no PoC Automation]({link})' },
  'triage.footer': { en: '_Read by the PoC triage action of PoC Automation 3.0 with this workflow’s own permissions; every figure comes from Grail._', 'pt-BR': '_Lido pela ação de triagem do PoC Automation 3.0 com as permissões deste workflow; todo número vem do Grail._' },
  'triage.subject': { en: '{id} — {name} · {root}', 'pt-BR': '{id} — {name} · {root}' },
  'triage.subjectNoRoot': { en: 'root cause not named yet', 'pt-BR': 'causa raiz ainda não apontada' },
  'triage.subjectMissing': { en: 'PoC triage — problem not read', 'pt-BR': 'Triagem da PoC — problema não lido' },
  'triage.invalidId': {
    en: 'The triage was handed “{id}”, which is not a problem event id; the workflow’s trigger should pass {{ event()["event.id"] }}.',
    'pt-BR': 'A triagem recebeu “{id}”, que não é um event id de problema; o gatilho do workflow deve passar {{ event()["event.id"] }}.',
  },
  'triage.notFound': {
    en: 'No record of problem {id} in the last 24 hours on this environment.',
    'pt-BR': 'Nenhum registro do problema {id} nas últimas 24 horas neste ambiente.',
  },
  'catalog.purpose.triage.problem': {
    en: 'The problem a workflow hands to the PoC triage action (its event id from the trigger): name, category, status, root cause, affected and related entities and the Kubernetes context, as the RCA page reads them — the latest record of it.',
    'pt-BR':
      'O problema que um workflow entrega à ação de triagem da PoC (o event id vindo do gatilho): nome, categoria, status, causa ' +
      'raiz, entidades atingidas e relacionadas e o contexto Kubernetes, como a página de RCA os lê — o registro mais recente.',
  },
  'builder.wf.triageTask': {
    en: 'PoC Automation · Triage: the problem, its logs and who calls its root cause',
    'pt-BR': 'PoC Automation · Triage: o problema, os logs e quem chama a causa raiz',
  },
  'help.whatsNew.i112': {
    en: '3.7.0 — The app now acts inside Workflows. A workflow action of its own, PoC Automation · Triage, reads a problem the moment it opens — its root cause, the error and warning logs around the incident and the services that call the root cause — with the workflow’s own permissions, and hands the e-mail a ready summary with the links. The PoC Builder’s triage workflow uses it; anyone can add it to their own workflows.',
    'pt-BR': '3.7.0 — O app agora age dentro do Workflows. Uma ação de workflow própria, PoC Automation · Triage, lê um problema assim que ele abre — a causa raiz, os logs de erro e aviso em torno do incidente e os serviços que chamam a causa raiz — com as permissões do próprio workflow, e entrega ao e-mail um resumo pronto com os links. O workflow de triagem do PoC Builder usa a ação; qualquer um pode usá-la nos seus workflows.',
  },
  'timeframe.caller.triage': { en: 'the last 24 hours', 'pt-BR': 'as últimas 24 horas' },
} satisfies Record<string, Entry>;
