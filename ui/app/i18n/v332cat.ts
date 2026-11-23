import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.2 — TD-08: the RCA trail's callers, the incident's own logs and the evidence
 * queries of the real-prints deck became parameterised catalog entries
 * (`queries/catalogTemplates.ts`). Their purposes (the English text equals the entry's `purpose`,
 * `tests/catalogPurposes.test.ts`), the two caller-window labels and the advisor's line about them.
 * Merged in `strings.ts`; `tests/i18n.test.ts` checks that no fragment silently overrides a key
 * defined by another.
 */

export const v332CatStrings = {
  // ------------------------------------------------------------------ windows set by the reading screen
  'timeframe.caller.incident': { en: 'the incident’s own window', 'pt-BR': 'a janela do próprio incidente' },
  'timeframe.caller.evidence': {
    en: 'the window of the screenshot or incident it explains',
    'pt-BR': 'a janela da captura de tela ou do incidente que ela explica',
  },
  'f.advisor.find.timeframeCaller': {
    en: 'Set by the screen that reads it ({label}), at most {hours} h; a longer window is refused, never run.',
    'pt-BR': 'Definida pela tela que a lê ({label}), com até {hours} h; só uma janela dentro desse limite é enviada.',
  },
  'f.advisor.rec.timeframeCaller': {
    en: 'No change needed. Any id it needs is a typed parameter, validated and quoted before it reaches the query, and only valid values produce a query.',
    'pt-BR': 'Nenhuma mudança necessária. Cada id que ela usa é um parâmetro tipado, validado e entre aspas antes de chegar à consulta, e só valores válidos geram uma consulta.',
  },

  // ------------------------------------------------------------------ purposes (catalog.purpose.<id>)
  'catalog.purpose.rca.callers': {
    en: "The callers of an incident's root-cause service with their requests and failures over the incident's own window, so a database root cause opens the caller that failed most. Also the evidence of the root-cause screenshot (B3).",
    'pt-BR':
      'Os chamadores do serviço causa raiz de um incidente, com requisições e falhas na janela do próprio incidente, para uma causa raiz de banco de dados abrir o chamador que mais falhou. Também é a evidência da captura da causa raiz (B3).',
  },
  'catalog.purpose.rca.incident.logs': {
    en: "The selected incident's own error and warning logs, scoped to its affected and related entities over its padded window, summarised by message signature with one exact totals row. Used when no affected entity is a service.",
    'pt-BR':
      'Os logs de erro e de alerta do próprio incidente selecionado, nas entidades afetadas e relacionadas, na janela com margem, resumidos por assinatura de mensagem com uma linha de totais exatos. Usada quando as entidades afetadas são de outros tipos que não serviço.',
  },
  'catalog.purpose.rca.incident.logs.services': {
    en: "The selected incident's own error and warning logs, scoped to its affected and related entities and to the process groups of its affected services, over its padded window, summarised by message signature with one exact totals row.",
    'pt-BR':
      'Os logs de erro e de alerta do próprio incidente selecionado, nas entidades afetadas e relacionadas e nos grupos de processos dos serviços afetados, na janela com margem, resumidos por assinatura de mensagem com uma linha de totais exatos.',
  },
  'catalog.purpose.ev.problem.events': {
    en: 'The Dynatrace Intelligence events grouped in one problem, then the problem row itself (users, event count, impact, status), read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Os eventos da Dynatrace Intelligence agrupados num problema e, em seguida, a linha do próprio problema (usuários, número de eventos, impacto, status), lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.problem.recurrence': {
    en: "The root causes with most problems, this root's own problems with their median and p90 duration, and the totals of the window, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.",
    'pt-BR':
      'As causas raiz com mais problemas, os problemas desta causa raiz com a duração mediana e p90, e os totais da janela, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.service.minutes': {
    en: 'Requests, failures and p90 response time per minute of up to six services, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Requisições, falhas e tempo de resposta p90 por minuto de até seis serviços, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.service.endpoints': {
    en: 'Requests, failures and failure rate per endpoint of one service, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Requisições, falhas e taxa de falha por endpoint de um serviço, lidas na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.service.screen': {
    en: 'The numbers the service page shows: endpoints by median response time and one totals row, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Os números que a página do serviço mostra: endpoints pelo tempo de resposta mediano e uma linha de totais, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.frontend.summary': {
    en: 'Core Web Vitals, errors, users and sessions of the real users of one frontend, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Core Web Vitals, erros, usuários e sessões dos usuários reais de um frontend, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.frontend.minutes': {
    en: 'Real-user requests and errors per minute of one frontend, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Requisições e erros de usuários reais por minuto de um frontend, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.k8s.capacity': {
    en: 'CPU and memory used, requested and limited against what the nodes can allocate, for one Kubernetes cluster, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'CPU e memória em uso, reservadas e com limite, frente ao que os nós podem alocar, de um cluster Kubernetes, lidas na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.k8s.workloads': {
    en: 'Use against request per workload of one Kubernetes cluster, the largest memory reservations first, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Uso frente à reserva por workload de um cluster Kubernetes, com as maiores reservas de memória primeiro, lido na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.k8s.churn': {
    en: 'Container restarts per workload of one Kubernetes cluster, out-of-memory kills beside them, and the restart total, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Reinícios de contêineres por workload de um cluster Kubernetes, com os encerramentos por falta de memória ao lado e o total de reinícios, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.k8s.incidentRestarts': {
    en: 'Container restarts per minute and workload of one Kubernetes cluster during the incident, with the first restarting minute, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Reinícios de contêineres por minuto e workload de um cluster Kubernetes durante o incidente, com o primeiro minuto de reinício, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.failing.services': {
    en: "The services with most failures in excess of the environment rate, and the screenshot's own service as a tagged row, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.",
    'pt-BR':
      'Os serviços com mais falhas acima da taxa do ambiente, e o serviço da própria captura de tela como linha marcada, lidos na mesma entidade e janela da captura, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.failing.endpoints': {
    en: 'Failures, failure rate and latency per endpoint of the failing service, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Falhas, taxa de falha e latência por endpoint do serviço em destaque, lidas na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.entity.events': {
    en: 'The Dynatrace Intelligence events on one entity, as their source or among the affected, counted by category with the latest start, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Os eventos da Dynatrace Intelligence de uma entidade, como origem ou entre as afetadas, contados por categoria com o início mais recente, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.failed.endpoints': {
    en: "The endpoints with most failed requests in the screenshot's window, and the request and failure totals, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.",
    'pt-BR':
      'Os endpoints com mais requisições com falha na janela da captura de tela, e os totais de requisições e de falhas, lidos na mesma entidade e janela da captura, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.logs.errors': {
    en: 'The most frequent ERROR log signatures with digits folded, where they come from, and the ERROR total, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'As assinaturas de log ERROR mais frequentes, com os dígitos agrupados, de onde vêm e o total de ERROR, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.topology.blast': {
    en: 'The services up to two hops above the root cause and the frontends at the top, counted by id, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Os serviços até dois saltos acima da causa raiz e os frontends no topo, contados por id, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.topology.hubs': {
    en: 'The services with most connections in the entity model, and the totals of the model, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.',
    'pt-BR':
      'Os serviços com mais conexões no modelo de entidades, e os totais do modelo, lidos na mesma entidade e janela da captura de tela, para o slide de análise dela no deck de prints reais.',
  },
  'catalog.purpose.ev.host.cpu': {
    en: "The hosts with the highest CPU peak, the screenshot's own host as a tagged row, and the fleet median, read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.",
    'pt-BR':
      'Os hosts com o maior pico de CPU, o host da própria captura de tela como linha marcada e a mediana do parque, lidos na mesma entidade e janela da captura, para o slide de análise dela no deck de prints reais.',
  },
} as const satisfies Record<string, Entry>;
