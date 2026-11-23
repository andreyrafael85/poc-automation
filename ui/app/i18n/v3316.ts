import { type Entry } from './locales';

/** PoC Value Studio 3.3.16 — the Tech Wrapup only with the new graphics, each slide opening on what its picture reads. Merged in `strings.ts`. */

export const v3316Strings = {
  'cap.pin.arrivals.peak': { en: 'Busiest 6 hours: {value} problems began', 'pt-BR': 'Pior bloco de 6 horas: {value} problemas começaram' },
  'cap.pin.slowAbove': { en: '{count} of these {shown} average above {line}', 'pt-BR': '{count} destes {shown} ficam acima de {line} em média' },
  'cap.pin.restartsAbove': { en: '{count} of these {shown} restarted more than {line} times', 'pt-BR': '{count} destas {shown} reiniciaram mais de {line} vezes' },
  'cap.pin.slowNone': { en: 'None of these {shown} averages above {line}', 'pt-BR': 'Nenhum destes {shown} fica acima de {line} em média' },
  'cap.pin.restartsNone': { en: 'None of these {shown} restarted more than {line} times', 'pt-BR': 'Nenhuma destas {shown} reiniciou mais de {line} vezes' },
  'cap.pin.dx.within': { en: '{count} of {total} applications under the 1% error line', 'pt-BR': '{count} de {total} aplicações abaixo da linha de 1% de erro' },
  'tw.lead.problems': {
    en: 'The {category} category accounts for {share} of the {total} problems Dynatrace Intelligence detected in 7 days.',
    'pt-BR': 'A categoria {category} responde por {share} dos {total} problemas que a Dynatrace Intelligence detectou em 7 dias.',
  },
  'tw.lead.problemsMean': {
    en: 'The {category} category accounts for {share} of the {total} problems Dynatrace Intelligence detected in 7 days — {mean} began every 6 hours on average.',
    'pt-BR': 'A categoria {category} responde por {share} dos {total} problemas que a Dynatrace Intelligence detectou em 7 dias — em média, {mean} começaram a cada 6 horas.',
  },
  'tw.lead.infra': {
    en: '{pct} of the {hosts} measured hosts stay below {line}% of CPU and memory at peak; {atRisk} are at or near their ceiling and named on this slide.',
    'pt-BR': '{pct} dos {hosts} hosts medidos ficam abaixo de {line}% de CPU e memória no pico; {atRisk} estão no teto ou perto dele e aparecem neste slide.',
  },
  'tw.lead.infraAll': {
    en: 'Every one of the {hosts} measured hosts stays below {line}% of CPU and memory at peak.',
    'pt-BR': 'Todos os {hosts} hosts medidos ficam abaixo de {line}% de CPU e memória no pico.',
  },
  'tw.lead.k8s': {
    en: '{pct} of the {workloads} workloads did not restart in the window; {restarting} did, each one named by Dynatrace with its cluster.',
    'pt-BR': '{pct} das {workloads} cargas não reiniciaram na janela; {restarting} reiniciaram, cada uma identificada pelo Dynatrace com o seu cluster.',
  },
  'tw.lead.k8sAbove': {
    en: '{pct} of the {workloads} workloads did not restart in the window; of the {restarting} that did, {above} passed {line} restarts — the place to start.',
    'pt-BR': '{pct} das {workloads} cargas não reiniciaram na janela; das {restarting} que reiniciaram, {above} passaram de {line} reinícios — por onde começar.',
  },
  'tw.lead.svc': {
    en: 'Among the {listed} busiest services, {name} is the slowest at {ms} ms on average, and {above} average above the {line} review line.',
    'pt-BR': 'Entre os {listed} serviços mais movimentados, {name} é o mais lento, com {ms} ms em média, e {above} ficam acima da linha de revisão de {line}.',
  },
  'tw.lead.svcNone': {
    en: 'Among the {listed} busiest services, every one averages under the {line} review line; {name} is the slowest at {ms} ms.',
    'pt-BR': 'Entre os {listed} serviços mais movimentados, todos ficam abaixo da linha de revisão de {line} em média; {name} é o mais lento, com {ms} ms.',
  },
  'tw.lead.dx': {
    en: '{pct} of the {requests} front-end requests completed without an error; the highest error rate, {rate}, is on {name}.',
    'pt-BR': '{pct} das {requests} requisições de front-end terminaram sem erro; a maior taxa de erro, {rate}, está em {name}.',
  },
  'help.whatsNew.i67': {
    en: '3.3.16 — The Tech Wrapup uses only the new graphics: Problems opens on when problems begin with the mean of the window; Infrastructure, Kubernetes, Services and Digital experience on their ring + ranking and line panels, each with three pins that read it in numbers; and each of these slides opens on a measured sentence that says what its picture shows.',
    'pt-BR': '3.3.16 — O Tech Wrapup usa somente os gráficos novos: Problemas abre com quando os problemas começam e a média da janela; Infraestrutura, Kubernetes, Serviços e Experiência digital com seus painéis de anel + ranking e de linha, cada um com três pinos que o leem em números; e cada um desses slides abre com uma frase medida que diz o que a imagem mostra.',
  },
} satisfies Record<string, Entry>;
