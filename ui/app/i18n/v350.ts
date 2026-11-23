import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.0: the Strato-native line, wave 2 (the Evidence pages on the platform's charts),
 * and Settings → Prerequisites as a guide written for the customer (the owner's validation of 3.4.18). Merged in
 * `strings.ts`.
 */

export const v350Strings = {
  // Prerequisites — the PDF speaks to the customer's teams (the screen's intro stays the SE's and the partner's).
  'prq.pdf.intro': {
    en: 'This guide lists what your teams prepare before the Dynatrace proof of concept starts: your Dynatrace environment, the network and the firewall, an ActiveGate when you need one, OneAgent on your hosts, Real User Monitoring for your web applications, and access. Each line links to the Dynatrace documentation page it comes from — that page is always the reference, as the product evolves.',
    'pt-BR': 'Este guia lista o que os seus times preparam antes de a prova de conceito da Dynatrace começar: o seu ambiente Dynatrace, a rede e o firewall, um ActiveGate quando for preciso, o OneAgent nos seus servidores, o Real User Monitoring das suas aplicações web e os acessos. Cada linha leva à página da documentação da Dynatrace de onde veio — essa página é sempre a referência, já que o produto evolui.',
  },
  'prq.pdf.when': {
    en: 'Start one or two weeks before the kick-off: firewall changes and restart windows usually take that long to schedule. Your Dynatrace contact is glad to go through any line with your teams.',
    'pt-BR': 'Comece de uma a duas semanas antes do kick-off: mudanças de firewall e janelas de reinício costumam levar esse tempo para agendar. O seu contato na Dynatrace pode repassar qualquer linha com os seus times.',
  },
  'prq.diagram.clusterSub': { en: 'your environment', 'pt-BR': 'o seu ambiente' },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i92': {
    en: '3.5.0 — The Evidence pages on the platform’s own charts, and the same anatomy everywhere: every page’s summary band is now a row of the platform’s SingleValue cards, every ring is the platform’s GaugeChart (no gradient, no glow), the request, capacity, restart, log and execution trends of Services, Infrastructure, Kubernetes, Logs and Automation are TimeseriesCharts with zoom and tooltip, and the slowest services, the restarting workloads and the resolution times are CategoricalBarCharts against their review lines. On paper the numbers print as text. Settings → Prerequisites now speaks to the customer’s own teams, opens its PDF with an introduction of its own, and draws a larger connectivity map with every label inside its box.',
    'pt-BR': '3.5.0 — As páginas de Evidência nos gráficos da própria plataforma, e a mesma anatomia em todo lugar: a faixa de resumo de cada página virou uma fileira de cartões SingleValue da plataforma, cada anel é o GaugeChart da plataforma (sem degradê, sem brilho), as tendências de requisições, capacidade, reinícios, logs e execuções de Serviços, Infraestrutura, Kubernetes, Logs e Automação são TimeseriesCharts com zoom e dica, e os serviços mais lentos, os workloads que reiniciam e os tempos de resolução são CategoricalBarCharts diante das suas linhas de revisão. No papel, os números saem como texto. Configurações → Pré-requisitos fala agora com os próprios times do cliente, abre o PDF com uma introdução própria e desenha um mapa de conectividade maior, com cada rótulo dentro do seu quadro.',
  },
} satisfies Record<string, Entry>;
