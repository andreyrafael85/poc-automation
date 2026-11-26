import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.8 (the owner's validation of 3.7.7, "Seguir com a próxima release, antes validar os
 * seguintes pontos da 3.7.7"): the menu hidden while the PoC is prepared, Browser monitors, the AI Observability page in the
 * v6 layout, anomaly detectors handed to the Anomaly Detection app, and richer e-mails. Merged in `strings.ts`.
 */

export const v378Strings = {
  // ------------------------------------------------------------------ the first-run wizard
  'setup.back': { en: 'Back to the guide', 'pt-BR': 'Voltar ao guia' },

  // ------------------------------------------------------------------ anomaly detectors through the Anomaly Detection app
  'builder.ad.viaApp': {
    en: 'Each button opens the Anomaly Detection app with that detector filled in — the query, the rule and the event. There, choose a service user as its actor before saving (a person’s own account is not accepted). A detector saved there is removed in Settings, not by the clean-up.',
    'pt-BR': 'Cada botão abre o app Anomaly Detection com o detector já preenchido — a consulta, a regra e o evento. Lá, escolha um usuário de serviço como ator antes de salvar (a conta de uma pessoa não é aceita). Um detector salvo lá é removido em Configurações, não pela limpeza.',
  },
  'builder.ad.openKind': { en: '{signal}: open in Anomaly Detection', 'pt-BR': '{signal}: abrir no Anomaly Detection' },

  // ------------------------------------------------------------------ Browser monitors of the customer's addresses
  'builder.bmon.title': { en: 'Browser monitors of the customer’s addresses', 'pt-BR': 'Monitores Browser dos endereços do cliente' },
  'builder.bmon.what': {
    en: 'A synthetic browser monitor per address: a real browser loads the page from a public location, on a schedule — with the page’s load times and Core Web Vitals, its resources, and a screenshot when it fails — alerting when the page is down everywhere. The main address comes from Settings → Customer & engagement; add others below.',
    'pt-BR': 'Um monitor sintético Browser por endereço: um navegador de verdade carrega a página a partir de um local público, numa frequência — com os tempos de carga e os Core Web Vitals da página, os recursos dela e uma captura da tela quando falha —, alertando quando a página cai em todos os locais. O endereço principal vem de Configurações → Cliente e engajamento; acrescente outros abaixo.',
  },
  'builder.bmon.name': { en: '{host} — Browser (PoC of {customer})', 'pt-BR': '{host} — Browser (PoC de {customer})' },
  'builder.bmon.step': { en: 'Loading of {host}', 'pt-BR': 'Carregamento de {host}' },
  'builder.bmon.description': { en: 'Created by PoC Automation 3.0 (PoC Builder): a browser loads the customer’s page.', 'pt-BR': 'Criado pelo PoC Automation 3.0 (PoC Builder): um navegador carrega a página do cliente.' },
  'builder.bmon.existing': { en: '{n} browser monitor(s) of this PoC already on the environment (see the Register).', 'pt-BR': '{n} monitor(es) Browser desta PoC já no ambiente (veja o Registro).' },
  'builder.bmon.create': { en: 'Create {n} browser monitor(s)', 'pt-BR': 'Criar {n} monitor(es) Browser' },
  'builder.bmon.confirm.title': { en: 'Create {n} browser monitor(s) on this environment?', 'pt-BR': 'Criar {n} monitor(es) Browser neste ambiente?' },
  'builder.bmon.confirm.body': {
    en: 'Each monitor loads the page in a browser every {minutes} minutes from the chosen location; a browser run is synthetic consumption on this environment and costs more than an HTTP check. The clean-up at the end of the PoC removes them.',
    'pt-BR': 'Cada monitor carrega a página num navegador a cada {minutes} minutos a partir do local escolhido; uma execução Browser é consumo de sintético neste ambiente e custa mais que uma verificação HTTP. A limpeza do fim da PoC os remove.',
  },
  'builder.ledger.browserMonitor': { en: 'Browser monitor · {name}', 'pt-BR': 'Monitor Browser · {name}' },
  'builder.clean.type.browserMonitor': { en: 'browser monitor', 'pt-BR': 'monitor Browser' },

  // ------------------------------------------------------------------ AI Observability in the v6 layout
  'p.ai.band.ratio': { en: 'Output per 1,000 input', 'pt-BR': 'Saída por 1.000 de entrada' },
  'p.ai.band.ratioDetail': { en: 'tokens the models write back for every thousand they read', 'pt-BR': 'tokens que os modelos devolvem a cada mil que leem' },
  'p.ai.band.ratioCalc': { en: 'Output tokens × 1,000 ÷ input tokens, over the window.', 'pt-BR': 'Tokens de saída × 1.000 ÷ tokens de entrada, na janela.' },
  'p.ai.band.meanTime': { en: '{s} s per call on average', 'pt-BR': '{s} s por chamada em média' },
  'p.ai.band.errors': { en: 'Calls with an error', 'pt-BR': 'Chamadas com erro' },
  'p.ai.band.errorsDetail': { en: '{n} call(s) answered with an error type', 'pt-BR': '{n} chamada(s) com tipo de erro' },
  'p.ai.band.errorsCalc': { en: 'Calls with an error type × 100 ÷ every call measured, over the window.', 'pt-BR': 'Chamadas com tipo de erro × 100 ÷ todas as chamadas medidas, na janela.' },
  'p.ai.byService.title': { en: 'Tokens by service', 'pt-BR': 'Tokens por serviço' },
  'p.ai.byService.caption': { en: 'Input and output together — which apps use the models most.', 'pt-BR': 'Entrada e saída somadas — quais apps mais usam os modelos.' },
  'p.ai.byService.center': { en: 'tokens', 'pt-BR': 'tokens' },
  'p.ai.models.title': { en: 'The models in use', 'pt-BR': 'Os modelos em uso' },
  'p.ai.models.caption': {
    en: 'One card per model the apps called: its tokens, its share of all tokens, its calls and the services that use it.',
    'pt-BR': 'Um cartão por modelo chamado pelos apps: os tokens, a parcela de todos os tokens, as chamadas e os serviços que o usam.',
  },
  'p.ai.models.tokens': { en: '{input} in · {output} out', 'pt-BR': '{input} entrada · {output} saída' },
  'p.ai.models.shareName': { en: 'Share of all tokens', 'pt-BR': 'Parcela de todos os tokens' },
  'p.ai.models.share': { en: '{pct}% of all tokens', 'pt-BR': '{pct}% de todos os tokens' },
  'p.ai.models.errors': { en: 'With an error', 'pt-BR': 'Com erro' },
  'p.ai.models.services': { en: 'Used by: {list}', 'pt-BR': 'Usado por: {list}' },
  'p.ai.deeper.instrument.title': { en: 'Instrument early', 'pt-BR': 'Instrumentar cedo' },
  'p.ai.deeper.instrument.body': {
    en: 'Prompts, model versions, tool calls and tokens of each prioritised AI use case, with OpenTelemetry’s GenAI conventions.',
    'pt-BR': 'Prompts, versões de modelo, chamadas de ferramenta e tokens de cada caso de uso de IA priorizado, com as convenções GenAI do OpenTelemetry.',
  },
  'p.ai.deeper.trace.title': { en: 'Follow each answer', 'pt-BR': 'Seguir cada resposta' },
  'p.ai.deeper.trace.body': {
    en: 'A slow or poor answer traced to its cause along the agent, the tool and the model — in the platform’s AI Observability app.',
    'pt-BR': 'Uma resposta lenta ou ruim rastreada até a causa ao longo do agente, da ferramenta e do modelo — no app AI Observability da plataforma.',
  },
  'p.ai.deeper.govern.title': { en: 'Govern quality and cost', 'pt-BR': 'Governar qualidade e custo' },
  'p.ai.deeper.govern.body': {
    en: 'SLOs of quality and latency, guardrails and an auditable trail of the agents’ decisions, reviewed with the business.',
    'pt-BR': 'SLOs de qualidade e latência, guardrails e trilha auditável das decisões dos agentes, revistos com o negócio.',
  },

  'help.whatsNew.i120': {
    en: '3.7.8 — While a PoC is being prepared, the menu stays hidden: the guide, Settings and the PoC Builder lead the way, and the whole app opens at five of the seven steps. The PoC Builder creates Browser monitors of the customer’s pages — a real browser, with load times, Core Web Vitals and a screenshot when it fails — beside the HTTP monitors. Anomaly detectors open in the Anomaly Detection app already filled in, to be saved there as you (the platform accepts a detector’s owner only from its own app). AI Observability follows the v6 layout: six figures, tokens over time beside the models and services, a card per model and the tables in panels. The triage and weekly e-mails open with a summary callout and a table of facts, and every change in the week reads ▲ or ▼ with “better” or “worse”.',
    'pt-BR': '3.7.8 — Enquanto a PoC é preparada, o menu fica oculto: o guia, Configurações e o PoC Builder conduzem o caminho, e o app inteiro abre com cinco das sete etapas. O PoC Builder cria monitores Browser das páginas do cliente — um navegador de verdade, com tempos de carga, Core Web Vitals e captura de tela quando falha — ao lado dos monitores HTTP. Os detectores de anomalia abrem no app Anomaly Detection já preenchidos, para salvar lá em seu nome (a plataforma só aceita o dono de um detector pelo próprio app). A Observabilidade de IA segue o layout v6: seis números, tokens ao longo do tempo ao lado dos modelos e serviços, um cartão por modelo e as tabelas em painéis. Os e-mails de triagem e semanal abrem com um destaque e uma tabela de fatos, e cada variação da semana mostra ▲ ou ▼ com “melhor” ou “pior”.',
  },
} satisfies Record<string, Entry>;
