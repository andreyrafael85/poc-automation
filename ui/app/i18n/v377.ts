import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.7.7 (the owner's validation of 3.7.6, "Pode seguir com a 3.7.7, mas segue validações da
 * 3.7.6"): the first-run wizard, the master password for partners, "Smart Dashboards", "Consumption and events", the formal
 * e-mails, the weekly notebook and the AI Observability page. Merged in `strings.ts`.
 */

export const v377Strings = {
  // ------------------------------------------------------------------ the first-run wizard
  'setup.eyebrow': { en: 'Preparing the PoC', 'pt-BR': 'Preparando a PoC' },
  'setup.title': { en: 'Let’s set up this PoC before telling its story', 'pt-BR': 'Vamos preparar esta PoC antes de contar a história' },
  'setup.lead': {
    en: 'A few details make every page speak about this customer: their name and logo on the reports, what the PoC covers, its dates and what was agreed. The app opens in full once five of the seven steps are saved — Settings and the PoC Builder are open meanwhile.',
    'pt-BR': 'Alguns dados fazem cada página falar deste cliente: o nome e o logo nos relatórios, o que a PoC cobre, as datas e o que foi combinado. O app abre por completo quando cinco das sete etapas estiverem salvas — Configurações e o PoC Builder ficam abertos enquanto isso.',
  },
  'setup.progressName': { en: 'Steps saved', 'pt-BR': 'Etapas salvas' },
  'setup.progress': { en: '{done} of {total} steps', 'pt-BR': '{done} de {total} etapas' },
  'setup.missing': {
    en: '— {missing} more to reach the {required} that open the whole app.',
    'pt-BR': '— faltam {missing} para chegar às {required} que abrem o app inteiro.',
  },
  'setup.next': { en: 'Next: {step}', 'pt-BR': 'Próxima: {step}' },
  'setup.done': { en: 'Saved', 'pt-BR': 'Salva' },
  'setup.go': { en: 'Fill in', 'pt-BR': 'Preencher' },
  'setup.note': {
    en: 'Each step is saved in Settings with “Apply all changes” and shared with everyone working on this PoC. The customer and executive mode never see this guide.',
    'pt-BR': 'Cada etapa é salva em Configurações com “Aplicar todas as alterações” e compartilhada com todos que trabalham nesta PoC. O cliente e o modo executivo nunca veem este guia.',
  },
  'setup.banner': {
    en: 'Preparing the PoC: {done} of {total} steps saved. The whole app opens at {required}.',
    'pt-BR': 'Preparando a PoC: {done} de {total} etapas salvas. O app inteiro abre com {required}.',
  },
  'setup.why.customer': {
    en: 'Names the customer on every page, report and dashboard.',
    'pt-BR': 'Dá nome ao cliente em cada página, relatório e dashboard.',
  },
  'setup.why.logo': {
    en: 'Puts the customer’s brand on the reports, the deck and the dashboards’ corner.',
    'pt-BR': 'Leva a marca do cliente aos relatórios, ao deck e ao canto dos dashboards.',
  },
  'setup.why.description': {
    en: 'Tells the reader what the PoC covers — the opening of the Executive summary and the SE Report.',
    'pt-BR': 'Diz ao leitor o que a PoC cobre — a abertura do Resumo executivo e do SE Report.',
  },
  'setup.why.dates': {
    en: 'Sets Day 0 and the end: the timeline, Day 0 against today and the PoC’s window.',
    'pt-BR': 'Marca o Dia 0 e o fim: a linha do tempo, o Dia 0 contra hoje e a janela da PoC.',
  },
  'setup.why.criteria': {
    en: 'What was agreed with the customer — the scorecard measures each criterion.',
    'pt-BR': 'O que foi combinado com o cliente — o scorecard mede cada critério.',
  },
  'setup.why.dashboard': {
    en: 'A first Smart Dashboard on the tenant, for the customer’s teams to follow the PoC.',
    'pt-BR': 'Um primeiro Smart Dashboard no tenant, para os times do cliente acompanharem a PoC.',
  },
  'setup.why.rate': {
    en: 'The team’s hourly cost turns time saved into value (Licensing and Value only).',
    'pt-BR': 'O custo por hora da equipe transforma tempo poupado em valor (só em Licenciamento e Valor).',
  },

  // ------------------------------------------------------------------ AI Observability
  'nav.aiObservability': { en: 'AI Observability', 'pt-BR': 'Observabilidade de IA' },
  'p.ai.title': { en: 'AI Observability', 'pt-BR': 'Observabilidade de IA' },
  'p.ai.question': {
    en: 'Which generative-AI apps run in this environment, which models they call, how many tokens they send and receive, and how long the calls take?',
    'pt-BR': 'Quais apps de IA generativa rodam neste ambiente, quais modelos chamam, quantos tokens enviam e recebem e quanto tempo as chamadas levam?',
  },
  'p.ai.takeaway': {
    en: 'Every figure comes from the OpenTelemetry GenAI metrics the apps send to Dynatrace — the same data the platform’s AI Observability app reads. Tokens, never prices.',
    'pt-BR': 'Cada número vem das métricas GenAI do OpenTelemetry que os apps enviam ao Dynatrace — os mesmos dados que o app AI Observability da plataforma lê. Tokens, nunca preços.',
  },
  'p.ai.band.input': { en: 'Input tokens', 'pt-BR': 'Tokens de entrada' },
  'p.ai.band.inputDetail': { en: 'sent to the models in the window', 'pt-BR': 'enviados aos modelos na janela' },
  'p.ai.band.output': { en: 'Output tokens', 'pt-BR': 'Tokens de saída' },
  'p.ai.band.outputDetail': { en: 'received from the models in the window', 'pt-BR': 'recebidos dos modelos na janela' },
  'p.ai.band.services': { en: 'Services using AI', 'pt-BR': 'Serviços usando IA' },
  'p.ai.band.models': { en: '{n} model(s) named', 'pt-BR': '{n} modelo(s) identificado(s)' },
  'p.ai.band.calls': { en: 'Model calls measured', 'pt-BR': 'Chamadas a modelos medidas' },
  'p.ai.band.callsDetail': { en: '{s} s on average · {failed} with an error', 'pt-BR': '{s} s em média · {failed} com erro' },
  'p.ai.band.callsNone': { en: 'no call time reported in the window', 'pt-BR': 'nenhum tempo de chamada informado na janela' },
  'p.ai.band.footnote': {
    en: 'Read from gen_ai.client.token.usage and gen_ai.client.operation.duration (metrics, no Grail scan). A client that does not report its model counts its tokens under “model not reported”.',
    'pt-BR': 'Lido de gen_ai.client.token.usage e gen_ai.client.operation.duration (métricas, sem leitura do Grail). Um cliente que não informa o modelo conta seus tokens em “modelo não informado”.',
  },
  'p.ai.none.title': { en: 'No generative-AI metrics in this window', 'pt-BR': 'Nenhuma métrica de IA generativa nesta janela' },
  'p.ai.none.body': {
    en: 'Apps instrumented with OpenTelemetry’s GenAI conventions (for example with OpenLLMetry or Traceloop) send their tokens and call times to Dynatrace; once they do, this page and the platform’s AI Observability app show them. A longer window may also find them.',
    'pt-BR': 'Apps instrumentados com as convenções GenAI do OpenTelemetry (por exemplo com OpenLLMetry ou Traceloop) enviam seus tokens e tempos de chamada ao Dynatrace; a partir daí esta página e o app AI Observability da plataforma os mostram. Uma janela maior também pode encontrá-los.',
  },
  'p.ai.trend.title': { en: 'Tokens over time', 'pt-BR': 'Tokens ao longo do tempo' },
  'p.ai.trend.input': { en: 'Input tokens', 'pt-BR': 'Tokens de entrada' },
  'p.ai.trend.output': { en: 'Output tokens', 'pt-BR': 'Tokens de saída' },
  'p.ai.byModel.title': { en: 'Tokens by model', 'pt-BR': 'Tokens por modelo' },
  'p.ai.byModel.caption': { en: 'Input and output together, the eight busiest models.', 'pt-BR': 'Entrada e saída somadas, os oito modelos mais usados.' },
  'p.ai.modelNone': { en: 'Model not reported', 'pt-BR': 'Modelo não informado' },
  'p.ai.table.title': { en: 'Tokens by service and model', 'pt-BR': 'Tokens por serviço e modelo' },
  'p.ai.table.caption': {
    en: 'Each service with the models it called, its tokens sent and received over the window.',
    'pt-BR': 'Cada serviço com os modelos que chamou e os tokens enviados e recebidos na janela.',
  },
  'p.ai.h.service': { en: 'Service', 'pt-BR': 'Serviço' },
  'p.ai.h.model': { en: 'Model', 'pt-BR': 'Modelo' },
  'p.ai.h.input': { en: 'Input tokens', 'pt-BR': 'Tokens de entrada' },
  'p.ai.h.output': { en: 'Output tokens', 'pt-BR': 'Tokens de saída' },
  'p.ai.h.outcome': { en: 'Outcome', 'pt-BR': 'Resultado' },
  'p.ai.h.calls': { en: 'Calls', 'pt-BR': 'Chamadas' },
  'p.ai.h.avg': { en: 'Mean time', 'pt-BR': 'Tempo médio' },
  'p.ai.noError': { en: 'Answered', 'pt-BR': 'Respondida' },
  'p.ai.seconds': { en: '{n} s', 'pt-BR': '{n} s' },
  'p.ai.calls.title': { en: 'Calls to the models', 'pt-BR': 'Chamadas aos modelos' },
  'p.ai.calls.caption': {
    en: 'The calls each service made to each model, with their outcome and mean time, from the call-duration metric.',
    'pt-BR': 'As chamadas que cada serviço fez a cada modelo, com o resultado e o tempo médio, da métrica de duração das chamadas.',
  },
  'p.ai.deeper.title': { en: 'Agents, tools and conversations', 'pt-BR': 'Agentes, ferramentas e conversas' },
  'p.ai.deeper.body': {
    en: 'The prompts, the agents and the tools each call used live in the traces; the platform’s AI Observability app follows them call by call.',
    'pt-BR': 'Os prompts, os agentes e as ferramentas de cada chamada ficam nos traces; o app AI Observability da plataforma os acompanha chamada a chamada.',
  },
  'p.ai.deeper.open': { en: 'Open AI Observability', 'pt-BR': 'Abrir o AI Observability' },
  'catalog.purpose.ai.tokens': {
    en: 'Tokens sent and received by the generative-AI clients of the environment over the window, by service, model and kind (input or output), from the OpenTelemetry GenAI metric gen_ai.client.token.usage.',
    'pt-BR': 'Tokens enviados e recebidos pelos clientes de IA generativa do ambiente na janela, por serviço, modelo e tipo (entrada ou saída), da métrica GenAI do OpenTelemetry gen_ai.client.token.usage.',
  },
  'catalog.purpose.ai.tokens.trend': {
    en: 'Input and output tokens of the generative-AI clients over time (one series per kind), from gen_ai.client.token.usage.',
    'pt-BR': 'Tokens de entrada e de saída dos clientes de IA generativa ao longo do tempo (uma série por tipo), de gen_ai.client.token.usage.',
  },
  'catalog.purpose.ai.calls': {
    en: 'Calls to generative-AI models over the window, by service, model and error type, with their mean duration, from the OpenTelemetry GenAI metric gen_ai.client.operation.duration.',
    'pt-BR': 'Chamadas a modelos de IA generativa na janela, por serviço, modelo e tipo de erro, com a duração média, da métrica GenAI do OpenTelemetry gen_ai.client.operation.duration.',
  },

  'help.whatsNew.i119': {
    en: '3.7.7 — A new PoC opens on a short guide: the SE or the partner fills five of the seven steps in Settings (customer, logo, what the PoC covers, dates, criteria…) and the whole app opens; Settings and the PoC Builder stay open meanwhile, and the customer never sees the guide. Partners who deploy the app themselves can open it with the master password. The PoC Builder’s first tab is “Smart Dashboards”, its first dashboard is “Environment health and SLOs”, and the Consumption page is “Consumption and events”, with plainer words. The triage and weekly e-mails are formal Markdown without emoji — the week in tables against the week before — and every Monday the weekly action also writes the week’s report as a notebook with the platform’s charts, linked in the e-mail. A new page, AI Observability, shows the tokens, models and calls of the environment’s generative-AI apps.',
    'pt-BR': '3.7.7 — Uma PoC nova abre num guia curto: o SE ou o parceiro preenche cinco das sete etapas em Configurações (cliente, logo, o que a PoC cobre, datas, critérios…) e o app inteiro se abre; Configurações e o PoC Builder ficam abertos enquanto isso, e o cliente nunca vê o guia. Parceiros que implantam o app por conta própria podem abri-lo com a senha mestra. A primeira guia do PoC Builder é “Smart Dashboards”, o primeiro dashboard é “Saúde do ambiente e SLOs” e a página de Consumo é “Consumo e eventos”, com palavras mais simples. Os e-mails de triagem e semanal são Markdown formal sem emoji — a semana em tabelas contra a anterior — e toda segunda a ação semanal também escreve o relatório da semana como um notebook com os gráficos da plataforma, com o link no e-mail. Uma página nova, Observabilidade de IA, mostra os tokens, os modelos e as chamadas dos apps de IA generativa do ambiente.',
  },
} satisfies Record<string, Entry>;
