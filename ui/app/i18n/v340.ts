import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.0 — the Assessment (proposal `docs/v3.4/PROPOSTA-3.4.md` Part C, owner's order
 * "Sim, iniciar 3.4.0"). Merged in `strings.ts`.
 */

export const v340Strings = {
  'nav.assessment': { en: 'Coverage', 'pt-BR': 'Cobertura' },

  'p.asm.title': { en: 'Coverage', 'pt-BR': 'Cobertura' },
  'p.asm.question': {
    en: 'What exists in this environment, what Dynatrace already covers and maps in it, what did we find and what do we recommend?',
    'pt-BR': 'O que existe neste ambiente, o que a Dynatrace já cobre e mapeia nele, o que encontramos e o que recomendamos?',
  },
  'p.asm.takeaway': {
    en: 'A coverage reading built only from what Dynatrace read here: every figure carries its query, a domain that could not be read stays out of the index instead of counting as zero, and every finding names the measurement behind it.',
    'pt-BR': 'Uma leitura de cobertura montada só com o que o Dynatrace leu aqui: cada número leva a sua consulta, um domínio que não pôde ser lido fica fora do índice em vez de contar como zero, e cada achado diz a medição que o sustenta.',
  },

  // Header
  'p.asm.header.environment': { en: 'Environment', 'pt-BR': 'Ambiente' },
  'p.asm.header.window': { en: 'Window', 'pt-BR': 'Janela' },
  'p.asm.header.sources': { en: '{read} of {total} sources read', 'pt-BR': '{read} de {total} fontes lidas' },
  'p.asm.header.reading': { en: 'Reading the environment…', 'pt-BR': 'Lendo o ambiente…' },
  'p.asm.lens.label': { en: 'Lens', 'pt-BR': 'Lente' },
  'p.asm.lens.general': { en: 'General', 'pt-BR': 'Geral' },
  'p.asm.lens.apm': { en: 'Applications', 'pt-BR': 'Aplicações' },
  'p.asm.lens.infra': { en: 'Infrastructure & cloud', 'pt-BR': 'Infraestrutura e nuvem' },
  'p.asm.lens.kubernetes': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'p.asm.lens.logs': { en: 'Logs & data', 'pt-BR': 'Logs e dados' },
  'p.asm.lens.experience': { en: 'Experience & business', 'pt-BR': 'Experiência e negócio' },
  'p.asm.lens.note': {
    en: 'A lens changes what is shown first, never what is measured: the index and its weights stay the same.',
    'pt-BR': 'A lente muda o que aparece primeiro, nunca o que é medido: o índice e os pesos continuam os mesmos.',
  },

  // Snapshot band
  'p.asm.band.hosts': { en: 'Hosts', 'pt-BR': 'Hosts' },
  'p.asm.band.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'p.asm.band.webApps': { en: 'Web applications', 'pt-BR': 'Aplicações web' },
  'p.asm.band.clusters': { en: 'Kubernetes clusters', 'pt-BR': 'Clusters Kubernetes' },
  'p.asm.band.synthetic': { en: 'Synthetic monitors', 'pt-BR': 'Monitores sintéticos' },
  'p.asm.band.findings': { en: 'Findings', 'pt-BR': 'Achados' },
  'p.asm.band.findingsDetail': { en: '{critical} critical · {warning} attention', 'pt-BR': '{critical} críticos · {warning} de atenção' },
  'p.asm.band.findingsCalc': { en: 'Rules of the coverage reading over the measured signals', 'pt-BR': 'Regras da leitura de cobertura sobre os sinais medidos' },
  'p.asm.band.footnote': {
    en: 'The entity model as it is now; the findings over the window above. Each figure opens its query.',
    'pt-BR': 'O modelo de entidades como está agora; os achados na janela acima. Cada número abre a sua consulta.',
  },

  // The index
  'p.asm.index.title': { en: 'What Dynatrace observes here', 'pt-BR': 'O que o Dynatrace observa aqui' },
  'p.asm.index.caption': {
    en: 'The observable-coverage index: each domain is a measured share, weighted as stated in Help → Assumptions. It measures coverage, not health — the findings below say how the environment is doing.',
    'pt-BR': 'O índice de cobertura observável: cada domínio é uma parcela medida, com o peso descrito em Ajuda → Premissas. Ele mede cobertura, não saúde — os achados abaixo dizem como o ambiente está.',
  },
  'p.asm.index.ring': { en: 'Coverage index', 'pt-BR': 'Índice de cobertura' },
  'p.asm.index.ringCaption': { en: '{measured} of {applicable} weight points measured', 'pt-BR': '{measured} de {applicable} pontos de peso medidos' },
  'p.asm.index.aria': { en: 'Observable-coverage index, 0 to 100', 'pt-BR': 'Índice de cobertura observável, de 0 a 100' },
  'p.asm.index.notCalculated': { en: 'Not calculated in this window', 'pt-BR': 'Não calculado nesta janela' },
  'p.asm.index.insufficient': {
    en: 'Less than {min}% of the weight that applies was read, so no index is shown — the domains below say which reads are missing and why.',
    'pt-BR': 'Menos de {min}% do peso aplicável foi lido, por isso o índice não aparece — os domínios abaixo dizem quais leituras faltam e por quê.',
  },
  'p.asm.index.nothing': { en: 'No domain applies to this environment yet.', 'pt-BR': 'Nenhum domínio se aplica a este ambiente ainda.' },
  'p.asm.index.calc': {
    en: '100 × Σ(weight × share) ÷ Σ weight, over the domains measured',
    'pt-BR': '100 × Σ(peso × parcela) ÷ Σ peso, sobre os domínios medidos',
  },

  // Domains
  'p.asm.domain.infra': { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
  'p.asm.domain.apm': { en: 'Applications & services', 'pt-BR': 'Aplicações e serviços' },
  'p.asm.domain.logs': { en: 'Logs in context', 'pt-BR': 'Logs com contexto' },
  'p.asm.domain.k8s': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'p.asm.domain.experience': { en: 'Digital experience', 'pt-BR': 'Experiência digital' },
  'p.asm.domain.business': { en: 'Business events', 'pt-BR': 'Eventos de negócio' },
  'p.asm.ratio.infra': {
    en: '{num} of {den} hosts with a reported mode observed in full-stack or infrastructure mode',
    'pt-BR': '{num} de {den} hosts com modo informado observados em full-stack ou infraestrutura',
  },
  'p.asm.ratio.apm': { en: '{num} of {den} services in the model handled traffic', 'pt-BR': '{num} de {den} serviços do modelo receberam tráfego' },
  'p.asm.ratio.logs': { en: '{num} of {den} log records carry service context', 'pt-BR': '{num} de {den} registros de log trazem contexto de serviço' },
  'p.asm.ratio.k8s': { en: '{num} of {den} clusters report container metrics', 'pt-BR': '{num} de {den} clusters enviam métricas de contêiner' },
  'p.asm.ratio.experience': { en: '{num} of {den} web applications with real-user traffic', 'pt-BR': '{num} de {den} aplicações web com tráfego de usuários reais' },
  'p.asm.ratio.businessYes': { en: 'Business events captured in the window', 'pt-BR': 'Eventos de negócio capturados na janela' },
  'p.asm.ratio.businessNo': { en: 'No business event in the window yet', 'pt-BR': 'Ainda sem evento de negócio na janela' },
  'p.asm.weight': { en: 'weight {weight}', 'pt-BR': 'peso {weight}' },
  'p.asm.gap.loading': { en: 'Reading…', 'pt-BR': 'Lendo…' },
  'p.asm.gap.no-permission': { en: 'Not readable with this identity — out of the index', 'pt-BR': 'Sem leitura com esta identidade — fora do índice' },
  'p.asm.gap.failed': { en: 'The read did not complete — out of the index', 'pt-BR': 'A leitura não foi concluída — fora do índice' },
  'p.asm.gap.no-telemetry': { en: 'No data in this window — out of the index', 'pt-BR': 'Sem dado nesta janela — fora do índice' },
  'p.asm.gap.partial': { en: 'The read stopped early — out of the index', 'pt-BR': 'A leitura parou antes do fim — fora do índice' },
  'p.asm.gap.incoherent': { en: 'The two counts disagree — out of the index', 'pt-BR': 'As duas contagens divergem — fora do índice' },
  'p.asm.na': { en: 'Nothing to observe here — does not apply', 'pt-BR': 'Nada a observar aqui — não se aplica' },
  'p.asm.na.k8s': { en: 'No cluster in the model — does not apply', 'pt-BR': 'Nenhum cluster no modelo — não se aplica' },
  'p.asm.na.experience': { en: 'No web application in the model — does not apply', 'pt-BR': 'Nenhuma aplicação web no modelo — não se aplica' },

  // How it is calculated
  'p.asm.formula.title': { en: 'How the index is calculated', 'pt-BR': 'Como o índice é calculado' },
  'p.asm.formula.body': {
    en: 'Each domain is the share of two exact counts. The index is 100 × Σ(weight × share) ÷ Σ weight, over the domains that were measured and apply; a domain not read or with nothing to observe leaves the sum instead of counting as zero. Below {min}% of the applicable weight read, no index is shown.',
    'pt-BR': 'Cada domínio é a parcela entre duas contagens exatas. O índice é 100 × Σ(peso × parcela) ÷ Σ peso, sobre os domínios medidos e aplicáveis; um domínio não lido ou sem nada a observar sai da soma em vez de contar como zero. Abaixo de {min}% do peso aplicável lido, o índice não aparece.',
  },
  'p.asm.formula.domain': { en: 'Domain', 'pt-BR': 'Domínio' },
  'p.asm.formula.reading': { en: 'Reading', 'pt-BR': 'Leitura' },
  'p.asm.formula.share': { en: 'Share', 'pt-BR': 'Parcela' },
  'p.asm.formula.weightCol': { en: 'Weight', 'pt-BR': 'Peso' },
  'p.asm.formula.points': { en: 'Points', 'pt-BR': 'Pontos' },
  'p.asm.formula.sources': { en: 'Queries', 'pt-BR': 'Consultas' },

  // Discovery
  'p.asm.discovery.title': { en: 'What exists', 'pt-BR': 'O que existe' },
  'p.asm.discovery.modes': { en: 'Hosts by monitoring mode', 'pt-BR': 'Hosts por modo de monitoramento' },
  'p.asm.discovery.modesCaption': {
    en: 'Full-stack sees code and traces; infrastructure mode sees the host and its processes. A host whose mode was not reported is a missing attribute, not an unmonitored host.',
    'pt-BR': 'Full-stack enxerga código e traces; o modo infraestrutura enxerga o host e seus processos. Um host sem modo informado é um atributo ausente, não um host sem monitoramento.',
  },
  'p.asm.mode.fullStack': { en: 'Full-stack', 'pt-BR': 'Full-stack' },
  'p.asm.mode.infra': { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
  'p.asm.mode.other': { en: 'Other modes', 'pt-BR': 'Outros modos' },
  'p.asm.mode.unknown': { en: 'Mode not reported', 'pt-BR': 'Modo não informado' },
  'p.asm.discovery.tech': { en: 'Technologies detected', 'pt-BR': 'Tecnologias detectadas' },
  'p.asm.discovery.techCaption': {
    en: 'Process instances per technology, every version together — the 10 most used.',
    'pt-BR': 'Instâncias de processo por tecnologia, todas as versões juntas — as 10 mais usadas.',
  },

  // Findings
  'p.asm.findings.title': { en: 'Key findings', 'pt-BR': 'Principais achados' },
  'p.asm.findings.caption': {
    en: 'Each finding names what was measured, what could follow, what we recommend and the queries behind it. A limit of this reading is marked as such and never outranks a measured finding.',
    'pt-BR': 'Cada achado diz o que foi medido, o que pode acontecer, o que recomendamos e as consultas por trás. Um limite desta leitura vem marcado como tal e nunca passa à frente de um achado medido.',
  },
  'p.asm.class.critical': { en: 'Critical', 'pt-BR': 'Crítico' },
  'p.asm.class.warning': { en: 'Attention', 'pt-BR': 'Atenção' },
  'p.asm.class.opportunity': { en: 'Opportunity', 'pt-BR': 'Oportunidade' },
  'p.asm.class.strength': { en: 'Strength', 'pt-BR': 'Ponto forte' },
  'p.asm.class.none': { en: 'Nothing in this class for this lens.', 'pt-BR': 'Nada nesta classe para esta lente.' },
  'p.asm.finding.measured': { en: 'Measured', 'pt-BR': 'Medido' },
  'p.asm.finding.impact': { en: 'Possible impact', 'pt-BR': 'Impacto possível' },
  'p.asm.finding.rec': { en: 'Recommendation', 'pt-BR': 'Recomendação' },
  'p.asm.finding.capability': { en: 'Dynatrace capability', 'pt-BR': 'Capacidade Dynatrace' },
  'p.asm.finding.evidence': { en: 'Evidence: {queries}', 'pt-BR': 'Evidência: {queries}' },
  'p.asm.finding.open': { en: 'See the evidence', 'pt-BR': 'Ver a evidência' },
  'p.asm.finding.gap': { en: 'Limit of this reading', 'pt-BR': 'Limite desta leitura' },

  // Risks and opportunities
  'p.asm.matrix.title': { en: 'Risks and opportunities — impact × effort', 'pt-BR': 'Riscos e oportunidades — impacto × esforço' },
  'p.asm.matrix.caption': {
    en: 'Every finding that asks for action, in the cell of its impact and effort, numbered as in the actions below. Both are the qualitative judgement each rule states.',
    'pt-BR': 'Cada achado que pede ação, na célula do seu impacto e esforço, numerado como nas ações abaixo. Os dois são o julgamento qualitativo que cada regra faz.',
  },

  // Summary
  'p.asm.summary.title': { en: 'Coverage in a few lines', 'pt-BR': 'A cobertura em poucas linhas' },
  'p.asm.summary.caption': {
    en: 'Written from the measured figures above with fixed sentences — nothing here is generated.',
    'pt-BR': 'Escrito a partir dos números medidos acima com frases fixas — nada aqui é gerado.',
  },
  'p.asm.summary.estate': {
    en: 'In the entity model — hosts: {hosts}; services: {services}; web applications: {apps}.',
    'pt-BR': 'No modelo de entidades — hosts: {hosts}; serviços: {services}; aplicações web: {apps}.',
  },
  'p.asm.summary.index': {
    en: 'Dynatrace observes {index} of 100 of what applies here (domains measured: {domains}).',
    'pt-BR': 'O Dynatrace observa {index} de 100 do que se aplica aqui (domínios medidos: {domains}).',
  },
  'p.asm.summary.noIndex': {
    en: 'The coverage index is not shown in this window: {read} of {total} domains were read.',
    'pt-BR': 'O índice de cobertura não aparece nesta janela: {read} de {total} domínios foram lidos.',
  },
  'p.asm.summary.findings': {
    en: 'Findings of this reading — critical: {critical}; attention: {warning}; opportunity: {opportunity}; strength: {strength}.',
    'pt-BR': 'Achados desta leitura — críticos: {critical}; atenção: {warning}; oportunidades: {opportunity}; pontos fortes: {strength}.',
  },
  'p.asm.summary.first': { en: 'Act first on: {title}.', 'pt-BR': 'Agir primeiro em: {title}.' },
  'p.asm.summary.strength': { en: 'Strongest point: {title}.', 'pt-BR': 'Ponto mais forte: {title}.' },
  'p.asm.summary.unread': {
    en: 'Not read in this window: {domains}.',
    'pt-BR': 'Sem leitura nesta janela: {domains}.',
  },

  // Actions
  'p.asm.actions.title': { en: 'Recommended actions', 'pt-BR': 'Ações recomendadas' },
  'p.asm.actions.caption': {
    en: 'P1 act now (critical, or attention with high impact) · P2 plan · P3 when there is room. Strengths are kept as they are.',
    'pt-BR': 'P1 agir agora (crítico, ou atenção de alto impacto) · P2 planejar · P3 quando houver espaço. Pontos fortes se mantêm como estão.',
  },
  'p.asm.actions.none': { en: 'No action is asked for by this reading and lens.', 'pt-BR': 'Nenhuma ação pedida por esta leitura e lente.' },
  'p.asm.actions.priority': { en: 'Priority', 'pt-BR': 'Prioridade' },
  'p.asm.actions.action': { en: 'Action', 'pt-BR': 'Ação' },
  'p.asm.actions.finding': { en: 'Finding', 'pt-BR': 'Achado' },
  'p.asm.actions.capability': { en: 'Capability', 'pt-BR': 'Capacidade' },
  'p.asm.actions.evidence': { en: 'Evidence', 'pt-BR': 'Evidência' },
  'p.asm.actions.open': { en: 'Open', 'pt-BR': 'Abrir' },

  // Dynatrace capabilities
  'asm.cap.tracing': { en: 'Distributed tracing', 'pt-BR': 'Rastreamento distribuído' },
  'asm.cap.logs': { en: 'Log Management & Analytics', 'pt-BR': 'Gestão e análise de logs' },
  'asm.cap.openpipeline': { en: 'OpenPipeline', 'pt-BR': 'OpenPipeline' },
  'asm.cap.kubernetes': { en: 'Kubernetes monitoring', 'pt-BR': 'Monitoramento de Kubernetes' },
  'asm.cap.workflows': { en: 'Workflows', 'pt-BR': 'Workflows' },
  'asm.cap.grail': { en: 'Grail & access policies', 'pt-BR': 'Grail e políticas de acesso' },
  'asm.cap.security': { en: 'Application Security', 'pt-BR': 'Application Security' },
  'asm.cap.rum': { en: 'Real User Monitoring', 'pt-BR': 'Real User Monitoring' },
  'asm.cap.oneagent': { en: 'OneAgent', 'pt-BR': 'OneAgent' },
  'asm.cap.serviceDetection': { en: 'Service detection', 'pt-BR': 'Detecção de serviços' },
  'asm.cap.synthetic': { en: 'Synthetic monitoring', 'pt-BR': 'Monitoramento sintético' },
  'asm.cap.infrastructure': { en: 'Infrastructure monitoring', 'pt-BR': 'Monitoramento de infraestrutura' },
  'asm.cap.business': { en: 'Business Observability', 'pt-BR': 'Business Observability' },
  'asm.cap.slo': { en: 'Service-level objectives', 'pt-BR': 'Objetivos de nível de serviço (SLO)' },
  'asm.cap.davis': { en: 'Dynatrace Intelligence', 'pt-BR': 'Dynatrace Intelligence' },

  // The rules only the Assessment evaluates
  'asm.rule.infraOnly.title': { en: 'Hosts observed in infrastructure mode: {count}', 'pt-BR': 'Hosts observados em modo infraestrutura: {count}' },
  'asm.rule.infraOnly.obs': {
    en: '{count} of {total} hosts with a reported mode ({pct}%) run in infrastructure mode.',
    'pt-BR': '{count} de {total} hosts com modo informado ({pct}%) estão em modo infraestrutura.',
  },
  'asm.rule.infraOnly.impact': {
    en: 'Services on these hosts can miss traces and code-level root cause.',
    'pt-BR': 'Serviços nesses hosts podem ficar sem traces e sem causa raiz em nível de código.',
  },
  'asm.rule.infraOnly.rec': { en: 'Consider full-stack on the hosts that run applications.', 'pt-BR': 'Avaliar full-stack nos hosts que rodam aplicações.' },
  'asm.rule.modeUnknown.title': { en: 'Hosts without a reported monitoring mode: {count}', 'pt-BR': 'Hosts sem modo de monitoramento informado: {count}' },
  'asm.rule.modeUnknown.obs': {
    en: 'Hosts in the model that do not report their monitoring mode: {count}.',
    'pt-BR': 'Hosts do modelo que não informam o modo de monitoramento: {count}.',
  },
  'asm.rule.modeUnknown.impact': {
    en: 'How deeply these hosts are observed could not be read; they stay out of the infrastructure share.',
    'pt-BR': 'A profundidade de observação desses hosts não pôde ser lida; eles ficam fora da parcela de infraestrutura.',
  },
  'asm.rule.modeUnknown.rec': { en: 'Check the agent version and deployment status of these hosts.', 'pt-BR': 'Conferir a versão do agente e o status de implantação desses hosts.' },
  'asm.rule.idleServices.title': { en: 'Services without traffic in the window: {count}', 'pt-BR': 'Serviços sem tráfego na janela: {count}' },
  'asm.rule.idleServices.obs': {
    en: '{count} of {total} services in the model ({pct}%) handled no request in the window.',
    'pt-BR': '{count} de {total} serviços do modelo ({pct}%) não receberam requisição na janela.',
  },
  'asm.rule.idleServices.impact': {
    en: 'Part of the inventory may be inactive or missing request instrumentation.',
    'pt-BR': 'Parte do inventário pode estar inativa ou sem instrumentação de requisição.',
  },
  'asm.rule.idleServices.rec': { en: 'Review the idle services and the service-detection rules.', 'pt-BR': 'Revisar os serviços inativos e as regras de detecção de serviços.' },
  'asm.rule.clusterMetrics.title': { en: 'Clusters without container metrics: {count}', 'pt-BR': 'Clusters sem métricas de contêiner: {count}' },
  'asm.rule.clusterMetrics.obs': {
    en: 'Clusters in the model that sent no container metric in the last 24 hours: {count} of {total}.',
    'pt-BR': 'Clusters do modelo que não enviaram métrica de contêiner nas últimas 24 horas: {count} de {total}.',
  },
  'asm.rule.clusterMetrics.impact': {
    en: 'These clusters may be running without an active Dynatrace Operator or ActiveGate.',
    'pt-BR': 'Esses clusters podem estar sem Dynatrace Operator ou ActiveGate ativo.',
  },
  'asm.rule.clusterMetrics.rec': { en: 'Check the Dynatrace Operator on each of these clusters.', 'pt-BR': 'Conferir o Dynatrace Operator em cada um desses clusters.' },
  'asm.rule.rumApps.title': { en: 'Web applications without real-user traffic: {count}', 'pt-BR': 'Aplicações web sem tráfego de usuários reais: {count}' },
  'asm.rule.rumApps.obs': {
    en: 'Web applications in the model with no real-user traffic in the window: {count} of {total}.',
    'pt-BR': 'Aplicações web do modelo sem tráfego de usuários reais na janela: {count} de {total}.',
  },
  'asm.rule.rumApps.impact': { en: 'The user experience of these applications stays out of view.', 'pt-BR': 'A experiência do usuário dessas aplicações fica fora da visão.' },
  'asm.rule.rumApps.rec': { en: 'Enable Real User Monitoring on these frontends.', 'pt-BR': 'Ativar o Real User Monitoring nesses frontends.' },
  'asm.rule.synthetic.title': { en: 'No synthetic monitor yet', 'pt-BR': 'Ainda sem monitor sintético' },
  'asm.rule.synthetic.obs': {
    en: 'Web applications in the model: {apps}; services with a public domain: {domains}; synthetic monitors: none.',
    'pt-BR': 'Aplicações web no modelo: {apps}; serviços com domínio público: {domains}; monitores sintéticos: nenhum.',
  },
  'asm.rule.synthetic.impact': {
    en: 'Availability is only noticed when a user meets the issue.',
    'pt-BR': 'A disponibilidade só é percebida quando um usuário encontra o problema.',
  },
  'asm.rule.synthetic.rec': { en: 'Add browser and HTTP monitors to the critical journeys and APIs.', 'pt-BR': 'Criar monitores browser e HTTP para as jornadas e APIs críticas.' },
  'asm.rule.saturated.title': { en: 'Hosts saturated at peak: {count}', 'pt-BR': 'Hosts saturados no pico: {count}' },
  'asm.rule.saturated.obs': {
    en: 'Hosts that reached {line}% of CPU or memory at peak in the window: {count}.',
    'pt-BR': 'Hosts que chegaram a {line}% de CPU ou memória no pico da janela: {count}.',
  },
  'asm.rule.saturated.impact': { en: 'Peaks on these hosts can slow the services they run.', 'pt-BR': 'Picos nesses hosts podem deixar lentos os serviços que eles rodam.' },
  'asm.rule.saturated.rec': { en: 'Review the capacity of these hosts on the Infrastructure page.', 'pt-BR': 'Revisar a capacidade desses hosts na página de Infraestrutura.' },
  'asm.rule.bizEvents.title': { en: 'No business event captured yet', 'pt-BR': 'Ainda sem evento de negócio capturado' },
  'asm.rule.bizEvents.obs': { en: 'No business event was captured in the window.', 'pt-BR': 'Nenhum evento de negócio foi capturado na janela.' },
  'asm.rule.bizEvents.impact': {
    en: 'Business indicators (orders, sign-ups, revenue steps) stay out of view next to the technical signals.',
    'pt-BR': 'Indicadores de negócio (pedidos, cadastros, etapas de receita) ficam fora da visão ao lado dos sinais técnicos.',
  },
  'asm.rule.bizEvents.rec': { en: 'Capture the key business steps as business events.', 'pt-BR': 'Capturar as etapas de negócio principais como eventos de negócio.' },
  'asm.rule.strInfra.title': { en: 'Infrastructure observed in depth', 'pt-BR': 'Infraestrutura observada em profundidade' },
  'asm.rule.strInfra.obs': {
    en: '{pct}% of the {total} hosts with a reported mode are observed in full-stack or infrastructure mode.',
    'pt-BR': '{pct}% dos {total} hosts com modo informado são observados em full-stack ou infraestrutura.',
  },
  'asm.rule.strInfra.impact': { en: 'The estate is in view down to the host and its processes.', 'pt-BR': 'O ambiente está visível até o host e seus processos.' },
  'asm.rule.strInfra.rec': { en: 'Keep it as new hosts arrive.', 'pt-BR': 'Manter assim conforme novos hosts chegam.' },
  'asm.rule.strServices.title': { en: 'Services answer reliably', 'pt-BR': 'Os serviços respondem com confiabilidade' },
  'asm.rule.strServices.obs': {
    en: '{pct}% of the {total} services with traffic stayed below 1% failed requests in the window.',
    'pt-BR': '{pct}% dos {total} serviços com tráfego ficaram abaixo de 1% de requisições com falha na janela.',
  },
  'asm.rule.strServices.impact': { en: 'A measured baseline the team can hold itself to.', 'pt-BR': 'Uma linha de base medida que o time pode manter.' },
  'asm.rule.strServices.rec': { en: 'Turn it into service-level objectives.', 'pt-BR': 'Transformar em objetivos de nível de serviço (SLO).' },
  'asm.rule.strResolved.title': { en: 'Problems resolved with a measured time', 'pt-BR': 'Problemas resolvidos com tempo medido' },
  'asm.rule.strResolved.obs': {
    en: 'Problems closed with a measured resolution time: {count}, {hours} h on average.',
    'pt-BR': 'Problemas fechados com tempo de resolução medido: {count}, {hours} h em média.',
  },
  'asm.rule.strResolved.impact': { en: 'The time to resolve is a measured figure, not an estimate.', 'pt-BR': 'O tempo de resolução é um número medido, não uma estimativa.' },
  'asm.rule.strResolved.rec': { en: 'Use it as the baseline to show improvement.', 'pt-BR': 'Usar como linha de base para mostrar a melhoria.' },

  // Assumptions (Help → Assumptions)
  'assumption.group.assessment': { en: 'Coverage', 'pt-BR': 'Cobertura' },
  'assumption.assessment.weight.infra': { en: 'Coverage index: weight of infrastructure', 'pt-BR': 'Índice de cobertura: peso da infraestrutura' },
  'assumption.assessment.weight.infra.basis': { en: 'Share of 100 between the six domains.', 'pt-BR': 'Parcela de 100 entre os seis domínios.' },
  'assumption.assessment.weight.apm': { en: 'Coverage index: weight of applications & services', 'pt-BR': 'Índice de cobertura: peso de aplicações e serviços' },
  'assumption.assessment.weight.apm.basis': { en: 'Share of 100 between the six domains.', 'pt-BR': 'Parcela de 100 entre os seis domínios.' },
  'assumption.assessment.weight.logs': { en: 'Coverage index: weight of logs in context', 'pt-BR': 'Índice de cobertura: peso dos logs com contexto' },
  'assumption.assessment.weight.logs.basis': { en: 'Share of 100 between the six domains.', 'pt-BR': 'Parcela de 100 entre os seis domínios.' },
  'assumption.assessment.weight.k8s': { en: 'Coverage index: weight of Kubernetes', 'pt-BR': 'Índice de cobertura: peso do Kubernetes' },
  'assumption.assessment.weight.k8s.basis': { en: 'Share of 100; out of the sum where there is no cluster.', 'pt-BR': 'Parcela de 100; fora da soma onde não há cluster.' },
  'assumption.assessment.weight.experience': { en: 'Coverage index: weight of digital experience', 'pt-BR': 'Índice de cobertura: peso da experiência digital' },
  'assumption.assessment.weight.experience.basis': { en: 'Share of 100; out of the sum where there is no web application.', 'pt-BR': 'Parcela de 100; fora da soma onde não há aplicação web.' },
  'assumption.assessment.weight.business': { en: 'Coverage index: weight of business events', 'pt-BR': 'Índice de cobertura: peso dos eventos de negócio' },
  'assumption.assessment.weight.business.basis': { en: 'Share of 100; counts presence in the window.', 'pt-BR': 'Parcela de 100; conta a presença na janela.' },
  'assumption.assessment.minWeight': { en: 'Coverage index shown from this share of the weight read', 'pt-BR': 'Índice de cobertura exibido a partir desta parcela do peso lida' },
  'assumption.assessment.minWeight.basis': { en: 'Below it the index shows no number.', 'pt-BR': 'Abaixo dela o índice não mostra número.' },
  'assumption.assessment.infraOnly.max': { en: 'Hosts in infrastructure mode: attention above', 'pt-BR': 'Hosts em modo infraestrutura: atenção acima de' },
  'assumption.assessment.infraOnly.max.basis': { en: 'Raises finding ASM-01.', 'pt-BR': 'Aciona o achado ASM-01.' },
  'assumption.assessment.idleServices.max': { en: 'Services without traffic: attention above', 'pt-BR': 'Serviços sem tráfego: atenção acima de' },
  'assumption.assessment.idleServices.max.basis': { en: 'Raises finding ASM-03.', 'pt-BR': 'Aciona o achado ASM-03.' },
  'assumption.assessment.failing.critical': { en: 'Services above the 1% line: critical from', 'pt-BR': 'Serviços acima da linha de 1%: crítico a partir de' },
  'assumption.assessment.failing.critical.basis': { en: 'Below it, finding ASM-04 is attention.', 'pt-BR': 'Abaixo disso, o achado ASM-04 é de atenção.' },
  'assumption.assessment.strength.infra': { en: 'Infrastructure observed: strength from', 'pt-BR': 'Infraestrutura observada: ponto forte a partir de' },
  'assumption.assessment.strength.infra.basis': { en: 'Raises strength STR-01.', 'pt-BR': 'Aciona o ponto forte STR-01.' },
  'assumption.assessment.strength.services': { en: 'Services below 1% failures: strength from', 'pt-BR': 'Serviços abaixo de 1% de falhas: ponto forte a partir de' },
  'assumption.assessment.strength.services.basis': { en: 'Raises strength STR-02.', 'pt-BR': 'Aciona o ponto forte STR-02.' },

  'help.whatsNew.i73': {
    en: '3.4.0 — the Coverage page: a new page that opens the Coverage stage and answers in one place what exists in this environment, what Dynatrace observes of it (an observable-coverage index from 0 to 100 with its six domains, weights and formula on screen — a domain not read stays out, never a zero), the key findings classed critical, attention, opportunity and strength, risks and opportunities on an impact × effort matrix, a summary written from the measured figures and the recommended actions P1 to P3. No new query, no new permission, no money.',
    'pt-BR': '3.4.0 — a página Cobertura: uma página nova que abre a etapa Cobertura e responde num lugar só o que existe neste ambiente, o que o Dynatrace observa dele (um índice de cobertura observável de 0 a 100 com os seis domínios, pesos e fórmula na tela — um domínio não lido fica fora, nunca vira zero), os principais achados em crítico, atenção, oportunidade e ponto forte, riscos e oportunidades numa matriz impacto × esforço, um resumo escrito a partir dos números medidos e as ações recomendadas de P1 a P3. Nenhuma consulta nova, nenhuma permissão nova, nenhum dinheiro.',
  },
} satisfies Record<string, Entry>;
