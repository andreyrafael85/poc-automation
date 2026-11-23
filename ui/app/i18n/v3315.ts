import { type Entry } from './locales';

/** PoC Value Studio 3.3.15 — the chart engine reaches the Tech Wrapup captures. Merged in `strings.ts`. */

export const v3315Strings = {
  'cap.opt.svc.slowest': { en: 'Slowest of the busiest services, against the response-time line', 'pt-BR': 'Os mais lentos entre os serviços mais movimentados, contra a linha de tempo de resposta' },
  'cap.opt.k8s.stable': { en: 'Workloads without restarts, beside the ones that restart most', 'pt-BR': 'Cargas sem reinício, ao lado das que mais reiniciam' },
  'cap.opt.infra.ceiling': { en: 'Hosts below 75% at peak, beside the ones at their ceiling', 'pt-BR': 'Hosts abaixo de 75% no pico, ao lado dos que estão no teto' },
  'cap.opt.dx.errors': { en: 'Requests without a front-end error, beside the errors by application', 'pt-BR': 'Requisições sem erro de front-end, ao lado dos erros por aplicação' },
  'cap.opt.problems.mix': { en: 'Problems by category', 'pt-BR': 'Problemas por categoria' },
  'cap.pin.slowest': { en: 'Slowest: {name} — {value} on average', 'pt-BR': 'Mais lento: {name} — {value} em média' },
  'cap.pin.restarts': { en: 'Most restarts: {name} — {value}', 'pt-BR': 'Mais reinícios: {name} — {value}' },
  'cap.pin.dx.worst': { en: 'Highest error rate: {name} — {value}', 'pt-BR': 'Maior taxa de erro: {name} — {value}' },
  'cap.pin.mix.total': { en: '{value} problems in 7 days', 'pt-BR': '{value} problemas em 7 dias' },
  'cap.pin.mix.top': { en: '{name}: {value} problems ({share} of all)', 'pt-BR': '{name}: {value} problemas ({share} do total)' },
  'help.whatsNew.i66': {
    en: '3.3.15 — The chart engine reaches the Tech Wrapup: its captures can now photograph the slowest services against the response-time line, workloads without restarts, hosts at their ceiling, requests without front-end errors and problems by category — the very panels the pages draw — and these open Services, Kubernetes, Infrastructure and Digital experience by default.',
    'pt-BR': '3.3.15 — O motor gráfico chega ao Tech Wrapup: as capturas agora podem fotografar os serviços mais lentos contra a linha de tempo de resposta, as cargas sem reinício, os hosts no teto, as requisições sem erro de front-end e os problemas por categoria — os mesmos painéis que as páginas desenham — e eles abrem Serviços, Kubernetes, Infraestrutura e Experiência digital por padrão.',
  },
} satisfies Record<string, Entry>;
