import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.9 (the owner: "Seguir com a 3.6.9 com suas recomendações"): on the PoC Builder, the
 * SLO kit, the problem-triage workflow kit and the clean-up at the end of the PoC. Merged in `strings.ts`.
 */

export const v369Strings = {
  'builder.tab.automation': { en: 'SLOs and workflow', 'pt-BR': 'SLOs e workflow' },
  'builder.auto.busy': { en: 'Working on the environment…', 'pt-BR': 'Trabalhando no ambiente…' },
  'builder.auto.result': { en: 'Done: {ok} · not done: {failed}', 'pt-BR': 'Feito: {ok} · não feito: {failed}' },
  'builder.auto.failed.forbidden': {
    en: 'The environment refused it: your user or the app may need this permission here. Nothing else changed.',
    'pt-BR': 'O ambiente recusou: seu usuário ou o app pode precisar dessa permissão aqui. Nada mais mudou.',
  },
  'builder.auto.failed.conflict': {
    en: 'Something with the same name or version is already there; open it on the environment.',
    'pt-BR': 'Já existe algo com o mesmo nome ou versão; abra no ambiente.',
  },
  'builder.auto.failed.error': {
    en: 'The environment did not answer as expected; try again in a moment.',
    'pt-BR': 'O ambiente não respondeu como esperado; tente de novo em instantes.',
  },

  // ------------------------------------------------------------------ SLOs
  'catalog.purpose.slo.availability': {
    en: 'The indicator of an availability SLO the SE creates on the PoC Builder: the share of a service’s requests without a failure, per minute — the form the platform’s SLO app writes. Evaluated by the platform, not read by this app.',
    'pt-BR':
      'O indicador de um SLO de disponibilidade que o SE cria no PoC Builder: a parte das requisições de um serviço sem ' +
      'falha, por minuto — a forma que o app de SLO da plataforma escreve. Avaliado pela plataforma, não lido por este app.',
  },
  'catalog.purpose.slo.performance': {
    en: 'The indicator of a performance SLO the SE creates on the PoC Builder: the share of minutes whose mean response time stays within 1 second for a service — the form the platform’s SLO app writes. Evaluated by the platform.',
    'pt-BR':
      'O indicador de um SLO de desempenho que o SE cria no PoC Builder: a parte dos minutos em que o tempo médio de ' +
      'resposta fica dentro de 1 segundo para um serviço — a forma que o app de SLO da plataforma escreve. Avaliado pela plataforma.',
  },
  'timeframe.caller.slo': { en: 'the SLO’s own window (7 days)', 'pt-BR': 'a janela do próprio SLO (7 dias)' },
  'builder.slo.title': { en: 'Service SLOs', 'pt-BR': 'SLOs dos serviços' },
  'builder.slo.what': {
    en: 'Availability and performance objectives for the services that carry the load, evaluated by the platform over the last 7 days and shown in the Service-Level Objectives app — the same form the platform writes.',
    'pt-BR': 'Objetivos de disponibilidade e desempenho para os serviços que carregam a carga, avaliados pela plataforma nos últimos 7 dias e mostrados no app Service-Level Objectives — na mesma forma que a plataforma escreve.',
  },
  'builder.slo.kinds': { en: 'What each service gets', 'pt-BR': 'O que cada serviço ganha' },
  'builder.slo.kind.availability': { en: 'Availability', 'pt-BR': 'Disponibilidade' },
  'builder.slo.kind.performance': { en: 'Performance', 'pt-BR': 'Desempenho' },
  'builder.slo.rule.availability': { en: 'requests without a failure, target {target} %', 'pt-BR': 'requisições sem falha, meta {target} %' },
  'builder.slo.rule.performance': { en: 'minutes within 1 s, target {target} %', 'pt-BR': 'minutos dentro de 1 s, meta {target} %' },
  'builder.slo.services': {
    en: 'Services — the {shown} busiest of the ranking',
    'pt-BR': 'Serviços — os {shown} mais movimentados do ranking',
  },
  'builder.slo.noServices': {
    en: 'No service with traffic was read in this window; the SLOs can be created once services report requests.',
    'pt-BR': 'Nenhum serviço com tráfego foi lido nesta janela; os SLOs podem ser criados quando os serviços reportarem requisições.',
  },
  'builder.slo.requests': { en: '{count} requests', 'pt-BR': '{count} requisições' },
  'builder.slo.requests.one': { en: '{count} request', 'pt-BR': '{count} requisição' },
  'builder.slo.already': { en: 'already has PoC SLOs', 'pt-BR': 'já tem SLOs da PoC' },
  'builder.slo.create': { en: 'Create {n} SLOs', 'pt-BR': 'Criar {n} SLOs' },
  'builder.slo.confirm.title': { en: 'Create {n} SLOs on this environment?', 'pt-BR': 'Criar {n} SLOs neste ambiente?' },
  'builder.slo.confirm.body': {
    en: 'They are written once, now, tagged poc-automation and listed in the PoC’s register; the clean-up removes them at the end.',
    'pt-BR': 'Eles são escritos uma vez, agora, com a tag poc-automation, e entram no registro da PoC; a limpeza os remove no fim.',
  },
  'builder.slo.name': { en: '{kind} — {service} (PoC {customer})', 'pt-BR': '{kind} — {service} (PoC de {customer})' },
  'builder.slo.description.availability': {
    en: 'Share of the requests of {service} without a failure. Created by PoC Automation 3.0.',
    'pt-BR': 'Parte das requisições de {service} sem falha. Criado pelo PoC Automation 3.0.',
  },
  'builder.slo.description.performance': {
    en: 'Share of the minutes in which {service} answered within 1 second on average. Created by PoC Automation 3.0.',
    'pt-BR': 'Parte dos minutos em que {service} respondeu em até 1 segundo em média. Criado pelo PoC Automation 3.0.',
  },

  'catalog.purpose.slo.hosts.cpu': {
    en: 'The indicator of the hosts CPU SLO the SE creates on the PoC Builder: for every monitored host, the minutes whose mean CPU use stays within 80 %. A minute not yet reported is a gap, never a failure. Evaluated by the platform.',
    'pt-BR': 'O indicador do SLO de CPU dos hosts que o SE cria no PoC Builder: para cada host monitorado, os minutos em que o uso médio de CPU fica em até 80 %. Um minuto ainda sem dado é uma lacuna, nunca uma falha. Avaliado pela plataforma.',
  },
  'catalog.purpose.slo.hosts.memory': {
    en: 'The indicator of the hosts memory SLO the SE creates on the PoC Builder: for every monitored host, the minutes whose mean memory use stays within 85 %. A minute not yet reported is a gap, never a failure. Evaluated by the platform.',
    'pt-BR': 'O indicador do SLO de memória dos hosts que o SE cria no PoC Builder: para cada host monitorado, os minutos em que o uso médio de memória fica em até 85 %. Um minuto ainda sem dado é uma lacuna, nunca uma falha. Avaliado pela plataforma.',
  },
  'catalog.purpose.slo.k8s.restarts': {
    en: 'The indicator of the Kubernetes SLO the SE creates on the PoC Builder: for every workload, the minutes in which none of its containers restarted. Evaluated by the platform.',
    'pt-BR': 'O indicador do SLO de Kubernetes que o SE cria no PoC Builder: para cada workload, os minutos em que nenhum dos seus contêineres reiniciou. Avaliado pela plataforma.',
  },
  'builder.slo.fleet': { en: 'Infrastructure and Kubernetes — one SLO for the whole fleet each', 'pt-BR': 'Infraestrutura e Kubernetes — um SLO para a frota toda, cada' },
  'builder.slo.kind.hostCpu': { en: 'Host CPU', 'pt-BR': 'CPU dos hosts' },
  'builder.slo.kind.hostMemory': { en: 'Host memory', 'pt-BR': 'Memória dos hosts' },
  'builder.slo.kind.k8sRestarts': { en: 'Kubernetes workloads without restarts', 'pt-BR': 'Workloads do Kubernetes sem reinício' },
  'builder.slo.rule.hostCpu': { en: 'minutes within 80 % CPU on every host, target {target} %', 'pt-BR': 'minutos com CPU em até 80 % em cada host, meta {target} %' },
  'builder.slo.rule.hostMemory': { en: 'minutes within 85 % memory on every host, target {target} %', 'pt-BR': 'minutos com memória em até 85 % em cada host, meta {target} %' },
  'builder.slo.rule.k8sRestarts': { en: 'minutes without a container restart in every workload, target {target} %', 'pt-BR': 'minutos sem reinício de contêiner em cada workload, meta {target} %' },
  'builder.slo.alreadyFleet': { en: 'already created', 'pt-BR': 'já criado' },
  'builder.slo.fleetName': { en: '{kind} (PoC {customer})', 'pt-BR': '{kind} (PoC de {customer})' },
  'builder.slo.description.hostCpu': {
    en: 'Share of the minutes in which every monitored host kept its mean CPU use within 80 %. Created by PoC Automation 3.0.',
    'pt-BR': 'Parte dos minutos em que cada host monitorado manteve o uso médio de CPU em até 80 %. Criado pelo PoC Automation 3.0.',
  },
  'builder.slo.description.hostMemory': {
    en: 'Share of the minutes in which every monitored host kept its mean memory use within 85 %. Created by PoC Automation 3.0.',
    'pt-BR': 'Parte dos minutos em que cada host monitorado manteve o uso médio de memória em até 85 %. Criado pelo PoC Automation 3.0.',
  },
  'builder.slo.description.k8sRestarts': {
    en: 'Share of the minutes in which no container of a Kubernetes workload restarted. Created by PoC Automation 3.0.',
    'pt-BR': 'Parte dos minutos em que nenhum contêiner de um workload do Kubernetes reiniciou. Criado pelo PoC Automation 3.0.',
  },
  'builder.wf.open': { en: 'Open in Workflows, ready to save', 'pt-BR': 'Abrir no Workflows, pronto para salvar' },
  'builder.wf.download': { en: 'Download (.json) to import', 'pt-BR': 'Baixar (.json) para importar' },
  'builder.wf.opened.title': { en: 'Opened in the Workflows app', 'pt-BR': 'Aberto no app Workflows' },
  'builder.wf.opened.body': {
    en: 'The problem trigger comes on: just save it there (if the platform asks which app, choose Workflows). From then on, each new problem sends the e-mail.',
    'pt-BR': 'O gatilho de problemas já vem ligado: é só salvar lá (se a plataforma perguntar qual app, escolha Workflows). A partir daí, cada problema novo envia o e-mail.',
  },
  'builder.wf.why': {
    en: 'The Workflows app saves it with your own permissions: the platform keeps the right to write workflows to its own apps.',
    'pt-BR': 'O app Workflows salva com as suas próprias permissões: a plataforma reserva o direito de escrever workflows aos apps dela.',
  },

  // ------------------------------------------------------------------ the workflow
  'builder.wf.title': { en: 'Problem triage workflow', 'pt-BR': 'Workflow de triagem de problemas' },
  'builder.wf.what': {
    en: 'On each problem Dynatrace Intelligence opens, an e-mail to the PoC team with the problem, its root cause, how far it reached and the link to open it — the team sees the platform act without opening it. The app’s own triage action writes it; the Workflows app saves the workflow.',
    'pt-BR': 'A cada problema que a Dynatrace Intelligence abre, um e-mail para o time da PoC com o problema, a causa raiz, até onde chegou e o link para abrir — o time vê a plataforma agir sem precisar abri-la. A ação de triagem do próprio app escreve o e-mail; o app Workflows salva o workflow.',
  },
  'builder.wf.step1': { en: 'Trigger: a problem opens, once its analysis is ready (every category)', 'pt-BR': 'Gatilho: um problema abre, quando a análise fica pronta (todas as categorias)' },
  'builder.wf.step2': { en: 'PoC Automation · Triage: the problem, its root cause, the logs around it and who calls it — then the e-mail with that summary', 'pt-BR': 'PoC Automation · Triage: o problema, a causa raiz, os logs em torno dele e quem chama — depois o e-mail com esse resumo' },
  'builder.wf.step3': { en: 'Saved by you in the Workflows app, the problem trigger already on', 'pt-BR': 'Salvo por você no app Workflows, com o gatilho de problemas já ligado' },
  'builder.wf.to': { en: 'Send to (e-mail addresses, separated by commas)', 'pt-BR': 'Enviar para (e-mails, separados por vírgula)' },
  'builder.wf.invalid': { en: 'Left out, not an e-mail address: {list}', 'pt-BR': 'Deixado de fora, não é um e-mail: {list}' },
  'builder.wf.shared': { en: 'Let every user of this environment see it', 'pt-BR': 'Deixar qualquer usuário deste ambiente ver' },
  'builder.wf.name': { en: 'PoC problem triage — {customer}', 'pt-BR': 'Triagem de problemas da PoC — {customer}' },
  'builder.wf.description': {
    en: 'Created by PoC Automation 3.0 (PoC Builder): on each problem Dynatrace Intelligence opens, an e-mail to the PoC team.',
    'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder): a cada problema que a Dynatrace Intelligence abre, um e-mail para o time da PoC.',
  },
  'builder.wf.task': { en: 'E-mail the PoC team', 'pt-BR': 'E-mail para o time da PoC' },

  // ------------------------------------------------------------------ the register and the clean-up
  'builder.ledger.slo': { en: 'SLO “{name}”', 'pt-BR': 'SLO “{name}”' },
  'builder.clean.title': { en: 'End of the PoC: remove what it created', 'pt-BR': 'Fim da PoC: remover o que ela criou' },
  'builder.clean.body': {
    en: 'Tick what should leave the environment. Only what this PoC created is listed; nothing is removed until you confirm.',
    'pt-BR': 'Marque o que deve sair do ambiente. Só aparece o que esta PoC criou; nada é removido até você confirmar.',
  },
  'builder.clean.type.dashboard': { en: 'dashboard', 'pt-BR': 'dashboard' },
  'builder.clean.type.notebook': { en: 'notebook', 'pt-BR': 'notebook' },
  'builder.clean.type.launchpad': { en: 'launchpad', 'pt-BR': 'launchpad' },
  'builder.clean.type.slo': { en: 'SLO', 'pt-BR': 'SLO' },
  'builder.clean.go': { en: 'Remove {n} from the environment', 'pt-BR': 'Remover {n} do ambiente' },
  'builder.clean.confirm.title': { en: 'Remove {n} items from this environment?', 'pt-BR': 'Remover {n} itens deste ambiente?' },
  'builder.clean.confirm.body': {
    en: 'They are removed for every user, now. Whatever was already removed elsewhere just leaves the register.',
    'pt-BR': 'Eles saem para todos os usuários, agora. O que já tinha sido removido em outro lugar só sai do registro.',
  },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i111': {
    en: '3.6.9 — The PoC Builder sets objectives and acts. SLOs created on the environment in one click: availability and performance for the busiest services, CPU and memory for every host, and Kubernetes workloads without restarts; a problem-triage workflow that e-mails the PoC team, opened in the Workflows app ready to save (or downloaded to import); and, at the end of the PoC, one place to remove what the PoC created. Each only by the SE’s click.',
    'pt-BR': '3.6.9 — O PoC Builder define objetivos e age. SLOs criados no ambiente num clique: disponibilidade e desempenho para os serviços mais movimentados, CPU e memória de cada host e workloads do Kubernetes sem reinício; um workflow de triagem que manda e-mail ao time da PoC, aberto no app Workflows pronto para salvar (ou baixado para importar); e, no fim da PoC, um lugar só para remover o que a PoC criou. Cada um só pelo clique do SE.',
  },

} satisfies Record<string, Entry>;
