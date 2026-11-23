import { type Entry } from './locales';

/** PoC Value Studio 3.3.10 — the Evidence stage on the chart engine (lot 1). Merged in `strings.ts`. */

export const v3310Strings = {
  'cockpit.svc.latency.title': { en: 'Slowest of the busiest services', 'pt-BR': 'Os mais lentos entre os serviços mais movimentados' },
  'cockpit.svc.latency.line': { en: '{value} review line', 'pt-BR': 'Linha de revisão de {value}' },
  'cockpit.k8s.restarts.title': { en: 'Workloads that restart most', 'pt-BR': 'Cargas que mais reiniciam' },
  'cockpit.k8s.restarts.line': { en: '{count} restarts: worth a look', 'pt-BR': '{count} reinícios: merece atenção' },
  'cockpit.k8s.restarts.topOf': { en: 'top {shown} of the {listed} listed', 'pt-BR': 'top {shown} das {listed} listadas' },
  'cockpit.k8s.restarts.topOfTotal': {
    en: 'top {shown} of the {listed} listed · {total} restarting',
    'pt-BR': 'top {shown} das {listed} listadas · {total} com reinícios',
  },
  'help.whatsNew.i61': {
    en: '3.3.10 — The Evidence stage on the chart engine: Services ranks the slowest of the busiest services against the response-time line; Kubernetes ranks the workloads that restart most against the restart line and shows its estate on one line; and on Services, Infrastructure, Kubernetes and Logs the Dynatrace Assist sits beside the page’s main chart.',
    'pt-BR': '3.3.10 — A etapa Evidências no motor gráfico: Serviços mostra os mais lentos entre os mais movimentados contra a linha de tempo de resposta; Kubernetes mostra as cargas que mais reiniciam contra a linha de reinícios e o inventário em uma linha; e em Serviços, Infraestrutura, Kubernetes e Logs o Dynatrace Assist fica ao lado do gráfico principal da página.',
  },
} satisfies Record<string, Entry>;
