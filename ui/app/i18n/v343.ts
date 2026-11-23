import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.3 — the Assessment refined (owner's order of 2026-11-18): tabs, an executive
 * summary with a radar of coverage, the maturity journey, the state of SRE and platform engineering, an
 * impact × effort heat map, and soft colours for what can improve. Merged in `strings.ts`.
 */

export const v343Strings = {
  // ---------------------------------------------------------------- tabs
  'asm.tab.summary': { en: 'Summary', 'pt-BR': 'Resumo' },
  'asm.tab.coverage': { en: 'Index and capabilities', 'pt-BR': 'Índice e capacidades' },
  'asm.tab.sre': { en: 'SRE and platform', 'pt-BR': 'SRE e plataforma' },
  'asm.tab.findings': { en: 'Findings and actions', 'pt-BR': 'Achados e ações' },
  'asm.tab.history': { en: 'Before and after, method', 'pt-BR': 'Antes e depois, método' },

  // ---------------------------------------------------------------- executive summary
  'asm.exec.title': { en: 'Coverage at a glance', 'pt-BR': 'A cobertura num relance' },
  'asm.exec.coverage': { en: 'Observable coverage', 'pt-BR': 'Cobertura observável' },
  'asm.exec.maturity': { en: 'Maturity', 'pt-BR': 'Maturidade' },
  'asm.exec.capabilities': { en: 'Capabilities in use', 'pt-BR': 'Capacidades em uso' },
  'asm.exec.capabilitiesDetail': { en: 'room to grow: {room} · not detected yet: {none}', 'pt-BR': 'espaço para crescer: {room} · ainda não detectadas: {none}' },
  'asm.exec.sre': { en: 'SRE practices established', 'pt-BR': 'Práticas de SRE estabelecidas' },
  'asm.exec.sreDetail': { en: 'see the SRE and platform tab', 'pt-BR': 'veja a guia SRE e plataforma' },
  'asm.exec.findings': { en: 'Critical findings', 'pt-BR': 'Achados críticos' },
  'asm.exec.findingsDetail': { en: 'attention: {warning} · opportunities: {opportunity}', 'pt-BR': 'atenção: {warning} · oportunidades: {opportunity}' },
  'asm.exec.wins': { en: 'Achievements: {count}', 'pt-BR': 'Conquistas: {count}' },
  'asm.exec.gaps': { en: 'Gaps to work on: {count}', 'pt-BR': 'Lacunas a trabalhar: {count}' },
  'asm.exec.inUse': { en: '{name} in use', 'pt-BR': '{name} em uso' },
  'asm.exec.notDetected': { en: '{name}: not detected yet', 'pt-BR': '{name}: ainda não detectado' },
  'asm.band.excellent': { en: 'Excellent', 'pt-BR': 'Excelente' },
  'asm.band.good': { en: 'Good', 'pt-BR': 'Boa' },
  'asm.band.moderate': { en: 'Moderate', 'pt-BR': 'Moderada' },
  'asm.band.developing': { en: 'Developing', 'pt-BR': 'Em evolução' },
  'asm.band.initial': { en: 'Initial', 'pt-BR': 'Inicial' },
  'asm.radar.title': { en: 'Coverage by domain', 'pt-BR': 'Cobertura por domínio' },
  'asm.radar.caption': {
    en: 'Each sector is a domain of the index: its bar grows from the centre (0) to the rim (100 %), and the index sits in the middle; a domain not read keeps a dashed track instead of dropping to zero.',
    'pt-BR': 'Cada setor é um domínio do índice: a barra cresce do centro (0) até a borda (100%), e o índice fica no meio; um domínio não lido fica com o trilho tracejado em vez de cair a zero.',
  },
  'asm.radar.bands': { en: 'How each domain reads', 'pt-BR': 'Como cada domínio se lê' },

  // ---------------------------------------------------------------- maturity
  'asm.mat.title': { en: 'Maturity journey', 'pt-BR': 'Jornada de maturidade' },
  'asm.mat.caption': {
    en: 'Five steps of observability maturity, after Dynatrace’s journey from reactive monitoring to the intelligent control plane. Every step is an achievement, and organisations climb them over months, one pillar at a time. A criterion not read yet is shown as such and never counts against the step.',
    'pt-BR': 'Cinco etapas de maturidade em observabilidade, segundo a jornada da Dynatrace do monitoramento reativo ao plano de controle inteligente. Cada etapa é uma conquista, e as organizações avançam por elas ao longo de meses, um pilar de cada vez. Um critério ainda sem leitura aparece como tal e nunca pesa contra a etapa.',
  },
  'asm.mat.here': { en: 'You are here', 'pt-BR': 'Você está aqui' },
  'asm.mat.mayBeHigher': {
    en: 'The next step has criteria that could not be read with this identity; the level may be higher once they are read.',
    'pt-BR': 'A próxima etapa tem critérios que não puderam ser lidos com esta identidade; o nível pode ser maior quando forem lidos.',
  },
  'asm.mat.state.met': { en: 'in place', 'pt-BR': 'já em prática' },
  'asm.mat.state.open': { en: 'next step', 'pt-BR': 'próximo passo' },
  'asm.mat.state.unread': { en: 'to confirm', 'pt-BR': 'a confirmar' },
  'asm.mat.l1': { en: 'Reactive', 'pt-BR': 'Reativo' },
  'asm.mat.l1.text': { en: 'Every journey starts here: the first signals already reach Dynatrace, and each new source brings the next step closer.', 'pt-BR': 'Toda jornada começa aqui: os primeiros sinais já chegam à Dynatrace, e cada nova fonte de dados aproxima a próxima etapa.' },
  'asm.mat.l2': { en: 'Foundational', 'pt-BR': 'Fundacional' },
  'asm.mat.l2.text': { en: 'A solid base is in place: hosts, services and logs reach Dynatrace. From here, depth and context turn data into one shared view.', 'pt-BR': 'Uma base sólida está ativa: hosts, serviços e logs já chegam à Dynatrace. Daqui, profundidade e contexto transformam os dados numa visão única e compartilhada.' },
  'asm.mat.l3': { en: 'Proficient', 'pt-BR': 'Proficiente' },
  'asm.mat.l3.text': { en: 'Unified observability: teams decide on real-time data and resolve faster, with Dynatrace connecting every signal to its context.', 'pt-BR': 'Observabilidade unificada: os times decidem com dados em tempo real e resolvem mais rápido, com a Dynatrace ligando cada sinal ao seu contexto.' },
  'asm.mat.l4': { en: 'Strategic', 'pt-BR': 'Estratégico' },
  'asm.mat.l4.text': { en: 'Preventive operations guided by AI: reliable automation, runtime security and governed, owned data.', 'pt-BR': 'Operações preventivas guiadas por IA: automação confiável, segurança em runtime e dados governados, com responsáveis definidos.' },
  'asm.mat.l5': { en: 'Visionary', 'pt-BR': 'Visionário' },
  'asm.mat.l5.text': { en: 'The platform as the control plane: AI and automation look after the digital journeys, and the business impact is in view in real time.', 'pt-BR': 'A plataforma como plano de controle: IA e automação cuidam das jornadas digitais, e o impacto no negócio fica visível em tempo real.' },

  // ---------------------------------------------------------------- SRE and platform engineering
  'asm.sre.title': { en: 'The state of SRE and platform engineering here', 'pt-BR': 'O estado da SRE e da engenharia de plataforma aqui' },
  'asm.sre.caption': {
    en: 'Seven practices from the State of SRE and Platform Engineering, each read from what this coverage reading measured: established, developing, early, or not read.',
    'pt-BR': 'Sete práticas do relatório "State of SRE and Platform Engineering", cada uma lida a partir do que esta leitura de cobertura mediu: estabelecida, em evolução, inicial ou sem leitura.',
  },
  'asm.sre.summary': { en: 'Practices established: {established} of {total}.', 'pt-BR': 'Práticas estabelecidas: {established} de {total}.' },
  'asm.sre.state.established': { en: 'Established', 'pt-BR': 'Estabelecida' },
  'asm.sre.state.developing': { en: 'Developing', 'pt-BR': 'Em evolução' },
  'asm.sre.state.early': { en: 'Early', 'pt-BR': 'Inicial' },
  'asm.sre.state.unread': { en: 'Not read', 'pt-BR': 'Sem leitura' },
  'asm.sre.unread': { en: 'Not readable with this identity in this reading.', 'pt-BR': 'Sem leitura com esta identidade nesta leitura.' },
  'asm.sre.observability': { en: 'Observability as the base', 'pt-BR': 'Observabilidade como base' },
  'asm.sre.observability.m': { en: 'Observable-coverage index: {index} of 100.', 'pt-BR': 'Índice de cobertura observável: {index} de 100.' },
  'asm.sre.incidents': { en: 'Incident detection and response', 'pt-BR': 'Detecção e resposta a incidentes' },
  'asm.sre.incidents.m': { en: 'Problems resolved: {count}; mean time to resolve: {hours} h.', 'pt-BR': 'Problemas resolvidos: {count}; tempo médio de resolução: {hours} h.' },
  'asm.sre.reliability': { en: 'Service reliability', 'pt-BR': 'Confiabilidade dos serviços' },
  'asm.sre.reliability.m': { en: 'Services below 1% failed requests: {pct}% of {total} with traffic.', 'pt-BR': 'Serviços abaixo de 1% de falhas: {pct}% de {total} com tráfego.' },
  'asm.sre.automation': { en: 'Automation and toil reduction', 'pt-BR': 'Automação e redução de trabalho manual' },
  'asm.sre.automation.m': { en: 'Workflows: {workflows}; runs: {runs}; succeeded: {pct}%.', 'pt-BR': 'Workflows: {workflows}; execuções: {runs}; com sucesso: {pct}%.' },
  'asm.sre.automation.none': { en: 'No workflow ran in the window.', 'pt-BR': 'Nenhum workflow executado na janela.' },
  'asm.sre.slo': { en: 'Service-level objectives', 'pt-BR': 'Objetivos de nível de serviço (SLO)' },
  'asm.sre.slo.unread': {
    en: 'Reading SLOs needs a permission this app does not hold yet (proposal F-12); ask the customer which SLOs exist.',
    'pt-BR': 'Ler SLOs exige uma permissão que o app ainda não tem (proposta F-12); pergunte ao cliente quais SLOs existem.',
  },
  'asm.sre.platform': { en: 'Platform engineering standards', 'pt-BR': 'Padrões de engenharia de plataforma' },
  'asm.sre.platform.m': {
    en: 'Standards met: {met} of {total} (most hosts in full-stack, every cluster reporting, owner tags on services).',
    'pt-BR': 'Padrões atendidos: {met} de {total} (maioria dos hosts em full-stack, todos os clusters enviando dados, tags de dono nos serviços).',
  },
  'asm.sre.security': { en: 'Security in operations', 'pt-BR': 'Segurança na operação' },
  'asm.sre.security.m': { en: 'Open vulnerabilities tracked: {total}; to act on now: {actNow}.', 'pt-BR': 'Vulnerabilidades abertas acompanhadas: {total}; para agir agora: {actNow}.' },

  // ---------------------------------------------------------------- cross-references (no repeated content)
  'xref.toAssessment.roadmap': {
    en: 'This page plans the findings in time. Coverage, maturity, SRE practices and every finding with its evidence are in the Coverage page.',
    'pt-BR': 'Esta página planeja os achados no tempo. Cobertura, maturidade, práticas de SRE e cada achado com a sua evidência estão na página Cobertura.',
  },
  'xref.toAssessment.opportunities': {
    en: 'This page is the shortlist to discuss. Coverage, maturity, SRE practices and every finding with its evidence are in the Coverage page.',
    'pt-BR': 'Esta página é a lista curta para discutir. Cobertura, maturidade, práticas de SRE e cada achado com a sua evidência estão na página Cobertura.',
  },
  'xref.openAssessment': { en: 'Open Coverage', 'pt-BR': 'Abrir a Cobertura' },
  'xref.fromAssessment': { en: 'The plan in 30/60/90-day horizons and the shortlist to discuss:', 'pt-BR': 'O plano em horizontes de 30/60/90 dias e a lista curta para discutir:' },

  // ---------------------------------------------------------------- heat map
  'asm.heat.strategic': { en: 'Strategic projects', 'pt-BR': 'Projetos estratégicos' },
  'asm.heat.fillIns': { en: 'Fill-ins', 'pt-BR': 'Ajustes rápidos' },
  'asm.heat.reconsider': { en: 'Reconsider', 'pt-BR': 'Reavaliar' },
  'asm.heat.plan': { en: 'Plan', 'pt-BR': 'Planejar' },
  'asm.heat.count': { en: 'Actions in this cell: {count}', 'pt-BR': 'Ações nesta célula: {count}' },

  // ---------------------------------------------------------------- assumptions
  'assumption.assessment.band.developing': { en: 'Coverage reads “developing” from', 'pt-BR': 'Cobertura lida como “em evolução” a partir de' },
  'assumption.assessment.band.developing.basis': { en: 'Below it, “initial”.', 'pt-BR': 'Abaixo disso, “inicial”.' },
  'assumption.assessment.band.moderate': { en: 'Coverage reads “moderate” from', 'pt-BR': 'Cobertura lida como “moderada” a partir de' },
  'assumption.assessment.band.moderate.basis': { en: 'Radar and executive summary.', 'pt-BR': 'Radar e resumo executivo.' },
  'assumption.assessment.band.good': { en: 'Coverage reads “good” from', 'pt-BR': 'Cobertura lida como “boa” a partir de' },
  'assumption.assessment.band.good.basis': { en: 'Also the “developing” line of the observability practice.', 'pt-BR': 'Também a linha “em evolução” da prática de observabilidade.' },
  'assumption.assessment.band.excellent': { en: 'Coverage reads “excellent” from', 'pt-BR': 'Cobertura lida como “excelente” a partir de' },
  'assumption.assessment.band.excellent.basis': { en: 'Also the “established” line of the observability practice.', 'pt-BR': 'Também a linha “estabelecida” da prática de observabilidade.' },

  'help.whatsNew.i76': {
    en: '3.4.3 — the Coverage page refined: five tabs keep it short (the PDF still prints them all); the Summary opens on coverage at a glance — coverage, maturity, capabilities in use, SRE practices and critical findings, achievements beside gaps, and a radar of coverage by domain — and on a five-step maturity journey with its criteria; a new tab reads the state of SRE and platform engineering; impact × effort is now a heat map; and what can improve is marked in soft yellow and orange.',
    'pt-BR': '3.4.3 — a página Cobertura refinado: cinco guias deixam a página curta (o PDF continua imprimindo todas); o Resumo abre com a cobertura num relance — cobertura, maturidade, capacidades em uso, práticas de SRE e achados críticos, conquistas ao lado das lacunas e um radar da cobertura por domínio — e com uma jornada de maturidade em cinco etapas com os critérios; uma guia nova lê o estado da SRE e da engenharia de plataforma; impacto × esforço virou um mapa de calor; e o que pode melhorar aparece em amarelo e laranja suaves.',
  },
} satisfies Record<string, Entry>;
