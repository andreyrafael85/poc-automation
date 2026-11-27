import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — "Value Evidence Experience" strings.
 *
 * The nine-stage story, the shell (navigation, pager, skip link), the help menu
 * and its panels, the evidence legend and the callout kinds. Merged into the one
 * namespace in `strings.ts`, so a key without a Portuguese entry is a compile
 * error, exactly as for every earlier string.
 *
 * Copy rules: say what is true, say what kind of statement it is (measured,
 * estimated, assumed, recommended), and never promise a saving. Product terms
 * (Dynatrace Intelligence, Grail, Smartscape, OneAgent, DQL) stay in English by customer request.
 */
export const v31Strings = {
  // -------------------------------------------------------------- the story
  'stage.context': { en: 'Context', 'pt-BR': 'Contexto' },
  'stage.context.blurb': {
    en: 'Who this review is for, what was agreed, and the window every figure is read over.',
    'pt-BR': 'Para quem é esta avaliação, o que foi combinado e a janela sobre a qual cada número é lido.',
  },
  'stage.objectives': { en: 'PoC objectives', 'pt-BR': 'Objetivos da PoC' },
  'stage.objectives.blurb': {
    en: 'The journey of the PoC and what it set out to prove.',
    'pt-BR': 'A jornada da PoC e o que ela se propôs a comprovar.',
  },
  'stage.coverage': { en: 'Coverage achieved', 'pt-BR': 'Cobertura alcançada' },
  'stage.coverage.blurb': { en: 'What is monitored, how completely, and how the platform is used.', 'pt-BR': 'O que está monitorado, com que completude e como a plataforma é usada.' },
  'stage.discoveries': { en: 'Discoveries', 'pt-BR': 'Descobertas' },
  'stage.discoveries.blurb': {
    en: 'What Dynatrace found on its own, with no rule written for this review.',
    'pt-BR': 'O que a Dynatrace encontrou por conta própria, sem nenhuma regra escrita para esta avaliação.',
  },
  'stage.evidence': { en: 'Evidence', 'pt-BR': 'Evidências' },
  'stage.evidence.blurb': { en: 'What Dynatrace found on its own, and the measurements behind each finding, traceable down to the query.', 'pt-BR': 'O que a Dynatrace encontrou por conta própria e as medições por trás de cada descoberta, rastreáveis até a consulta.' },
  'stage.value': { en: 'Demonstrated value', 'pt-BR': 'Valor demonstrado' },
  'stage.value.blurb': {
    en: 'The headline for the sponsors, what the PoC proved, and the deliverables that carry it away.',
    'pt-BR': 'O resumo para os patrocinadores, o que a PoC comprovou e os entregáveis que levam isso adiante.',
  },
  'stage.recommendations': { en: 'Recommendations', 'pt-BR': 'Recomendações' },
  'stage.recommendations.blurb': {
    en: 'Improvements, each with the measurement that justifies it, the 30-60-90 action plan, how the platform is used and how to size what comes after the PoC.',
    'pt-BR': 'Melhorias, cada uma com a medição que a justifica, o plano de ação 30-60-90, como a plataforma é usada e como dimensionar o que vem depois da PoC.',
  },

  // ------------------------------------------------------------------ shell
  'shell.nav.label': { en: 'The story of this PoC', 'pt-BR': 'A história desta PoC' },
  'shell.skipToContent': { en: 'Skip to content', 'pt-BR': 'Ir para o conteúdo' },
  'shell.stageOf': { en: 'Stage {n} of {total}', 'pt-BR': 'Etapa {n} de {total}' },
  'shell.pager.label': { en: 'Continue the story', 'pt-BR': 'Continue a história' },
  'shell.pager.previous': { en: 'Previous: {title}', 'pt-BR': 'Anterior: {title}' },
  'shell.pager.next': { en: 'Next: {title}', 'pt-BR': 'Próxima: {title}' },
  'shell.executiveHidden': {
    en: 'Technical pages are hidden in executive mode.',
    'pt-BR': 'As páginas técnicas ficam ocultas no modo executivo.',
  },
  'shell.customer': { en: 'Engagement', 'pt-BR': 'Engajamento' },
  'shell.loadingSection': { en: 'Loading section', 'pt-BR': 'Carregando seção' },
  'shell.loadingSectionText': { en: 'Loading section…', 'pt-BR': 'Carregando seção…' },

  // -------------------------------------------------------------- page frame
  'frame.takeaway': { en: 'What to take from this', 'pt-BR': 'O que levar daqui' },
  'frame.question': { en: 'The question this answers', 'pt-BR': 'A pergunta que isto responde' },

  // -------------------------------------------------------- evidence classes
  'evidence.legend.title': { en: 'How to read the evidence', 'pt-BR': 'Como ler as evidências' },
  'evidence.legend.intro': {
    en: 'Every figure says what kind of statement it is. The icon, the word and the border style carry the meaning — never colour alone.',
    'pt-BR': 'Cada número diz que tipo de afirmação ele é. O ícone, a palavra e o estilo da borda carregam o significado — nunca só a cor.',
  },
  'evidence.legend.solid': { en: 'Solid border: measured or calculated.', 'pt-BR': 'Borda sólida: medido ou calculado.' },
  'evidence.legend.dashed': {
    en: 'Dashed border: an estimate, a hypothesis, or a value that is not available.',
    'pt-BR': 'Borda tracejada: uma estimativa, uma hipótese ou um valor que não está disponível.',
  },
  'evidence.chip.aria': {
    en: 'Evidence class: {label}. Open for its source.',
    'pt-BR': 'Classe de evidência: {label}. Abra para ver a fonte.',
  },
  'evidence.family.measured': { en: 'Measured', 'pt-BR': 'Medido' },
  'evidence.family.interpreted': { en: 'Interpreted', 'pt-BR': 'Interpretado' },
  'evidence.family.unavailable': { en: 'Not available', 'pt-BR': 'Não disponível' },

  'figure.missing': { en: 'Not measured: {reason}', 'pt-BR': 'Não medido: {reason}' },

  // -------------------------------- provenance: a query in flight, a query that failed
  'prov.loading': { en: 'Loading', 'pt-BR': 'Carregando' },
  'prov.failed': { en: 'Failed to read', 'pt-BR': 'Falha na leitura' },
  'prov.unavailable.loading': {
    en: 'Still being read from the environment — this is not an empty result',
    'pt-BR': 'Ainda sendo lido do ambiente — isto não é um resultado vazio',
  },
  'prov.unavailable.failed': {
    en: 'The query failed, so this value could not be read — this is not a count of zero',
    'pt-BR': 'A consulta falhou e este valor não pôde ser lido — isto não é uma contagem zero',
  },
  'prov.desc.loading': {
    en: 'The query behind this value has not answered yet. Nothing is known about it; it is not “no data”.',
    'pt-BR': 'A consulta por trás deste valor ainda não respondeu. Nada se sabe sobre ele; não é “sem dados”.',
  },
  'prov.desc.failed': {
    en: 'The query behind this value returned an error other than a missing permission. Retry it; the value is unknown, not zero.',
    'pt-BR': 'A consulta por trás deste valor retornou um erro que não é falta de permissão. Tente de novo; o valor é desconhecido, não zero.',
  },

  'c.fact.scanLimitNote': {
    en: 'The scan limit stopped this query early, so this is a lower bound (at least), not the full figure.',
    'pt-BR': 'O limite de varredura interrompeu esta consulta mais cedo, então este é um piso (no mínimo), não o valor completo.',
  },

  'common.of': { en: 'of', 'pt-BR': 'de' },
  'common.unknown': { en: 'Unknown', 'pt-BR': 'Desconhecido' },
  'common.unnamed': { en: 'Unnamed', 'pt-BR': 'Sem nome' },
  'common.unnamedHost': { en: 'Unnamed host', 'pt-BR': 'Host sem nome' },
  'common.underMaintenance': { en: 'Under maintenance', 'pt-BR': 'Em manutenção' },
  'common.otherCloud': { en: 'Other cloud', 'pt-BR': 'Outra nuvem' },
  'c.capacity.showing': { en: 'Showing {shown} of {total} hosts, busiest and emptiest first.', 'pt-BR': 'Exibindo {shown} de {total} hosts, os mais ocupados e os mais ociosos primeiro.' },
  'c.capacity.showAll': { en: 'Show all {total} hosts', 'pt-BR': 'Mostrar todos os {total} hosts' },
  'c.capacity.showFewer': { en: 'Show the first {count}', 'pt-BR': 'Mostrar apenas os primeiros {count}' },
  'report.sec.failed': {
    en: 'The security-findings query did not complete, so no figure is shown. That is a gap in this report, not a clean result.',
    'pt-BR': 'A consulta de achados de segurança não foi concluída, então nenhum número é exibido. Isso é uma lacuna deste relatório, não um resultado limpo.',
  },
  'gap.security.bodyEmpty': {
    en: 'The security findings query ran and returned no open vulnerability in this window. That is what was read; it is not proof of a clean estate, because Runtime Vulnerability Analytics may not be enabled on every host.',
    'pt-BR': 'A consulta de achados de segurança foi executada e não retornou vulnerabilidade aberta nesta janela. Isso é o que foi lido; não prova um ambiente limpo, porque o Runtime Vulnerability Analytics pode não estar ativo em todos os hosts.',
  },
  'common.unit.dataSources': { en: 'data sources', 'pt-BR': 'fontes de dados' },
  'common.unit.gibPerDay': { en: 'GiB/day', 'pt-BR': 'GiB/dia' },
  'p.lic.driver.sessions': { en: 'Real user sessions', 'pt-BR': 'Sessões de usuários reais' },
  'p.lic.driver.monitors': { en: 'Synthetic monitors', 'pt-BR': 'Monitores sintéticos' },
  'p.lic.driver.logs': { en: 'Log volume', 'pt-BR': 'Volume de logs' },
  'p.lic.driver.appsec': { en: 'Application Security host memory', 'pt-BR': 'Memória de hosts do Application Security' },
  'p.lic.unit.sessions': { en: 'sessions', 'pt-BR': 'sessões' },
  'p.lic.unit.monitors': { en: 'monitors', 'pt-BR': 'monitores' },
  'common.unit.open': { en: 'open', 'pt-BR': 'abertos' },
  'f.score.status.unread': { en: 'Not read', 'pt-BR': 'Não lido' },
  'f.score.unread.refused': {
    en: 'This source was refused for lack of a scope, so no figure is stated. That is a limit of the review, not a finding.',
    'pt-BR': 'Esta fonte foi recusada por falta de escopo, então nenhum número é informado. É um limite da revisão, não um achado.',
  },
  'f.score.unread.failed': {
    en: 'This source did not answer, so no figure is stated. That is a limit of the review, not a finding.',
    'pt-BR': 'Esta fonte não respondeu, então nenhum número é informado. É um limite da revisão, não um achado.',
  },
  'f.score.d.anomaly.empty': {
    en: 'The problem feed answered with no problems in this window. That says nothing about detection, only that none were raised.',
    'pt-BR': 'O feed de problemas respondeu sem nenhum problema nesta janela. Isso não diz nada sobre a detecção, apenas que nenhum foi levantado.',
  },
  'verdict.mttrLabel.bare': { en: 'mean time to resolve', 'pt-BR': 'tempo médio de resolução' },
  // Singular forms, chosen by `pluralKey` / `tCount` when the count is exactly 1.
  'metric.mttrDetail.one': { en: 'Across {count} resolved problem', 'pt-BR': 'Sobre {count} problema resolvido' },
  'report.exec.downtimeDetail.one': { en: 'across {count} availability problem', 'pt-BR': 'em {count} problema de disponibilidade' },
  'roi.unit.tools.one': { en: 'tool', 'pt-BR': 'ferramenta' },
  'verdict.mttrLabel.one': { en: 'mean time to resolve · {count} problem resolved', 'pt-BR': 'tempo médio de resolução · {count} problema resolvido' },
  'p.opp.count.one': { en: '{count} opportunity, with its impact and effort', 'pt-BR': '{count} oportunidade, com seu impacto e esforço' },
  'disc.count.one': {
    en: '{count} finding from the {window}, generated from a measurement',
    'pt-BR': '{count} achado no período {window}, gerado a partir de uma medição',
  },
  'common.agentsCount': { en: '{n} agents', 'pt-BR': '{n} agentes' },
  'common.agentsCount.one': { en: '{n} agent', 'pt-BR': '{n} agente' },
  'common.competitorAgentsCount': { en: '{n} competitor agents', 'pt-BR': '{n} agentes de concorrentes' },
  'common.competitorAgentsCount.one': { en: '{n} competitor agent', 'pt-BR': '{n} agente de concorrente' },
  'common.toolsCount': { en: '{n} tools', 'pt-BR': '{n} ferramentas' },
  'common.toolsCount.one': { en: '{n} tool', 'pt-BR': '{n} ferramenta' },
  'comp.unit.agents.one': { en: 'agent', 'pt-BR': 'agente' },
  'p.cloud.card.hosts.one': { en: '{hosts} host monitored', 'pt-BR': '{hosts} host monitorado' },
  'p.tech.band.topDetail.one': { en: '{count} instance', 'pt-BR': '{count} instância' },
  'roadmap.itemCount.one': { en: '{count} item', 'pt-BR': '{count} item' },
  'p.biz.band.busiestDetail.one': { en: '{count} event', 'pt-BR': '{count} evento' },
  'p.k8s.band.restartingDetail.one': { en: '{total} restart in total', 'pt-BR': '{total} restart no total' },
  'p.auto.failingCount.one': { en: '{count} workflow is failing on a schedule', 'pt-BR': '{count} workflow está falhando de forma recorrente' },
  'p.svc.aboveTitle.one': { en: '{count} service above a 1% failure rate', 'pt-BR': '{count} serviço acima de 1% de taxa de falha' },
  'p.cov.unreadableTitle.one': { en: '{count} bucket is not readable by the signed-in identity', 'pt-BR': '{count} bucket não é legível pela identidade autenticada' },
  'p.rca.trail.blast.one': { en: '{count} entity in the blast radius, mapped automatically', 'pt-BR': '{count} entidade no raio de impacto, mapeada automaticamente' },
  'common.notApplicable': { en: 'Not applicable', 'pt-BR': 'Não se aplica' },
  'common.unnamedService': { en: 'Unnamed service', 'pt-BR': 'Serviço sem nome' },
  'common.untitledWorkflow': { en: 'Untitled workflow', 'pt-BR': 'Workflow sem título' },
  'common.versionNotReported': { en: 'Version not reported', 'pt-BR': 'Versão não informada' },
  'cost.step.revenueHour': {
    en: '{revenue} ÷ {hours} h = {perHour} per operating hour',
    'pt-BR': '{revenue} ÷ {hours} h = {perHour} por hora de operação',
  },
  'cost.step.revenueShare': {
    en: '× {share}% interrupted = {amount} of revenue per hour of outage',
    'pt-BR': '× {share}% interrompido = {amount} de receita por hora de indisponibilidade',
  },
  'cost.step.productivity': {
    en: '{people} people × {wage} loaded per hour × {loss}% lost = {amount} of productivity per hour of outage',
    'pt-BR': '{people} pessoas × {wage} de custo total por hora × {loss}% perdido = {amount} de produtividade por hora de indisponibilidade',
  },
  'cost.step.total': {
    en: 'Total suggested downtime rate = {amount} per hour',
    'pt-BR': 'Taxa de indisponibilidade sugerida total = {amount} por hora',
  },
  'exec.slowest.note': {
    en: 'Mean resolution time {time} across {count} {count|problem|problems}.',
    'pt-BR': 'Tempo médio de resolução de {time} em {count} {count|problema|problemas}.',
  },

  // ------------------------------------------------------ query state wording
  'state.loadingAria': { en: 'Running {id}', 'pt-BR': 'Executando {id}' },
  'state.error.generic': {
    en: 'The platform returned an unexpected error.',
    'pt-BR': 'A plataforma retornou um erro inesperado.',
  },

  // ------------------------------------------------------------ callout kinds
  'callout.note': { en: 'Note', 'pt-BR': 'Nota' },
  'callout.assumption': { en: 'Assumption', 'pt-BR': 'Premissa' },
  'callout.estimate': { en: 'Estimate', 'pt-BR': 'Estimativa' },
  // 3.2.6: "Limitation" read as a fault of the platform in a customer deliverable; a reading note it is.
  'callout.limitation': { en: 'Reading note', 'pt-BR': 'Nota de leitura' },
  'callout.recommendation': { en: 'Recommendation', 'pt-BR': 'Recomendação' },
  'callout.pending': { en: 'Pending', 'pt-BR': 'Pendente' },

  // ------------------------------------------------------------- overview
  'story.map.title': { en: 'The story of this PoC', 'pt-BR': 'A história desta PoC' },
  'story.map.subtitle': {
    en: 'Seven stages, from context to recommendations, then Settings & Build. Open any stage, in any order.',
    'pt-BR': 'Sete etapas, do contexto às recomendações, e por fim Configurações & Construção. Abra qualquer etapa, em qualquer ordem.',
  },
  'story.map.pages': { en: '{count} pages', 'pt-BR': '{count} páginas' },
  'story.map.page': { en: '1 page', 'pt-BR': '1 página' },
  'story.map.open': { en: 'Open {stage}', 'pt-BR': 'Abrir {stage}' },

  // ------------------------------------------------------------------- help
  'help.label': { en: 'Help', 'pt-BR': 'Ajuda' },
  'help.guide': { en: 'How to use this app', 'pt-BR': 'Como usar este app' },
  'help.methodology': { en: 'Methodology', 'pt-BR': 'Metodologia' },
  'help.sources': { en: 'Data sources', 'pt-BR': 'Fontes dos dados' },
  'help.about': { en: 'About this app', 'pt-BR': 'Sobre este app' },
  'help.whatsNew': { en: 'What’s new in {version}', 'pt-BR': 'Novidades da {version}' },
  'help.feedback': { en: 'Send feedback', 'pt-BR': 'Enviar feedback' },
  'help.docs.dqlBestPractices': { en: 'DQL best practices', 'pt-BR': 'Boas práticas de DQL' },
  'help.docs.logsBestPractices': {
    en: 'Log Management and Analytics best practices',
    'pt-BR': 'Boas práticas de Log Management and Analytics',
  },
  'help.close': { en: 'Close', 'pt-BR': 'Fechar' },

  'help.guide.title': { en: 'How to use this app', 'pt-BR': 'Como usar este app' },
  'help.guide.s1': {
    en: 'Open Settings and enter the customer, the engagement and the scope that was actually agreed. It is saved on the tenant and is still there the next time you open the app.',
    'pt-BR': 'Abra Configurações e informe o cliente, o engajamento e o escopo que foi de fato combinado. Fica salvo na tenant e continua lá na próxima vez que você abrir o app.',
  },
  'help.guide.s2': {
    en: 'Choose the window in the header. Every figure is read over that one fixed window, so numbers do not move while they are discussed. Press Refresh to move it to the present.',
    'pt-BR': 'Escolha o período no cabeçalho. Todos os números são lidos sobre essa janela fixa, para não mudarem enquanto são discutidos. Use Atualizar para movê-la ao presente.',
  },
  'help.guide.s3': {
    en: 'Follow the story in the left navigation, or open the story map on the Overview. Each page starts with the question it answers and ends with a link to the next stage.',
    'pt-BR': 'Siga a história na navegação à esquerda ou abra o mapa da história na Visão geral. Cada página começa pela pergunta que responde e termina com um link para a próxima etapa.',
  },
  'help.guide.s4': {
    en: 'Open the badge beside any figure to see its class, the query behind it and its window. Expand “Queries behind this section” to copy the exact DQL.',
    'pt-BR': 'Abra o selo ao lado de qualquer número para ver sua classe, a consulta por trás dele e a janela. Expanda “Consultas por trás desta seção” para copiar a DQL exata.',
  },
  'help.guide.s5': {
    en: 'Use Executive mode to hide technical pages and DQL for a business audience. Nothing is deleted; switch it off to return to the full story.',
    'pt-BR': 'Use o Modo executivo para ocultar páginas técnicas e a DQL para um público de negócio. Nada é apagado; desative para voltar à história completa.',
  },

  'help.methodology.title': { en: 'Methodology', 'pt-BR': 'Metodologia' },
  'help.methodology.p1': {
    en: 'Every number comes from a query against your Dynatrace environment. There is no sample data and no demo mode: if a figure is on screen, it was read from the environment, and if it could not be read the app says why instead of showing zero.',
    'pt-BR': 'Todo número vem de uma consulta ao seu ambiente Dynatrace. Não há dados de exemplo nem modo demo: se um número está na tela, ele foi lido do ambiente, e se não pôde ser lido o app diz por quê, em vez de mostrar zero.',
  },
  'help.methodology.p2': {
    en: 'Measured values are read verbatim. Calculated values are arithmetic over measured ones and say so. Estimates, hypotheses and recommendations are labelled as such and are never presented as facts.',
    'pt-BR': 'Valores medidos são lidos literalmente. Valores calculados são aritmética sobre os medidos e dizem isso. Estimativas, hipóteses e recomendações são rotuladas como tal e nunca apresentadas como fatos.',
  },
  'help.methodology.p3': {
    en: 'Money is shown only when you supply the rate, and always as an estimate with its arithmetic visible. Measured data alone never supports a saving or an MTTR reduction; where the Value page compares against a baseline, that baseline is the figure you entered, so the comparison is only as good as that figure.',
    'pt-BR': 'O dinheiro só aparece quando você informa a taxa, e sempre como estimativa, com a conta à vista. Dados medidos, sozinhos, nunca sustentam uma economia ou uma redução de MTTR; quando a página Valor compara com uma baseline, essa baseline é o número que você informou, então a comparação vale tanto quanto esse número.',
  },
  'help.methodology.p4': {
    en: 'Amber and red mark a measured condition in the environment worth reviewing. They are never used to say that this app could not read something, or to colour a headline.',
    'pt-BR': 'Âmbar e vermelho marcam uma condição medida no ambiente que merece revisão. Nunca são usados para dizer que este app não conseguiu ler algo, nem para colorir um título.',
  },

  'help.sources.title': { en: 'Data sources', 'pt-BR': 'Fontes dos dados' },
  'help.sources.p1': {
    en: 'Read through DQL from Grail with read scopes: entities and Smartscape, problems and events, metrics, logs, business events, system events (billing, workflows, query execution), bucket metadata, security events and user sessions.',
    'pt-BR': 'Lidos por DQL do Grail com escopos de leitura: entidades e Smartscape, problemas e eventos, métricas, logs, eventos de negócio, eventos de sistema (billing, workflows, execução de consultas), metadados de buckets, eventos de segurança e sessões de usuário.',
  },
  'help.sources.p2': {
    en: 'The app reads your telemetry and never changes it. What it writes is its own: the App State of this tenant — the PoC configuration (customer, scope, logos, pillars, partner access), readable by every user of the app, and each SE’s working figures, readable only by that SE — and, through the Document Service, documents the SE asks for by name: the “Value of the PoC” dashboard, created only by the SE’s own click in Settings, and the SE’s private set of real screenshots behind the prints tab. “New PoC” in Settings clears the App State and empties the print set.',
    'pt-BR': 'O app lê a sua telemetria e nunca a altera. O que ele grava é dele: o App State desta tenant — a configuração da PoC (cliente, escopo, logos, pilares, acesso de parceiros), legível por todos os usuários do app, e os números de trabalho de cada SE, legíveis só por ele — e, pelo Document Service, documentos que o SE pede pelo nome: o dashboard “Valor da PoC”, criado só pelo clique do próprio SE em Configurações, e o conjunto privado de telas reais da aba de prints. “Nova PoC”, em Configurações, limpa o App State e esvazia o conjunto de prints.',
  },
  'help.sources.p3': {
    en: 'Two scopes degrade by design when the signed-in identity does not hold them: security events and user sessions. The page then names the missing scope instead of reading as a clean result.',
    'pt-BR': 'Dois escopos degradam por desenho quando a identidade logada não os possui: eventos de segurança e sessões de usuário. A página então nomeia o escopo ausente em vez de parecer um resultado limpo.',
  },

  'help.about.title': { en: 'About PoC Automation 3.0', 'pt-BR': 'Sobre o PoC Automation 3.0' },
  'help.about.tagline': {
    en: 'Turns the telemetry collected during a proof of concept into a traceable, auditable story of value.',
    'pt-BR': 'Transforma a telemetria coletada durante uma prova de conceito em uma história de valor rastreável e auditável.',
  },
  'help.about.version': { en: 'Version', 'pt-BR': 'Versão' },
  'help.about.concept': { en: 'Design concept', 'pt-BR': 'Conceito de design' },
  'help.about.conceptName': { en: 'Value Evidence Experience', 'pt-BR': 'Value Evidence Experience' },
  'help.about.creator': { en: 'Creator', 'pt-BR': 'Criador' },
  'help.about.contact': { en: 'Contact', 'pt-BR': 'Contato' },

  'help.whatsNew.title': { en: 'What’s new in 3.8', 'pt-BR': 'Novidades da 3.8' },
  'help.whatsNew.intro': {
    en: 'Version 3.8 builds on 3.7’s value cycle and its own workflow actions: the PoC Builder creates dashboards, notebooks, a launchpad, SLOs, monitors and anomaly detectors on the SE’s click, each kept in the Register for the clean-up. Every figure keeps its query, and what was not read is never shown as zero. The last ten releases follow, newest first.',
    'pt-BR': 'A versão 3.8 parte do ciclo de valor e das ações de workflow da 3.7: o PoC Builder cria dashboards, notebooks, um launchpad, SLOs, monitores e detectores de anomalia no clique do SE, cada um guardado no Registro para a limpeza. Cada número mantém a sua consulta, e o que não foi lido nunca aparece como zero. Abaixo, as dez últimas releases, da mais nova à mais antiga.',
  },
  'help.whatsNew.i1': {
    en: 'A story-led navigation: nine stages from Context to Next steps replace the flat list of pages.',
    'pt-BR': 'Uma navegação guiada pela história: nove etapas, de Contexto a Próximos passos, substituem a lista plana de páginas.',
  },
  'help.whatsNew.i2': {
    en: '3.1 — An evidence-first look: flat Strato surfaces replaced glass, aurora and neon. 3.2.1 brings colour back from Strato’s own chart palettes, on the same evidence rules.',
    'pt-BR': '3.1 — Um visual orientado à evidência: superfícies planas do Strato substituíram vidro, aurora e neon. A 3.2.1 traz a cor de volta a partir das paletas de gráfico do próprio Strato, com as mesmas regras de evidência.',
  },
  'help.whatsNew.i3': {
    en: 'Evidence classes you can tell apart without colour: an icon, a word and a border style for measured, calculated, at-least, platform-estimate, projected, recommended, hypothesised and unavailable values.',
    'pt-BR': 'Classes de evidência distinguíveis sem cor: um ícone, uma palavra e um estilo de borda para valores medidos, calculados, no mínimo, estimativa da plataforma, projetados, recomendados, hipotéticos e indisponíveis.',
  },
  'help.whatsNew.i4': {
    en: 'Keyboard-operable cards, a skip link, visible focus, reduced-motion support and layouts that follow the width of the content area.',
    'pt-BR': 'Cards operáveis por teclado, link de salto, foco visível, suporte a movimento reduzido e layouts que acompanham a largura da área de conteúdo.',
  },
  'help.whatsNew.i5': {
    en: 'A built-in help menu with a guide, the methodology, the data sources and this list.',
    'pt-BR': 'Um menu de ajuda embutido com um guia, a metodologia, as fontes dos dados e esta lista.',
  },
  'help.whatsNew.i6': {
    en: '3.1.1 — Every total is counted over all of your data. A list that stops at a limit (500 vulnerabilities, 1,000 hosts, 25 workloads, 25 event types…) is labelled “top N of TOTAL” and never stands in for a total.',
    'pt-BR': '3.1.1 — Todo total é contado sobre todos os seus dados. Uma lista que para em um limite (500 vulnerabilidades, 1.000 hosts, 25 workloads, 25 tipos de evento…) é rotulada “top N de TOTAL” e nunca substitui um total.',
  },
  'help.whatsNew.i7': {
    en: '3.1.1 — Peaks are true peaks, unique users are never added across applications, and “estimated” is kept for what really is an estimate or a projection, with its assumptions shown.',
    'pt-BR': '3.1.1 — Picos são picos reais, usuários únicos nunca são somados entre aplicações, e “estimado” fica reservado ao que de fato é estimativa ou projeção, com as premissas à mostra.',
  },
  'help.whatsNew.i8': {
    en: '3.2.0 — Your configuration is kept on the tenant. Customer name, scope, logos and the rest survive leaving the app, closing the browser and app updates. “New PoC” in Settings clears it, after a second confirmation.',
    'pt-BR': '3.2.0 — Sua configuração fica salva na tenant. Nome do cliente, escopo, logos e o restante sobrevivem a sair do app, fechar o navegador e atualizar o app. “Nova PoC” em Configurações limpa tudo, após uma segunda confirmação.',
  },
  'help.whatsNew.i9': {
    en: '3.2.0 — The app is for Dynatrace SEs and their partners. A partner enters the PoC password on a short sign-in screen; a customer sees only the read-only executive view. Licence sizing, DPS rates and cost stay behind the “Commercial data” switch, off by default.',
    'pt-BR': '3.2.0 — O app é para SEs da Dynatrace e seus parceiros. O parceiro digita a senha da PoC numa tela curta de acesso; o cliente vê apenas a visão executiva, somente leitura. Dimensionamento de licenças, taxas DPS e custo ficam atrás da chave “Dados comerciais”, desligada por padrão.',
  },
  'help.whatsNew.i10': {
    en: '3.2.0 — “Estimated” is now three things you can tell apart: At least (a read that stopped early), Platform estimate (a count Dynatrace itself estimates) and Projection (a calculation from assumptions you can change).',
    'pt-BR': '3.2.0 — “Estimado” agora são três coisas distintas: No mínimo (uma leitura que parou antes), Estimativa da plataforma (uma contagem que a própria Dynatrace estima) e Projeção (um cálculo a partir de premissas que você pode mudar).',
  },
  'help.whatsNew.i11': {
    en: '3.2.0 — Every rule behind a verdict (a host peaking at 90 % is saturated, a resolution time up to 4 h is good…) is listed under Help → Assumptions with its origin, and the deck and the app now judge the same figure the same way.',
    'pt-BR': '3.2.0 — Toda regra por trás de um veredito (host com pico de 90 % é saturado, tempo de resolução até 4 h é bom…) está listada em Ajuda → Premissas com a origem, e o deck e o app agora julgam o mesmo número do mesmo jeito.',
  },
  'help.whatsNew.i12': {
    en: '3.2.0 — Each query shows when it was read (“read at 10:02”). “Auto-resolved” became “Problems closed” and “Coverage %” became “Categories with telemetry”, because that is what they measure.',
    'pt-BR': '3.2.0 — Cada consulta mostra quando foi lida (“lido às 10:02”). “Auto-resolvidos” virou “Problemas encerrados” e “Cobertura %” virou “Categorias com telemetria”, porque é isso que medem.',
  },
} as const satisfies Record<string, Entry>;
