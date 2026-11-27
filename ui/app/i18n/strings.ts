/**
 * Translation dictionary.
 *
 * Typed so that adding a key without a Portuguese translation is a compile
 * error, not a string that silently falls back to English in front of a
 * customer. `Record<Locale, string>` on every entry is what enforces that.
 *
 * Scope: the whole UI. `scripts/scan-untranslated.mjs` (run by `translationCoverage.test.ts`)
 * fails the build on any literal left in a component, so there is no English remainder; the
 * fragments below are split by the release that added them, which is the debt the v3.3 backlog
 * calls TD-11 (consolidating them by domain is what unblocks a third language).
 *
 * Interpolation is deliberately minimal: `{name}` placeholders only, no plural
 * or date machinery. Numbers and dates are formatted with `toLocaleString`
 * against the active locale instead.
 */

import { type Entry, type Locale } from './locales';
import { pageStrings } from './pages';
import { v2Strings } from './v2';
import { v31Strings } from './v31';
import { v31AStrings } from './v31a';
import { v31BStrings } from './v31b';
import { v31CStrings } from './v31c';
import { v31DStrings } from './v31d';
import { v31EStrings } from './v31e';
import { v31FStrings } from './v31f';
import { v32Strings } from './v32';
import { v32aStrings } from './v32a';
import { v321Strings } from './v321';
import { v323Strings } from './v323';
import { v324Strings } from './v324';
import { v325Strings } from './v325';
import { v326Strings } from './v326';
import { v327Strings } from './v327';
import { v327PrintsStrings } from './v327prints';
import { v327Wp2Strings } from './v327wp2';
import { v327Wp3Strings } from './v327wp3';
import { v327Wp4Strings } from './v327wp4';
import { v327Wp5Strings } from './v327wp5';
import { v327Wp6Strings } from './v327wp6';
import { v327Wp7Strings } from './v327wp7';
import { v327Wp8Strings } from './v327wp8';
import { v33Strings } from './v33';
import { v332CapsStrings } from './v332caps';
import { v332CatStrings } from './v332cat';
import { v332PrintsStrings } from './v332prints';
import { v333DeckStrings } from './v333deck';
import { v334DashStrings } from './v334dash';
import { v335Strings } from './v335';
import { v336Strings } from './v336';
import { v337Strings } from './v337';
import { v338Strings } from './v338';
import { v339Strings } from './v339';
import { v3310Strings } from './v3310';
import { v3311Strings } from './v3311';
import { v3312Strings } from './v3312';
import { v3313Strings } from './v3313';
import { v3314Strings } from './v3314';
import { v3315Strings } from './v3315';
import { v3316Strings } from './v3316';
import { v3317Strings } from './v3317';
import { v3318Strings } from './v3318';
import { v3319Strings } from './v3319';
import { v3320Strings } from './v3320';
import { v3321Strings } from './v3321';
import { v340Strings } from './v340';
import { v341Strings } from './v341';
import { v342Strings } from './v342';
import { v343Strings } from './v343';
import { v344Strings } from './v344';
import { v345Strings } from './v345';
import { v346Strings } from './v346';
import { v347Strings } from './v347';
import { v348Strings } from './v348';
import { v349Strings } from './v349';
import { v3410Strings } from './v3410';
import { v3411Strings } from './v3411';
import { v3412Strings } from './v3412';
import { v3413Strings } from './v3413';
import { v3414Strings } from './v3414';
import { v3415Strings } from './v3415';
import { v3416Strings } from './v3416';
import { v3417Strings } from './v3417';
import { v3418Strings } from './v3418';
import { v350Strings } from './v350';
import { v351Strings } from './v351';
import { v352Strings } from './v352';
import { v353Strings } from './v353';
import { v354Strings } from './v354';
import { v355Strings } from './v355';
import { v356Strings } from './v356';
import { v357Strings } from './v357';
import { v358Strings } from './v358';
import { v359Strings } from './v359';
import { v360Strings } from './v360';
import { v361Strings } from './v361';
import { v362Strings } from './v362';
import { v363Strings } from './v363';
import { v364Strings } from './v364';
import { v365Strings } from './v365';
import { v366Strings } from './v366';
import { v367Strings } from './v367';
import { v368Strings } from './v368';
import { v369Strings } from './v369';
import { v370Strings } from './v370';
import { v371Strings } from './v371';
import { v372Strings } from './v372';
import { v373Strings } from './v373';
import { v374Strings } from './v374';
import { v375Strings } from './v375';
import { v376Strings } from './v376';
import { v377Strings } from './v377';
import { v378Strings } from './v378';
import { v379Strings } from './v379';
import { v380Strings } from './v380';
import { v381Strings } from './v381';

export { LOCALES, LOCALE_LABELS, LOCALE_TAG, type Locale, type Entry } from './locales';

export const coreStrings = {
  // ------------------------------------------------------------------ shell
  'shell.refresh': { en: 'Refresh', 'pt-BR': 'Atualizar' },
  'shell.window': { en: 'Window', 'pt-BR': 'Período' },
  'shell.asOf': { en: 'as of {time}', 'pt-BR': 'em {time}' },
  'shell.language': { en: 'Language', 'pt-BR': 'Idioma' },
  'shell.presentationMode': { en: 'Presentation mode', 'pt-BR': 'Modo apresentação' },
  'shell.executiveMode': { en: 'Executive mode', 'pt-BR': 'Modo executivo' },
  'shell.windowExplain': {
    en: 'Every figure in the app is read over one fixed window, so numbers do not shift while they are being discussed.',
    'pt-BR':
      'Todos os números do app são lidos sobre uma janela fixa, para que não mudem enquanto estão sendo discutidos.',
  },
  'shell.windowRefreshHint': {
    en: 'Press refresh to move the window to the present.',
    'pt-BR': 'Use Atualizar para mover a janela até o momento atual.',
  },
  'shell.from': { en: 'From', 'pt-BR': 'De' },
  'shell.to': { en: 'To', 'pt-BR': 'Até' },

  // ------------------------------------------------------------ timeframes
  'timeframe.now-1h': { en: 'Last hour', 'pt-BR': 'Última hora' },
  'timeframe.now-6h': { en: 'Last 6 hours', 'pt-BR': 'Últimas 6 horas' },
  'timeframe.now-24h': { en: 'Last 24 hours', 'pt-BR': 'Últimas 24 horas' },
  'timeframe.now-7d': { en: 'Last 7 days', 'pt-BR': 'Últimos 7 dias' },
  'timeframe.now-30d': { en: 'Last 30 days', 'pt-BR': 'Últimos 30 dias' },

  // ------------------------------------------------------------ navigation
  'nav.overview': { en: 'Overview', 'pt-BR': 'Visão geral' },
  'nav.executive': { en: 'Executive summary', 'pt-BR': 'Resumo executivo' },
  'nav.coverage': { en: 'Coverage', 'pt-BR': 'Cobertura' },
  'nav.problems': { en: 'Problems & Dynatrace Intelligence', 'pt-BR': 'Problemas & Dynatrace Intelligence' },
  'nav.topology': { en: 'Topology', 'pt-BR': 'Topologia' },
  'nav.services': { en: 'Services & tracing', 'pt-BR': 'Serviços & tracing' },
  'nav.infrastructure': { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
  'nav.cloud': { en: 'Cloud', 'pt-BR': 'Cloud' },
  'nav.kubernetes': { en: 'Kubernetes', 'pt-BR': 'Kubernetes' },
  'nav.technologies': { en: 'Technologies', 'pt-BR': 'Tecnologias' },
  'nav.logs': { en: 'Logs & data quality', 'pt-BR': 'Logs & qualidade de dados' },
  'nav.consumption': { en: 'Consumption and events', 'pt-BR': 'Consumo e eventos' },
  'nav.licensing': { en: 'Licensing', 'pt-BR': 'Licenciamento' },
  'nav.automation': { en: 'Automation', 'pt-BR': 'Automação' },
  'nav.business': { en: 'Business events', 'pt-BR': 'Eventos de negócio' },
  'nav.security': { en: 'Security', 'pt-BR': 'Segurança' },
  'nav.experience': { en: 'Digital experience', 'pt-BR': 'Experiência digital' },
  'nav.opportunities': { en: 'Opportunities', 'pt-BR': 'Oportunidades' },
  'nav.story': { en: 'Demo story', 'pt-BR': 'Roteiro de demo' },
  'nav.report': { en: 'SE Report', 'pt-BR': 'Relatório SE' },
  'nav.evidence': { en: 'Evidence', 'pt-BR': 'Evidências' },
  'nav.roadmap': { en: '30-60-90 action plan', 'pt-BR': 'Plano de ação 30-60-90' },
  'nav.appendix': { en: 'Appendix', 'pt-BR': 'Apêndice' },
  'nav.settings': { en: 'Settings', 'pt-BR': 'Configurações' },

  // -------------------------------------------------------- result states
  'state.loading': {
    en: 'Querying {domain} over the {window}…',
    'pt-BR': 'Consultando {domain} no período: {window}…',
  },
  'state.noPermission.title': {
    en: 'Insufficient permission for this source',
    'pt-BR': 'Permissão insuficiente para esta fonte',
  },
  'state.noPermission.body': {
    en: 'The signed-in identity cannot read the data behind this section. This is a permission gap, not evidence that the environment is free of findings.',
    'pt-BR':
      'A identidade autenticada não consegue ler os dados desta seção. Isto é uma lacuna de permissão, não evidência de que o ambiente esteja livre de achados.',
  },
  'state.noPermission.scope': { en: 'Scope required:', 'pt-BR': 'Escopo necessário:' },
  'state.empty.title': {
    en: 'No data available in the current PoC scope',
    'pt-BR': 'Nenhum dado disponível no escopo atual da PoC',
  },
  'state.empty.body': {
    en: 'The query returned no records for the {window}. This says nothing about whether the underlying capability is healthy — only that no telemetry was produced in this window.',
    'pt-BR':
      'A consulta não retornou registros no período: {window}. Isso não diz nada sobre a saúde do recurso subjacente — apenas que nenhuma telemetria foi produzida nesta janela.',
  },
  'state.scanLimit.title': {
    en: 'Partial result: scan limit reached',
    'pt-BR': 'Resultado parcial: limite de varredura atingido',
  },
  'state.scanLimit.body': {
    en: 'The query stopped at its scan ceiling. What follows is a partial view: every count is a lower bound (at least), not the full figure. Narrow the timeframe for a complete answer.',
    'pt-BR':
      'A consulta parou no teto de varredura. O que segue é uma visão parcial: cada contagem é um piso (no mínimo), não o valor completo. Reduza o período para uma resposta completa.',
  },
  'state.error.title': {
    en: 'The query could not be completed',
    'pt-BR': 'A consulta não pôde ser concluída',
  },
  'state.retry': { en: 'Retry', 'pt-BR': 'Tentar novamente' },
  'state.query': { en: 'Query', 'pt-BR': 'Consulta' },
  'state.notMeasured': { en: 'Not measured', 'pt-BR': 'Não medido' },

  // ------------------------------------------------------------ provenance
  'prov.observed': { en: 'Observed', 'pt-BR': 'Observado' },
  'prov.derived': { en: 'Derived', 'pt-BR': 'Derivado' },
  'prov.partial': { en: 'At least', 'pt-BR': 'No mínimo' },
  'prov.platform-estimate': { en: 'Platform estimate', 'pt-BR': 'Estimativa da plataforma' },
  'prov.projection': { en: 'Projection', 'pt-BR': 'Projeção' },
  'prov.recommendation': { en: 'Recommendation', 'pt-BR': 'Recomendação' },
  'prov.hypothesis': { en: 'Needs validation', 'pt-BR': 'Requer validação' },
  'prov.not-configured': { en: 'Not configured', 'pt-BR': 'Não configurado' },
  'prov.no-telemetry': { en: 'No telemetry', 'pt-BR': 'Sem telemetria' },
  'prov.no-permission': { en: 'No permission', 'pt-BR': 'Sem permissão' },

  // -------------------------------------------------------- entity outage
  'entity.outage.title': {
    en: 'Inventory counts are unavailable — this is not a count of zero',
    'pt-BR': 'Contagens de inventário indisponíveis — isto não é uma contagem zero',
  },
  'entity.outage.body': {
    en: 'Every entity category returned zero at once. Metrics and events from this environment are still arriving normally, so this is the entity model not answering rather than an environment with nothing in it. Counts are therefore reported as not measured, not as zero.',
    'pt-BR':
      'Todas as categorias de entidade retornaram zero ao mesmo tempo. Métricas e eventos deste ambiente continuam chegando normalmente, ou seja, o modelo de entidades não está respondendo — não se trata de um ambiente vazio. Por isso as contagens são reportadas como não medidas, e não como zero.',
  },
  'entity.outage.scope': {
    en: 'Affected: inventory, topology and technologies. Unaffected: problems, resolution times, metrics, logs, consumption and automation.',
    'pt-BR':
      'Afetados: inventário, topologia e tecnologias. Não afetados: problemas, tempos de resolução, métricas, logs, consumo e automação.',
  },
  'entity.outage.short': {
    en: 'Entity model did not answer',
    'pt-BR': 'Modelo de entidades não respondeu',
  },

  // ---------------------------------------------------------------- report
  'report.title': { en: 'Downloadable value report', 'pt-BR': 'Relatório de valor para download' },
  'report.download': { en: 'Download as PDF', 'pt-BR': 'Baixar em PDF' },
  'report.windowLine': {
    en: 'Window: {window} · {days} of a maximum {max} days',
    'pt-BR': 'Período: {window} · {days} de no máximo {max} dias',
  },
  'report.howTo.title': { en: 'How this produces a PDF', 'pt-BR': 'Como isto gera um PDF' },
  'report.howTo.body': {
    en: 'The button opens your browser print dialog — choose "Save as PDF". Using the browser pipeline keeps the text selectable and searchable, and adds nothing to the app bundle. Navigation and this notice are excluded from the printed output.',
    'pt-BR':
      'O botão abre a caixa de impressão do navegador — escolha "Salvar como PDF". Usar o mecanismo do próprio navegador mantém o texto selecionável e pesquisável, sem adicionar nada ao pacote do app. A navegação e este aviso ficam fora da impressão.',
  },
  'report.heroTitle': {
    en: '{customer} — proof of concept value report',
    'pt-BR': '{customer} — relatório de valor da prova de conceito',
  },
  'report.heroTitleAnon': {
    en: 'Proof of concept — value report',
    'pt-BR': 'Prova de conceito — relatório de valor',
  },
  'report.heroSubtitle': {
    en: 'Every figure in this report was measured by Dynatrace in the environment itself over the window stated above.',
    'pt-BR':
      'Todos os números deste relatório foram medidos pela Dynatrace no próprio ambiente, no período indicado acima.',
  },
  'report.declaredScope': { en: 'Declared scope', 'pt-BR': 'Escopo declarado' },
  'report.s1.title': { en: '1. What was monitored', 'pt-BR': '1. O que foi monitorado' },
  'report.s1.body': {
    en: 'Discovered automatically. Nothing in this inventory was declared, imported or configured by hand.',
    'pt-BR':
      'Descoberto automaticamente. Nada neste inventário foi declarado, importado ou configurado manualmente.',
  },
  'report.s2.title': { en: '2. How problems behave', 'pt-BR': '2. Como os problemas se comportam' },
  'report.s3.title': {
    en: '3. Where problems concentrate',
    'pt-BR': '3. Onde os problemas se concentram',
  },
  'report.s4.title': {
    en: '4. Technologies detected automatically',
    'pt-BR': '4. Tecnologias detectadas automaticamente',
  },
  'report.s4.body': {
    en: 'Nobody supplied this list. Versions are reported exactly as the platform detected them; no end-of-support judgement is made.',
    'pt-BR':
      'Ninguém forneceu esta lista. As versões são reportadas exatamente como a plataforma as detectou; nenhum julgamento de fim de suporte é feito.',
  },
  'report.s5.title': {
    en: '5. Recommendations, each from a measurement',
    'pt-BR': '5. Recomendações, cada uma a partir de uma medição',
  },
  'report.s5.disclaimer': {
    en: 'Impact and effort are qualitative judgements offered for discussion. This report states no monetary saving, no reduction in mean time to resolve and no percentage improvement, because no baseline exists to support one.',
    'pt-BR':
      'Impacto e esforço são julgamentos qualitativos oferecidos para discussão. Este relatório não afirma economia financeira, redução de MTTR nem ganho percentual, porque não existe linha de base que sustente tal afirmação.',
  },
  'report.s6.title': {
    en: '6. What this report cannot tell you',
    'pt-BR': '6. O que este relatório não pode afirmar',
  },
  'report.footer.generated': {
    en: 'Generated by PoC Automation 3.0 from live Dynatrace data. Window: {start} to {end}.',
    'pt-BR':
      'Gerado pelo PoC Automation 3.0 a partir de dados ao vivo da Dynatrace. Período: {start} a {end}.',
  },
  'report.footer.reproducible': {
    en: 'Every figure is reproducible: the Evidence Center lists the exact query behind each one, with the platform own record of what it cost to run.',
    'pt-BR':
      'Todos os números são reproduzíveis: a Central de Evidências lista a consulta exata por trás de cada um, com o registro da própria plataforma sobre o custo de execução.',
  },

  // -------------------------------------------------------- report metrics
  'metric.hosts': { en: 'Hosts', 'pt-BR': 'Hosts' },
  'metric.services': { en: 'Services', 'pt-BR': 'Serviços' },
  'metric.processes': { en: 'Process instances', 'pt-BR': 'Instâncias de processo' },
  'metric.clusters': { en: 'Kubernetes clusters', 'pt-BR': 'Clusters Kubernetes' },
  'metric.workloads': { en: 'Kubernetes workloads', 'pt-BR': 'Workloads Kubernetes' },
  'metric.synthetics': { en: 'Synthetic monitors', 'pt-BR': 'Monitores sintéticos' },
  'metric.mttr': { en: 'Mean time to resolve', 'pt-BR': 'Tempo médio de resolução (MTTR)' },
  'metric.mttrDetail': {
    en: 'Across {count} resolved problems',
    'pt-BR': 'Sobre {count} problemas resolvidos',
  },
  'metric.openNow': { en: 'Problems open at report time', 'pt-BR': 'Problemas abertos no momento' },
  'metric.openTime': {
    en: 'Accumulated open problem time',
    'pt-BR': 'Tempo acumulado de problemas abertos',
  },
  'metric.measuredByPlatform': { en: 'Measured by the platform', 'pt-BR': 'Medido pela plataforma' },
  'metric.longestOpen': {
    en: 'Longest currently open problem',
    'pt-BR': 'Problema aberto há mais tempo',
  },
  'metric.mttrByCategory': {
    en: 'Mean time to resolve by category',
    'pt-BR': 'Tempo médio de resolução por categoria',
  },
  'metric.problemsSuffix': {
    en: '{time} across {count} {count|problem|problems}',
    'pt-BR': '{time} em {count} {count|problema|problemas}',
  },

  // ------------------------------------------------------------------ cost
  'cost.estimatedTitle': {
    en: 'Estimated operational cost: {amount}',
    'pt-BR': 'Custo operacional estimado: {amount}',
  },
  'cost.assumptionWarning': {
    en: 'The hours are measured by Dynatrace. The hourly rate was supplied by the person who produced this report and is not read from the environment. Treat this figure as an estimate for discussion, not as a measurement.',
    'pt-BR':
      'As horas são medidas pela Dynatrace. O valor por hora foi informado por quem produziu este relatório e não é lido do ambiente. Trate este número como estimativa para discussão, não como medição.',
  },
  'cost.noneTitle': {
    en: 'No monetary estimate in this report',
    'pt-BR': 'Sem estimativa monetária neste relatório',
  },
  'cost.noneBody': {
    en: 'No hourly rate was configured, so this report states problem time in hours only. This app does not invent a cost figure.',
    'pt-BR':
      'Nenhum valor por hora foi configurado, então este relatório apresenta o tempo de problema apenas em horas. Este app não inventa valores de custo.',
  },

  // ------------------------------------------------------------- gaps text
  'gap.rum.title': { en: 'Real user experience.', 'pt-BR': 'Experiência real do usuário.' },
  'gap.rum.body': {
    en: 'Session data was unreadable and effectively empty in this environment, so no statement about page load, Apdex, conversion or affected users is made. Backend latency is not substituted for it.',
    'pt-BR':
      'Os dados de sessão estavam ilegíveis e praticamente vazios neste ambiente, portanto nenhuma afirmação sobre tempo de carregamento, Apdex, conversão ou usuários afetados é feita. Latência de backend não é usada como substituto.',
  },
  'gap.security.title': { en: 'Security exposure.', 'pt-BR': 'Exposição de segurança.' },
  'gap.security.body': {
    en: 'The security findings table was queried and refused for lack of a scope. That is a permission gap, not an absence of risk.',
    'pt-BR':
      'A tabela de achados de segurança foi consultada e recusada por falta de escopo. Isso é uma lacuna de permissão, não ausência de risco.',
  },
  'gap.topology.title': { en: 'Dependency graph.', 'pt-BR': 'Grafo de dependências.' },
  'gap.topology.body': {
    en: 'Topology is presented in tabular form. The graph data objects are not queryable from user DQL in this environment, and an approximate graph would have meant inventing relationships.',
    'pt-BR':
      'A topologia é apresentada em formato tabular. Os objetos de dados de grafo não são consultáveis por DQL de usuário neste ambiente, e um grafo aproximado significaria inventar relacionamentos.',
  },

  // --------------------------------------------------------------- roadmap
  'roadmap.h1': { en: '0–30 days', 'pt-BR': '0–30 dias' },
  'roadmap.h2': { en: '31–60 days', 'pt-BR': '31–60 dias' },
  'roadmap.h3': { en: '61–90 days', 'pt-BR': '61–90 dias' },
  'roadmap.h1.intent': { en: 'Unblock and quick wins', 'pt-BR': 'Desbloquear e ganhos rápidos' },
  'roadmap.h2.intent': { en: 'Build and integrate', 'pt-BR': 'Construir e integrar' },
  'roadmap.h3.intent': { en: 'Scale and sustain', 'pt-BR': 'Escalar e sustentar' },
  'roadmap.owner': { en: 'Suggested owner', 'pt-BR': 'Responsável sugerido' },
  'roadmap.dependency': { en: 'Depends on', 'pt-BR': 'Depende de' },
  'roadmap.success': { en: 'Success criterion', 'pt-BR': 'Critério de sucesso' },
  'roadmap.measured': { en: 'Measured', 'pt-BR': 'Medido' },
  'roadmap.empty': {
    en: 'No measured signal crossed the thresholds this app uses. Rather than fill this page with generic recommendations, it stays empty.',
    'pt-BR':
      'Nenhum sinal medido cruzou os limiares usados por este app. Em vez de preencher a página com recomendações genéricas, ela permanece vazia.',
  },
  'roadmap.impact': { en: 'Impact', 'pt-BR': 'Impacto' },
  'roadmap.effort': { en: 'Effort', 'pt-BR': 'Esforço' },
  'qual.low': { en: 'low', 'pt-BR': 'baixo' },
  'qual.medium': { en: 'medium', 'pt-BR': 'médio' },
  'qual.high': { en: 'high', 'pt-BR': 'alto' },

  // ------------------------------------------------------------- pillars
  'pillar.section.title': { en: 'Value pillars in scope', 'pt-BR': 'Pilares de valor no escopo' },
  'pillar.section.intro': {
    en: 'The pillars agreed for this engagement, with the validation points each one implies and whether this app can evidence them from the environment.',
    'pt-BR':
      'Os pilares acordados para este engajamento, com os pontos de validação que cada um implica e se este app consegue evidenciá-los a partir do ambiente.',
  },
  'pillar.none': {
    en: 'No pillar selected. Choose the pillars agreed with the customer in Settings so the findings are judged against what was actually promised.',
    'pt-BR':
      'Nenhum pilar selecionado. Escolha em Configurações os pilares acordados com o cliente, para que os achados sejam avaliados diante do que foi realmente prometido.',
  },
  'pillar.roi': { en: 'ROI opportunity', 'pt-BR': 'Oportunidade de ROI' },
  'pillar.points': { en: 'Validation points', 'pt-BR': 'Pontos de validação' },
  'pillar.status.evidenced': { en: 'Evidenced', 'pt-BR': 'Evidenciado' },
  'pillar.status.partial': { en: 'Partly evidenced', 'pt-BR': 'Parcialmente evidenciado' },
  'pillar.status.not-evidenced': { en: 'Not evidenced here', 'pt-BR': 'Não evidenciado aqui' },
  'pillar.coverage': {
    en: '{evidenced} evidenced · {partial} partial · {missing} not evidenced',
    'pt-BR': '{evidenced} evidenciados · {partial} parciais · {missing} não evidenciados',
  },
  'pillar.honesty': {
    en: 'A point marked as not evidenced is not a failure of the platform — it means this app has no data source for it in this environment, and it should be assessed another way.',
    'pt-BR':
      'Um ponto marcado como não evidenciado não é falha da plataforma — significa que este app não tem fonte de dados para ele neste ambiente, e ele deve ser avaliado de outra forma.',
  },

  'pillar.resilience.title': { en: 'Operational resilience', 'pt-BR': 'Resiliência operacional' },
  'pillar.resilience.roi': {
    en: 'Reduce mean time to resolve and the effort spent getting there',
    'pt-BR': 'Reduzir o tempo médio de resolução (MTTR) e o esforço gasto para chegar lá',
  },
  'pillar.resilience.p1': { en: 'Problem detection', 'pt-BR': 'Detecção de problemas' },
  'pillar.resilience.p2': { en: 'Root cause identification', 'pt-BR': 'Identificação de causa raiz' },
  'pillar.resilience.p2.caveat': {
    en: 'Dynatrace Intelligence attaches affected and related entities to each problem. This app reports what Dynatrace Intelligence indicated and never infers a cause of its own.',
    'pt-BR':
      'A Dynatrace Intelligence anexa as entidades afetadas e relacionadas a cada problema. Este app reporta o que a Dynatrace Intelligence indicou e nunca infere uma causa própria.',
  },
  'pillar.resilience.p3': { en: 'Service and user impact', 'pt-BR': 'Impacto no serviço e no usuário' },
  'pillar.resilience.p3.caveat': {
    en: 'Service impact is measured. User impact requires real user monitoring, which is not usable in this environment.',
    'pt-BR':
      'O impacto no serviço é medido. O impacto no usuário exige monitoramento de usuário real, que não está utilizável neste ambiente.',
  },
  'pillar.resilience.p4': {
    en: 'Fewer alerts and false positives',
    'pt-BR': 'Menos alertas e falsos positivos',
  },
  'pillar.resilience.p4.caveat': {
    en: 'Recurrence and duplicate flags are measured. A before-and-after comparison against the previous tooling is not available to this app.',
    'pt-BR':
      'Recorrência e marcações de duplicidade são medidas. Uma comparação antes e depois com a ferramenta anterior não está disponível para este app.',
  },
  'pillar.resilience.p5': {
    en: 'Availability at peak and low traffic',
    'pt-BR': 'Disponibilidade em pico e em baixo tráfego',
  },

  'pillar.productivity.title': { en: 'Team productivity', 'pt-BR': 'Produtividade da equipe' },
  'pillar.productivity.roi': {
    en: 'Shift the team from troubleshooting to building',
    'pt-BR': 'Mover o foco da equipe de troubleshooting para inovação',
  },
  'pillar.productivity.p1': {
    en: 'Continuous support for new technologies',
    'pt-BR': 'Suporte constante a novas tecnologias',
  },
  'pillar.productivity.p2': {
    en: 'Environment changes detected automatically',
    'pt-BR': 'Mudanças de ambiente identificadas automaticamente',
  },
  'pillar.productivity.p3': {
    en: 'Dependencies mapped without anyone drawing them',
    'pt-BR': 'Dependências mapeadas sem ninguém desenhá-las',
  },

  'pillar.cost.title': { en: 'Cost reduction', 'pt-BR': 'Redução de custo' },
  'pillar.cost.roi': {
    en: 'Reduce the cost of multiple tools, training and maintenance',
    'pt-BR': 'Reduzir custos de múltiplas ferramentas, treinamento e manutenção',
  },
  'pillar.cost.p1': { en: 'Automated installation', 'pt-BR': 'Instalação automatizada' },
  'pillar.cost.p1.caveat': {
    en: 'Monitoring mode is visible per host, which shows the result of deployment. The deployment process itself is not measured here.',
    'pt-BR':
      'O modo de monitoramento é visível por host, o que mostra o resultado do deployment. O processo de instalação em si não é medido aqui.',
  },
  'pillar.cost.p2': { en: 'Full-stack monitoring', 'pt-BR': 'Monitoramento full-stack' },
  'pillar.cost.p3': {
    en: 'Integration with other technologies and tools',
    'pt-BR': 'Integração com outras tecnologias e ferramentas',
  },
  'pillar.cost.p4': {
    en: 'Every request captured, none sampled away',
    'pt-BR': 'Todas as requisições capturadas, nenhuma descartada por amostragem',
  },

  'pillar.agility.title': { en: 'Business agility', 'pt-BR': 'Agilidade de negócio' },
  'pillar.agility.roi': {
    en: 'Improve conversion by understanding the user experience and the customer journey',
    'pt-BR': 'Aumentar a conversão pela análise da experiência do usuário e da jornada do cliente',
  },
  'pillar.agility.p1': {
    en: 'Service latency measured request by request',
    'pt-BR': 'Latência de serviço medida requisição a requisição',
  },
  'pillar.agility.p2': { en: 'User session monitoring', 'pt-BR': 'Monitoramento de sessões de usuário' },
  'pillar.agility.p3': {
    en: 'Key actions and conversion goals',
    'pt-BR': 'Ações-chave e metas de conversão',
  },
  'pillar.agility.p3.caveat': {
    en: 'Business events are flowing and their types are visible. Mapping an event to a conversion goal needs a definition only the business can supply.',
    'pt-BR':
      'Os eventos de negócio estão fluindo e seus tipos são visíveis. Mapear um evento para uma meta de conversão exige uma definição que só o negócio pode fornecer.',
  },

  // -------------------------------------------------------------- settings
  'settings.title': { en: 'PoC Automation 3.0 general settings', 'pt-BR': 'Configurações gerais do PoC Automation 3.0' },
  'settings.tab.customer': { en: 'Customer & engagement', 'pt-BR': 'Cliente & Engajamento' },
  'settings.tab.cost': { en: 'Operational cost', 'pt-BR': 'Custo operacional' },
  'settings.tab.partner': { en: 'Partner', 'pt-BR': 'Partner' },
  'settings.tab.rate': { en: 'Rate card', 'pt-BR': 'Rate card' },
  'settings.question': {
    en: 'Whose engagement is this, what was in scope, and what assumptions are we making?',
    'pt-BR': 'De quem é este engajamento, o que estava no escopo e quais premissas estamos assumindo?',
  },
  'settings.takeaway': {
    en: 'Branding and narrative change how the findings are presented. Only the hourly rate changes what any number says — and it is always labelled as your assumption.',
    'pt-BR':
      'Marca e narrativa mudam como os achados são apresentados. Apenas o valor por hora muda o que algum número diz — e ele é sempre rotulado como sua premissa.',
  },
  'settings.session.title': { en: 'Saved on the tenant', 'pt-BR': 'Salvo na tenant' },
  'settings.session.body': {
    en: 'What you enter here is kept on this tenant, in the app’s own state storage, and is still there when you leave the app and come back. It is never compiled into the app. The PoC details (customer, scope, logos, pillars) are shared with the people who use this app on the tenant; rates, the price-table setting, the manual baseline and your language stay with your user only.',
    'pt-BR':
      'O que você preenche aqui é guardado nesta tenant, no armazenamento de estado do próprio app, e continua lá quando você sai do app e volta. Nunca é compilado no app. Os dados da PoC (cliente, escopo, logos, pilares) são compartilhados com quem usa este app na tenant; taxas, a configuração da tabela de preços, a referência manual e o seu idioma ficam só com o seu usuário.',
  },
  'settings.session.why': {
    en: 'To start another PoC on the same tenant, use “New PoC” at the bottom of this page: it deletes the saved configuration, so one customer’s name and branding never carry into the next presentation.',
    'pt-BR':
      'Para começar outra PoC na mesma tenant, use “Nova PoC” no fim desta página: ela apaga a configuração salva, e o nome e a marca de um cliente nunca passam para a apresentação seguinte.',
  },
  'settings.customer.heading': { en: 'Customer and engagement', 'pt-BR': 'Cliente e engajamento' },
  'settings.customer.name': { en: 'Customer or organisation', 'pt-BR': 'Cliente ou organização' },
  'settings.customer.namePlaceholder': {
    en: 'Shown in the header, the overview and the report',
    'pt-BR': 'Exibido no cabeçalho, na visão geral e no relatório',
  },
  'settings.engagement.name': { en: 'Engagement name', 'pt-BR': 'Nome do engajamento' },
  'settings.engagement.placeholder': {
    en: 'For example, the name given to this proof of concept',
    'pt-BR': 'Por exemplo, o nome dado a esta prova de conceito',
  },
  'settings.poc.description': { en: 'Engagement description', 'pt-BR': 'Descrição do engajamento' },
  'settings.poc.placeholder': {
    en: 'What this proof of concept set out to prove. Shown on the overview and at the top of the report.',
    'pt-BR':
      'O que esta prova de conceito se propôs a provar. Exibido na visão geral e no topo do relatório.',
  },
  'settings.scope.label': { en: 'Declared scope', 'pt-BR': 'Escopo declarado' },
  'settings.scope.placeholder': {
    en: 'What was agreed to be in scope. Shown verbatim next to the measured coverage so the audience can compare the two.',
    'pt-BR':
      'O que foi acordado como escopo. Exibido literalmente ao lado da cobertura medida, para a plateia comparar os dois.',
  },
  'settings.pillars.heading': { en: 'Value pillars in scope', 'pt-BR': 'Pilares de valor no escopo' },
  'settings.pillars.body': {
    en: 'Select the pillars agreed with the customer. The overview, the executive summary and the report will state them, list the validation points each implies, and say honestly which of those points this app can evidence.',
    'pt-BR':
      'Selecione os pilares acordados com o cliente. A visão geral, o resumo executivo e o relatório vão declará-los, listar os pontos de validação que cada um implica e dizer honestamente quais desses pontos este app consegue evidenciar.',
  },
  'settings.logo.label': { en: 'Customer logo', 'pt-BR': 'Logo do cliente' },
  'settings.logo.help': {
    en: 'PNG, JPEG or WebP, up to {max} kB. Appears beside the Dynatrace logo in the header and on the report.',
    'pt-BR':
      'PNG, JPEG ou WebP, até {max} kB. Aparece ao lado da logo Dynatrace no cabeçalho e no relatório.',
  },
  'settings.logo.rejected': { en: 'The logo was not accepted', 'pt-BR': 'A logo não foi aceita' },
  'settings.logo.preview': { en: 'Preview', 'pt-BR': 'Prévia' },
  'settings.logo.remove': { en: 'Remove logo', 'pt-BR': 'Remover logo' },
  'settings.partner.heading': { en: 'Delivery partner (co-branding)', 'pt-BR': 'Parceiro de entrega (co-branding)' },
  'settings.partner.body': {
    en: 'Optional. When set, the partner name and logo appear beside Dynatrace on the value report and the Tech Wrapup deck, so a partner-led engagement is co-branded.',
    'pt-BR': 'Opcional. Quando definido, o nome e a logo do parceiro aparecem ao lado da Dynatrace no relatório de valor e no deck Tech Wrapup, para um engajamento liderado por parceiro ficar co-branded.',
  },
  'settings.partner.name': { en: 'Partner name', 'pt-BR': 'Nome do parceiro' },
  'settings.partner.namePlaceholder': { en: 'e.g. Acme Consulting', 'pt-BR': 'ex.: Acme Consultoria' },
  'settings.partner.logo': { en: 'Partner logo', 'pt-BR': 'Logo do parceiro' },
  'report.partner.label': { en: 'Delivered in partnership with', 'pt-BR': 'Entregue em parceria com' },
  'estate.eyebrow': { en: 'Cloud Observability', 'pt-BR': 'Observabilidade de Nuvem' },
  'estate.title': { en: 'Where the estate runs', 'pt-BR': 'Onde o parque roda' },
  'estate.cloud': { en: 'cloud hosts across {providers}', 'pt-BR': 'hosts em nuvem em {providers}' },
  'estate.services': { en: 'monitored cloud service families', 'pt-BR': 'famílias de serviços de nuvem monitoradas' },
  'estate.topServices': { en: 'Most-monitored services: {list}', 'pt-BR': 'Serviços mais monitorados: {list}' },
  'estate.hostUnits': { en: 'Classic Host Units · {fs} full-stack, {inf} infra', 'pt-BR': 'Host Units (Classic) · {fs} full-stack, {inf} infra' },
  'estate.footnote': {
    en: 'Attributed from the entity model. The Cloud page carries the full provider and per-service breakdown.',
    'pt-BR': 'Atribuído do modelo de entidades. A página de Nuvem traz o detalhamento por provedor e por serviço.',
  },
  'estate.report.title': { en: 'Cloud Observability', 'pt-BR': 'Observabilidade de Nuvem' },
  'fd.line.estate': {
    en: '• Cloud: {cloud} monitored cloud hosts across {providers}, so the platform sees the estate the way it is actually deployed.',
    'pt-BR': '• Nuvem: {cloud} hosts em nuvem monitorados em {providers}, então a plataforma enxerga o parque do jeito que ele realmente está implantado.',
  },
  'fd.line.cloudServices': {
    en: '• Cloud services: {count} monitored service families already in view — {list} and more.',
    'pt-BR': '• Serviços de nuvem: {count} famílias de serviços já monitoradas — {list} e outros.',
  },
  'settings.cost.heading': { en: 'Operational cost assumption', 'pt-BR': 'Premissa de custo operacional' },
  'settings.cost.warnTitle': {
    en: 'The one input that turns measured hours into money',
    'pt-BR': 'A entrada que transforma horas medidas em valor',
  },
  'settings.cost.warnBody1': {
    en: 'Dynatrace already measures the hard part: exactly how long every problem stayed open, per category, without anyone timing it. What an hour of that is worth is a number only your business has — so this app asks for it rather than assuming one.',
    'pt-BR':
      'A Dynatrace já mede a parte difícil: exatamente quanto tempo cada problema ficou aberto, por categoria, sem ninguém cronometrar. Quanto vale uma hora dessas é um número que só o seu negócio tem — por isso este app pergunta, em vez de assumir.',
  },
  'settings.cost.warnBody2': {
    en: 'Supply a rate and every estimate shows the full arithmetic next to it, so the conversation is about your assumption rather than about our maths. Leave it blank and the measured hours stand on their own — they are already the strongest part of the argument. Both rates apply only to problems whose root cause Dynatrace Intelligence named, so a false alarm never costs anything.',
    'pt-BR':
      'Informe um valor e cada estimativa mostra a conta completa ao lado, para que a conversa seja sobre a sua premissa e não sobre a nossa matemática. Deixe em branco e as horas medidas falam por si — elas já são a parte mais forte do argumento. Os dois valores valem só para problemas com a causa raiz apontada pela Dynatrace Intelligence, então um alarme falso nunca custa nada.',
  },
  'settings.cost.rate': {
    en: 'Cost per hour of open problem time',
    'pt-BR': 'Custo por hora de problema aberto',
  },
  'settings.cost.ratePlaceholder': { en: 'Leave blank for hours only', 'pt-BR': 'Deixe em branco para apenas horas' },
  'settings.cost.currency': { en: 'Currency label', 'pt-BR': 'Rótulo de moeda' },
  'settings.cost.basis': { en: 'What this rate represents', 'pt-BR': 'O que este valor representa' },
  'settings.cost.basisPlaceholder': {
    en: 'For example: blended cost of the on-call team, or estimated revenue exposure per hour of degradation. Shown alongside every estimate.',
    'pt-BR':
      'Por exemplo: custo médio da equipe de plantão, ou exposição estimada de receita por hora de degradação. Exibido junto de toda estimativa.',
  },
  'settings.cost.invalid': {
    en: 'The rate must be a positive number',
    'pt-BR': 'O valor deve ser um número positivo',
  },
  'settings.apply': { en: 'Apply', 'pt-BR': 'Aplicar' },
  'settings.applyCost': { en: 'Apply cost assumption', 'pt-BR': 'Aplicar premissa de custo' },
  'settings.discard': { en: 'Discard changes', 'pt-BR': 'Descartar alterações' },

  // -------------------------------------------------------------- overview
  'overview.title': { en: 'Proof of concept summary', 'pt-BR': 'Resumo da prova de conceito' },
  'overview.titleNamed': {
    en: '{customer} — proof of concept summary',
    'pt-BR': '{customer} — resumo da prova de conceito',
  },
  'overview.question': {
    en: 'What was monitored, what did Dynatrace find on its own, and what deserves attention first?',
    'pt-BR': 'O que foi monitorado, o que a Dynatrace encontrou sozinha e o que merece atenção primeiro?',
  },
  'overview.takeaway': {
    en: 'All figures are read from this environment over the {window} unless a section states its own period.',
    'pt-BR':
      'Todos os números são lidos deste ambiente no período {window}, salvo quando a seção indica outro período.',
  },
  'overview.heroSubtitle': {
    en: 'Every figure below is read live from this environment and names the query behind it. Verdict lines come from the assumptions registry; pillars and customer details from Settings.',
    'pt-BR':
      'Todos os números abaixo são lidos ao vivo deste ambiente e indicam a consulta que os produziu. As linhas de veredito vêm do registro de premissas; pilares e dados do cliente, das Configurações.',
  },
  'overview.unconfigured.title': { en: 'Engagement details not set', 'pt-BR': 'Dados do engajamento não preenchidos' },
  'overview.unconfigured.body': {
    en: 'Customer and engagement names are saved on the tenant when you enter them in Settings and are never compiled into this app. Set them before presenting. Every figure on this page is real regardless.',
    'pt-BR':
      'Nome do cliente e do engajamento são salvos na tenant quando você os preenche em Configurações e nunca são compilados no app. Preencha antes de apresentar. Todos os números desta página são reais de qualquer forma.',
  },
  'overview.autoDiscovered': {
    en: 'Every entity above comes from the platform’s entity model; this app declares none of them.',
    'pt-BR':
      'Todas as entidades acima vêm do modelo de entidades da plataforma; este app não declara nenhuma.',
  },
  'overview.noBlendedScore': {
    en: 'This page deliberately does not combine the dimensions above into a single score. A blended number would hide which dimension is weak, and no weighting methodology has been agreed.',
    'pt-BR':
      'Esta página deliberadamente não combina as dimensões acima em uma nota única. Um número consolidado esconderia qual dimensão está fraca, e nenhuma metodologia de peso foi acordada.',
  },
  'overview.openProblems': { en: 'Problems still open', 'pt-BR': 'Problemas ainda abertos' },
  'overview.closedShare': { en: 'Problems closed in window', 'pt-BR': 'Problemas fechados no período' },
  'overview.declaredScope': { en: 'Declared scope', 'pt-BR': 'Escopo declarado' },

  // ------------------------------------------------------------ discoveries
  'disc.title': { en: 'Key discoveries', 'pt-BR': 'Principais descobertas' },
  'disc.count': {
    en: '{count} findings from the {window}, each generated from a measurement',
    'pt-BR': '{count} achados no período {window}, cada um gerado a partir de uma medição',
  },
  'disc.seeEvidence': { en: 'See the evidence', 'pt-BR': 'Ver a evidência' },
  'disc.needsAttention': { en: 'Needs attention', 'pt-BR': 'Requer atenção' },
  'disc.opportunity': { en: 'Opportunity', 'pt-BR': 'Oportunidade' },
  'disc.working': { en: 'Working', 'pt-BR': 'Funcionando' },
  'disc.none': {
    en: 'No measured signal crossed the thresholds this app uses to raise a headline discovery in the {window}. That is a narrow statement about this window, not a verdict that the environment is optimal.',
    'pt-BR':
      'Nenhum sinal medido cruzou os limiares que este app usa para destacar uma descoberta no período {window}. Isso é uma afirmação restrita a este período, não um veredito de que o ambiente está ótimo.',
  },

  // ------------------------------------------------------------- executive
  'exec.title': { en: 'Executive summary', 'pt-BR': 'Resumo executivo' },
  'exec.question': {
    en: 'How large is the monitored estate, how quickly do problems resolve, and what is currently open?',
    'pt-BR':
      'Qual o tamanho do parque monitorado, com que rapidez os problemas se resolvem e o que está aberto agora?',
  },
  'exec.heroSubtitle': {
    en: 'Everything below was read from this environment and carries its query. Verdict lines are review conventions from the assumptions registry.',
    'pt-BR':
      'Tudo abaixo foi lido deste ambiente e traz a sua consulta. As linhas de veredito são convenções de revisão do registro de premissas.',
  },
  'exec.scale': { en: 'Scale of what is monitored', 'pt-BR': 'Escala do que é monitorado' },
  'exec.resolution': { en: 'How quickly problems resolve', 'pt-BR': 'Com que rapidez os problemas se resolvem' },
  'exec.openNow': { en: 'What is open right now', 'pt-BR': 'O que está aberto agora' },
  'exec.mix': { en: 'Problem mix by category', 'pt-BR': 'Distribuição de problemas por categoria' },
  'exec.assist.title': { en: 'What this says for the business', 'pt-BR': 'O que isto diz para o negócio' },
  'exec.assist.note': {
    en: 'Derived from the measured problem signals to summarise in plain language; it restates the evidence for an executive audience, it does not replace it.',
    'pt-BR': 'Derivado dos sinais de problema medidos para resumir em linguagem simples; reapresenta a evidência para um público executivo, não a substitui.',
  },
  'exec.assist.s.dominant': {
    en: '{pct}% of resolved problems fall under {category} ({count}) — that is where reliability investment pays back first.',
    'pt-BR': '{pct}% dos problemas resolvidos são de {category} ({count}) — é aí que o investimento em confiabilidade retorna primeiro.',
  },
  'exec.assist.s.resolved': {
    en: '{count} {count|problem|problems} closed in the {window}, with a mean time to resolve of {mttr}.',
    'pt-BR': '{count} {count|problema encerrado|problemas encerrados} nos {window}, com tempo médio de resolução de {mttr}.',
  },
  'exec.assist.s.entity': {
    en: '{entity} was the most affected entity with {count} {count|problem|problems} — fixing it removes the largest single share of the noise.',
    'pt-BR': '{entity} foi a entidade mais afetada, com {count} {count|problema|problemas} — corrigi-la remove a maior parcela isolada do ruído.',
  },
  'exec.assist.s.active': {
    en: '{count} {count|problem is|problems are} open right now — {count|this is the one|these are the ones} worth a person’s attention today.',
    'pt-BR': '{count} {count|problema está aberto agora — é o que merece|problemas estão abertos agora — são os que merecem} a atenção de uma pessoa hoje.',
  },
  'exec.assist.s.activeNone': {
    en: 'Nothing is open right now — the environment is in a clean state as measured over the window.',
    'pt-BR': 'Nada está aberto agora — o ambiente está em estado limpo conforme medido no período.',
  },
  'exec.concentration': { en: 'Where problems concentrate', 'pt-BR': 'Onde os problemas se concentram' },
  'exec.concentrationBody': {
    en: 'Entities appearing in the most problems. A single entity at the top of this list is usually the fastest thing to improve.',
    'pt-BR':
      'Entidades que aparecem em mais problemas. Uma única entidade no topo desta lista costuma ser a melhoria mais rápida disponível.',
  },
  'exec.gaps.title': { en: 'What this summary cannot tell you', 'pt-BR': 'O que este resumo não pode afirmar' },
  'exec.slowest': { en: 'Slowest category to resolve', 'pt-BR': 'Categoria mais lenta de resolver' },
  'exec.resolvedInWindow': { en: 'Problems resolved in window', 'pt-BR': 'Problemas resolvidos no período' },
  'exec.openExposure': { en: 'Open exposure', 'pt-BR': 'Exposição em aberto' },
  'exec.operationalCost': { en: 'Operational cost', 'pt-BR': 'Custo operacional' },
  'exec.dataSources': { en: 'Data sources', 'pt-BR': 'Fontes de dados' },
  'exec.technologiesDetected': { en: 'Technologies detected', 'pt-BR': 'Tecnologias detectadas' },
  'exec.notReadable': {
    en: '{count} not readable by this identity',
    'pt-BR': '{count} não legíveis por esta identidade',
  },

  // ------------------------------------------------------------- verdicts
  'verdict.healthy': { en: 'Healthy', 'pt-BR': 'Saudável' },
  'verdict.stable': { en: 'Stable', 'pt-BR': 'Estável' },
  'verdict.attention': { en: 'Worth reviewing', 'pt-BR': 'Vale revisar' },
  'verdict.partial': { en: 'Partially assessable', 'pt-BR': 'Parcialmente avaliável' },
  'verdict.blocked': { en: 'Not assessable', 'pt-BR': 'Não avaliável' },
  'verdict.unknown': { en: 'No verdict', 'pt-BR': 'Sem veredito' },
  'verdict.healthy.detail': {
    en: 'Problems resolve quickly and few remain open. Both figures are measured over the selected period and neither depends on an assumption.',
    'pt-BR':
      'Os problemas se resolvem rápido e poucos permanecem abertos. Ambos os números são medidos no período selecionado e nenhum depende de premissa.',
  },
  'verdict.stable.detail': {
    en: 'Resolution times are reasonable and the open backlog is contained. The concentration view below shows where the remaining effort sits.',
    'pt-BR':
      'Os tempos de resolução são razoáveis e o backlog aberto está contido. A visão de concentração abaixo mostra onde está o esforço restante.',
  },
  'verdict.attention.detail': {
    en: 'Either problems take a while to resolve or a number of them remain open. A small set of entities accounts for most of it, which usually means a few targeted fixes would move the figure.',
    'pt-BR':
      'Ou os problemas demoram a se resolver, ou vários permanecem abertos. Um pequeno conjunto de entidades responde pela maior parte, o que normalmente significa que poucas correções direcionadas moveriam o número.',
  },
  'verdict.partial.detail': {
    en: 'Problem behaviour is measurable and shown below, but the entity model is not answering, so nothing can be said about the size or shape of the estate.',
    'pt-BR':
      'O comportamento dos problemas é mensurável e está abaixo, mas o modelo de entidades não está respondendo, então nada pode ser afirmado sobre o tamanho ou a forma do parque.',
  },
  'verdict.blocked.detail': {
    en: 'Problem data could not be read with the current permissions, so no judgement about this environment is possible. That is a permission gap, not a clean result.',
    'pt-BR':
      'Os dados de problemas não puderam ser lidos com as permissões atuais, então nenhum julgamento sobre este ambiente é possível. Isso é uma lacuna de permissão, não um resultado limpo.',
  },
  'verdict.unknown.detail': {
    en: 'Not enough measured signal in this period to reach a conclusion. Widen the timeframe or check the coverage page.',
    'pt-BR':
      'Sinal medido insuficiente neste período para chegar a uma conclusão. Amplie o período ou verifique a página de cobertura.',
  },
  'verdict.footnote': {
    en: 'The thresholds behind this verdict are review conventions chosen for this app, not Dynatrace thresholds or agreed objectives.',
    'pt-BR':
      'Os limiares por trás deste veredito são convenções de análise escolhidas para este app, não limiares da Dynatrace nem objetivos acordados.',
  },
  'verdict.mttrLabel': {
    en: 'mean time to resolve · {count} problems resolved',
    'pt-BR': 'tempo médio de resolução · {count} problemas resolvidos',
  },
} as const satisfies Record<string, Entry>;

/**
 * The complete dictionary.
 *
 * Three files, one namespace. Splitting by area keeps each file reviewable; the
 * merged type is what still guarantees a missing Portuguese translation is a
 * compile error rather than a surprise in front of a customer.
 */
const dictionary = {
  ...coreStrings,
  ...pageStrings,
  ...v2Strings,
  ...v31Strings,
  ...v31AStrings,
  ...v31BStrings,
  ...v31CStrings,
  ...v31DStrings,
  ...v31EStrings,
  ...v31FStrings,
  ...v32Strings,
  ...v32aStrings,
  ...v321Strings,
  ...v323Strings,
  ...v324Strings,
  ...v325Strings,
  ...v326Strings,
  ...v327Strings,
  ...v327PrintsStrings,
  ...v327Wp2Strings,
  ...v327Wp3Strings,
  ...v327Wp4Strings,
  ...v327Wp5Strings,
  ...v327Wp6Strings,
  ...v327Wp7Strings,
  ...v327Wp8Strings,
  ...v33Strings,
  ...v332PrintsStrings,
  ...v332CapsStrings,
  ...v332CatStrings,
  ...v333DeckStrings,
  ...v334DashStrings,
  ...v335Strings,
  ...v336Strings,
  ...v337Strings,
  ...v338Strings,
  ...v339Strings,
  ...v3310Strings,
  ...v3311Strings,
  ...v3312Strings,
  ...v3313Strings,
  ...v3314Strings,
  ...v3315Strings,
  ...v3316Strings,
  ...v3317Strings,
  ...v3318Strings,
  ...v3319Strings,
  ...v3320Strings,
  ...v3321Strings,
  ...v340Strings,
  ...v341Strings,
  ...v342Strings,
  ...v343Strings,
  ...v344Strings,
  ...v345Strings,
  ...v346Strings,
  ...v347Strings,
  ...v348Strings,
  ...v349Strings,
  ...v3410Strings,
  ...v3411Strings,
  ...v3412Strings,
  ...v3413Strings,
  ...v3414Strings,
  ...v3415Strings,
  ...v3416Strings,
  ...v3417Strings,
  ...v3418Strings,
  ...v350Strings,
  ...v351Strings,
  ...v352Strings,
  ...v353Strings,
  ...v354Strings,
  ...v355Strings,
  ...v356Strings,
  ...v357Strings,
  ...v358Strings,
  ...v359Strings,
  ...v360Strings,
  ...v361Strings,
  ...v362Strings,
  ...v363Strings,
  ...v364Strings,
  ...v365Strings,
  ...v366Strings,
  ...v367Strings,
  ...v368Strings,
  ...v369Strings,
  ...v370Strings,
  ...v371Strings,
  ...v372Strings,
  ...v373Strings,
  ...v374Strings,
  ...v375Strings,
  ...v376Strings,
  ...v377Strings,
  ...v378Strings,
  ...v379Strings,
  ...v380Strings,
  ...v381Strings,
} as const satisfies Record<string, Entry>;

export type StringKey = keyof typeof dictionary;

/**
 * The key to use for a phrase built around a count: `<key>.one` when the count is exactly 1
 * and that singular entry exists, else `key`. The dictionary has no plural rules; a phrase
 * that can read "1" on screen carries a `.one` sibling.
 */
export function pluralKey(key: StringKey, count: number): StringKey {
  const one = `${key}.one`;
  return count === 1 && one in dictionary ? (one as StringKey) : key;
}

/**
 * Resolves a key for a locale, substituting `{placeholder}` values and resolving inline
 * plurals (`{count|problem|problems}`).
 *
 * Never throws: a missing key returns the key itself, which is visible in
 * testing but does not break a live presentation.
 */
export function translate(
  key: StringKey,
  locale: Locale,
  params?: Readonly<Record<string, string | number>>,
): string {
  const entry: Entry | undefined = dictionary[key];
  if (entry === undefined) return key;

  let text = entry[locale] ?? entry.en;
  if (params !== undefined) {
    // `{count|host|hosts}` picks by the value of `count`: the first form for exactly 1, else the second.
    text = text.replace(/\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g, (whole, name: string, one: string, other: string) => {
      const value = params[name];
      if (value === undefined) return whole;
      return String(value).trim() === '1' ? one : other;
    });
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Every key, for the completeness test. */
export const ALL_KEYS = Object.keys(dictionary) as StringKey[];

export function entryFor(key: StringKey): Entry {
  return dictionary[key];
}
