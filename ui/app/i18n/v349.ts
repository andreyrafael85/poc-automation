import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.9 — the Assessment's conversation guide by audience (proposal §C8 F-08: leadership, SRE and
 * operations, development, security). Merged in `strings.ts`.
 */

export const v349Strings = {
  'asm.persona.title': { en: 'Conversation guide by audience — SE and partner', 'pt-BR': 'Roteiro de conversa por público — SE e parceiro' },
  'asm.persona.titleFor': { en: 'Conversation guide — {audience}', 'pt-BR': 'Roteiro de conversa — {audience}' },
  'asm.persona.caption': {
    en: 'The same reading told to each audience: what it cares about, the measured figures that open the talk, three opening questions, the findings that concern it with the question to ask, and what to show on the platform. For the SE and the partner; it prints only when asked.',
    'pt-BR': 'A mesma leitura contada para cada público: o que importa para ele, os números medidos que abrem a conversa, três perguntas de abertura, os achados que o envolvem com a pergunta a fazer e o que mostrar na plataforma. Para o SE e o parceiro; só vai para o PDF quando pedido.',
  },
  'asm.persona.audience': { en: 'Audience', 'pt-BR': 'Público' },
  'asm.persona.all': { en: 'All', 'pt-BR': 'Todos' },
  'asm.persona.executive': { en: 'Leadership (CIO)', 'pt-BR': 'Liderança (CIO)' },
  'asm.persona.sre': { en: 'SRE & operations', 'pt-BR': 'SRE e operações' },
  'asm.persona.dev': { en: 'Development', 'pt-BR': 'Desenvolvimento' },
  'asm.persona.security': { en: 'Security', 'pt-BR': 'Segurança' },
  'asm.persona.print': { en: 'Print this guide with the PDF', 'pt-BR': 'Imprimir este roteiro no PDF' },
  'asm.persona.figures': { en: 'Figures to open the conversation', 'pt-BR': 'Números para abrir a conversa' },
  'asm.persona.opening': { en: 'Opening questions', 'pt-BR': 'Perguntas de abertura' },
  'asm.persona.show': { en: 'Show on the platform', 'pt-BR': 'Mostrar na plataforma' },
  'asm.persona.none': {
    en: 'No finding of this reading concerns this audience directly; the opening questions still lead the conversation.',
    'pt-BR': 'Nenhum achado desta leitura envolve este público diretamente; as perguntas de abertura conduzem a conversa.',
  },

  // ---------------------------------------------------------------- leadership
  'asm.persona.executive.focus': { en: 'What the leadership cares about: risk to the business, the cost of running several tools, and how fast the teams respond — the value cycle is the frame.', 'pt-BR': 'O que importa para a liderança: risco para o negócio, o custo de manter várias ferramentas e a velocidade de resposta dos times — o ciclo de valor é a moldura.' },
  'asm.persona.executive.q1': {
    en: 'Which digital journeys carry the most revenue or reputation, and how do you learn today that one of them is degraded?',
    'pt-BR': 'Quais jornadas digitais carregam mais receita ou reputação, e como vocês ficam sabendo hoje que uma delas está degradada?',
  },
  'asm.persona.executive.q2': {
    en: 'How many monitoring tools and teams are involved in one incident today, and what would consolidating them be worth?',
    'pt-BR': 'Quantas ferramentas de monitoramento e times entram num incidente hoje, e quanto valeria consolidá-los?',
  },
  'asm.persona.executive.q3': { en: 'Which autonomy target should the organisation agree for its critical services in the next twelve months?', 'pt-BR': 'Qual alvo de autonomia a organização quer combinar para os serviços críticos nos próximos doze meses?' },

  // ---------------------------------------------------------------- SRE and operations
  'asm.persona.sre.focus': {
    en: 'What SRE and operations care about: detecting before the users, resolving fast, automating the repetitive response and keeping the estate fully in view.',
    'pt-BR': 'O que importa para SRE e operações: detectar antes dos usuários, resolver rápido, automatizar a resposta repetitiva e manter o ambiente inteiro visível.',
  },
  'asm.persona.sre.q1': {
    en: 'Which incidents of the last quarter took longest to resolve, and where did the time go?',
    'pt-BR': 'Quais incidentes do último trimestre mais demoraram para resolver, e onde o tempo foi gasto?',
  },
  'asm.persona.sre.q2': {
    en: 'Which services have service-level objectives today, and who is alerted when an error budget burns?',
    'pt-BR': 'Quais serviços têm objetivos de nível de serviço hoje, e quem é avisado quando um orçamento de erros é consumido?',
  },
  'asm.persona.sre.q3': {
    en: 'Which repetitive operational task would the team automate first?',
    'pt-BR': 'Qual tarefa operacional repetitiva o time automatizaria primeiro?',
  },

  // ---------------------------------------------------------------- development
  'asm.persona.dev.focus': {
    en: 'What development cares about: finding the root cause in code quickly, seeing a release’s effect on users, and logs that already carry the trace.',
    'pt-BR': 'O que importa para desenvolvimento: chegar rápido à causa raiz no código, ver o efeito de uma entrega nos usuários e logs que já tragam o trace.',
  },
  'asm.persona.dev.q1': {
    en: 'How does a developer go from an alert to the line of code today, and how long does it take?',
    'pt-BR': 'Como um desenvolvedor vai hoje de um alerta até a linha de código, e quanto tempo isso leva?',
  },
  'asm.persona.dev.q2': {
    en: 'How do you know whether a release made the users’ experience better or worse?',
    'pt-BR': 'Como vocês sabem se uma entrega melhorou ou piorou a experiência dos usuários?',
  },
  'asm.persona.dev.q3': {
    en: 'Which services would the teams like to see end to end, from the front end to the database?',
    'pt-BR': 'Quais serviços os times gostariam de ver de ponta a ponta, do front-end ao banco de dados?',
  },

  // ---------------------------------------------------------------- security
  'asm.persona.security.focus': {
    en: 'What security cares about: the vulnerabilities that are really exposed in runtime, who owns each fix, and who may read which data.',
    'pt-BR': 'O que importa para segurança: as vulnerabilidades realmente expostas em runtime, quem é responsável por cada correção e quem pode ler quais dados.',
  },
  'asm.persona.security.q1': {
    en: 'How are vulnerabilities prioritised today — by score alone, or by exposure and reachability in production?',
    'pt-BR': 'Como as vulnerabilidades são priorizadas hoje — só pela nota, ou pela exposição e alcance em produção?',
  },
  'asm.persona.security.q2': {
    en: 'Who owns each service when a fix is needed, and where is that recorded?',
    'pt-BR': 'Quem é o responsável por cada serviço quando uma correção é necessária, e onde isso está registrado?',
  },
  'asm.persona.security.q3': {
    en: 'Which data must stay restricted to some teams, and how is that access governed today?',
    'pt-BR': 'Quais dados precisam ficar restritos a alguns times, e como esse acesso é governado hoje?',
  },

  // ---------------------------------------------------------------- opening figures (measured, never estimated)
  'asm.persona.fig.index': { en: 'Observable coverage: {value} of 100', 'pt-BR': 'Cobertura observável: {value} de 100' },
  'asm.persona.fig.maturity': { en: 'Maturity: step {level} of 5', 'pt-BR': 'Maturidade: etapa {level} de 5' },
  'asm.persona.fig.critical': { en: 'Critical findings: {count}', 'pt-BR': 'Achados críticos: {count}' },
  'asm.persona.fig.tools': { en: 'Other monitoring tools running: {count}', 'pt-BR': 'Outras ferramentas de monitoramento em execução: {count}' },
  'asm.persona.fig.mttr': { en: 'Problems closed: {problems}, in {hours} h on average', 'pt-BR': 'Problemas encerrados: {problems}, em {hours} h em média' },
  'asm.persona.fig.workflows': { en: 'Workflows: {workflows}, with {runs} runs', 'pt-BR': 'Workflows: {workflows}, com {runs} execuções' },
  'asm.persona.fig.clusters': { en: 'Kubernetes clusters reporting: {reporting} of {total}', 'pt-BR': 'Clusters Kubernetes reportando: {reporting} de {total}' },
  'asm.persona.fig.services': { en: 'Services with traffic: {count}', 'pt-BR': 'Serviços com tráfego: {count}' },
  'asm.persona.fig.failing': { en: 'Services above the failure line: {count}', 'pt-BR': 'Serviços acima da linha de falha: {count}' },
  'asm.persona.fig.logContext': { en: 'Logs with service context: {pct}%', 'pt-BR': 'Logs com contexto de serviço: {pct}%' },
  'asm.persona.fig.vulns': {
    en: 'Open vulnerabilities: {total} (act now: {actNow}; critical: {critical})',
    'pt-BR': 'Vulnerabilidades abertas: {total} (agir agora: {actNow}; críticas: {critical})',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i82': {
    en: '3.4.9 — the Coverage page’s conversation guide by audience: leadership, SRE and operations, development and security each get what they care about, the measured figures that open the talk, three opening questions, the findings that concern them with the question to ask, and what to show on the platform with a link to the documentation. For the SE and the partner; it prints with the PDF only when asked.',
    'pt-BR': '3.4.9 — o roteiro de conversa da página Cobertura por público: liderança, SRE e operações, desenvolvimento e segurança recebem o que importa para cada um, os números medidos que abrem a conversa, três perguntas de abertura, os achados que os envolvem com a pergunta a fazer e o que mostrar na plataforma, com link para a documentação. Para o SE e o parceiro; vai para o PDF só quando pedido.',
  },
} satisfies Record<string, Entry>;
