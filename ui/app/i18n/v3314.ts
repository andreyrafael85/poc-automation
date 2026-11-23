import { type Entry } from './locales';

/** PoC Value Studio 3.3.14 — ring + ranking on more pages (the owner's pick from Automation). Merged in `strings.ts`. */

export const v3314Strings = {
  'ringrank.k8s.label': { en: 'Workloads without restarts', 'pt-BR': 'Cargas sem reinício' },
  'ringrank.k8s.caption': { en: 'of {count} workloads in the estate', 'pt-BR': 'de {count} cargas no ambiente' },
  'ringrank.k8s.aria': { en: 'Share of workloads that did not restart in the window', 'pt-BR': 'Parcela das cargas que não reiniciaram na janela' },
  'ringrank.k8s.calc': {
    en: 'Workloads in the estate (k8s.inventory) minus the workloads that restarted (k8s.restarts.total), over the workloads in the estate.',
    'pt-BR': 'Cargas no ambiente (k8s.inventory) menos as cargas que reiniciaram (k8s.restarts.total), sobre as cargas no ambiente.',
  },
  'ringrank.infra.title': { en: 'Hosts at or near their ceiling', 'pt-BR': 'Hosts no teto ou perto dele' },
  'ringrank.infra.label': { en: 'Hosts below {line}% at peak', 'pt-BR': 'Hosts abaixo de {line}% no pico' },
  'ringrank.infra.caption': { en: 'of {count} hosts with a capacity reading', 'pt-BR': 'de {count} hosts com leitura de capacidade' },
  'ringrank.infra.aria': { en: 'Share of measured hosts below {line}% of CPU and memory at peak', 'pt-BR': 'Parcela dos hosts medidos abaixo de {line}% de CPU e memória no pico' },
  'ringrank.infra.calc': {
    en: 'Hosts whose higher peak of CPU and memory stays below {line}% (well sized or with room to reclaim), over every host with a capacity reading — from infra.capacity.summary.',
    'pt-BR': 'Hosts cujo maior pico de CPU e memória fica abaixo de {line}% (bem dimensionados ou com folga para recuperar), sobre todos os hosts com leitura de capacidade — de infra.capacity.summary.',
  },
  'ringrank.infra.topOf': { en: 'Highest peak first · top {shown} of {total} hosts at {line}% or more', 'pt-BR': 'Maior pico primeiro · top {shown} de {total} hosts a partir de {line}%' },
  'ringrank.infra.rowMem': { en: '{pct}% of memory at peak', 'pt-BR': '{pct}% de memória no pico' },
  'ringrank.infra.rowCpu': { en: '{pct}% of CPU at peak', 'pt-BR': '{pct}% de CPU no pico' },
  'ringrank.infra.none': { en: 'Every measured host stays below {line}% at peak.', 'pt-BR': 'Todos os hosts medidos ficam abaixo de {line}% no pico.' },
  'ringrank.dx.label': { en: 'Requests without a front-end error', 'pt-BR': 'Requisições sem erro de front-end' },
  'ringrank.dx.caption': { en: 'of {count} front-end requests', 'pt-BR': 'de {count} requisições de front-end' },
  'ringrank.dx.aria': { en: 'Share of front-end requests without an error', 'pt-BR': 'Parcela das requisições de front-end sem erro' },
  'ringrank.dx.calc': { en: '100% minus the measured front-end error rate across every application.', 'pt-BR': '100% menos a taxa de erro de front-end medida em todas as aplicações.' },
  'ringrank.crit.label': { en: 'Criteria met', 'pt-BR': 'Critérios atingidos' },
  'ringrank.crit.caption': { en: '{pct}% of the PoC’s success criteria', 'pt-BR': '{pct}% dos critérios de sucesso da PoC' },
  'ringrank.crit.aria': { en: '{met} of {total} success criteria met', 'pt-BR': '{met} de {total} critérios de sucesso atingidos' },
  'help.whatsNew.i65': {
    en: '3.3.14 — Ring + ranking, the Automation panel on more pages: Kubernetes (workloads without restarts beside the ones that restart most), Infrastructure (hosts below 75% at peak beside the hosts at or near their ceiling), Digital experience (requests without a front-end error beside the errors by application) and the PoC timeline (criteria met beside the criteria). Every ring is a ratio of measured counts.',
    'pt-BR': '3.3.14 — Anel + ranking, o painel da Automação em mais páginas: Kubernetes (cargas sem reinício ao lado das que mais reiniciam), Infraestrutura (hosts abaixo de 75% no pico ao lado dos hosts no teto ou perto dele), Experiência digital (requisições sem erro de front-end ao lado dos erros por aplicação) e a Linha do tempo da PoC (critérios atingidos ao lado dos critérios). Todo anel é uma razão entre contagens medidas.',
  },
} satisfies Record<string, Entry>;
