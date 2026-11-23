import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.5.6 (owner's validation of 3.5.5, 2026-11-21: "4 a 5 pins por captura com
 * informações ricas"; the v5 proposal's Tech Wrapup, approved with its golden re-pin). Every capture of the Tech
 * Wrapup carries 4–5 pins on texts the app wrote, each read in the "How to read" legend: the label and its figure
 * (from the screen), a technical reading with a sales angle (a fixed sentence — never a number of its own, rule 8)
 * and the platform capability it shows. Merged in `strings.ts`.
 */

export const v356Strings = {
  // ---------------------------------------------------------------- labels read off the screen
  'cap.pin2.prov': { en: '{kind} · query {query}', 'pt-BR': '{kind} · consulta {query}' },
  'cap.pin2.provKind': { en: 'Evidence: {kind}', 'pt-BR': 'Evidência: {kind}' },
  'cap.pin2.row': { en: '{name}: {value}', 'pt-BR': '{name}: {value}' },
  'cap.pin2.node': { en: '{name}', 'pt-BR': '{name}' },
  'cap.pin2.affectedCount': { en: '{count} entities affected', 'pt-BR': '{count} entidades afetadas' },
  'cap.pin2.cell': { en: 'Busiest slot: {day}, {slot} — {value} problems', 'pt-BR': 'Faixa mais cheia: {day}, {slot} — {value} problemas' },
  'cap.pin2.here': { en: '{here}: {name}', 'pt-BR': '{here}: {name}' },

  // ---------------------------------------------------------------- capability chips
  'cap.c.oneagent': { en: 'OneAgent · full stack', 'pt-BR': 'OneAgent · full-stack' },
  'cap.c.saturation': { en: 'Saturation detection', 'pt-BR': 'Detecção de saturação' },
  'cap.c.grail': { en: 'Grail · DQL', 'pt-BR': 'Grail · DQL' },
  'cap.c.provenance': { en: 'Provenance on every number', 'pt-BR': 'Procedência em cada número' },
  'cap.c.detection': { en: 'Dynatrace Intelligence · detection', 'pt-BR': 'Dynatrace Intelligence · detecção' },
  'cap.c.rootCause': { en: 'Dynatrace Intelligence · root cause', 'pt-BR': 'Dynatrace Intelligence · causa raiz' },
  'cap.c.smartscape': { en: 'Smartscape · topology', 'pt-BR': 'Smartscape · topologia' },
  'cap.c.k8s': { en: 'Kubernetes observability', 'pt-BR': 'Observabilidade de Kubernetes' },
  'cap.c.tracing': { en: 'Distributed tracing', 'pt-BR': 'Rastreamento distribuído' },
  'cap.c.line': { en: 'Review line (assumptions)', 'pt-BR': 'Linha de revisão (premissas)' },
  'cap.c.cloud': { en: 'Cloud observability', 'pt-BR': 'Observabilidade de nuvem' },
  'cap.c.tech': { en: 'Technology discovery', 'pt-BR': 'Descoberta de tecnologias' },
  'cap.c.logs': { en: 'Logs on Grail', 'pt-BR': 'Logs no Grail' },
  'cap.c.security': { en: 'Runtime Vulnerability Analytics', 'pt-BR': 'Runtime Vulnerability Analytics' },
  'cap.c.rum': { en: 'Real User Monitoring', 'pt-BR': 'Real User Monitoring' },
  'cap.c.platform': { en: 'One agent, one platform', 'pt-BR': 'Um agente, uma plataforma' },
  'cap.c.assessment': { en: 'Coverage assessment', 'pt-BR': 'Avaliação de cobertura' },
  'cap.c.automation': { en: 'AutomationEngine · workflows', 'pt-BR': 'AutomationEngine · workflows' },

  // ---------------------------------------------------------------- shared readings
  'cap.d.prov': {
    en: 'Every number carries its evidence class, its DQL query and the time it was read: nothing on the slide is estimated.',
    'pt-BR': 'Cada número traz a classe de evidência, a consulta DQL e a hora da leitura: nada no slide é estimado.',
  },
  'cap.d.capped': {
    en: 'A capped list says so: the totals come from an aggregate query of their own, never from summing the rows shown.',
    'pt-BR': 'Lista limitada diz que é limitada: os totais vêm de uma consulta agregada própria, nunca da soma das linhas mostradas.',
  },

  // ---------------------------------------------------------------- per capture
  'cap.d.infra.ring': {
    en: 'Peak hourly CPU and memory of every host, measured by OneAgent: how much of the estate still has room.',
    'pt-BR': 'Pico por hora de CPU e memória de cada host, medido pelo OneAgent: quanto do parque ainda tem folga.',
  },
  'cap.d.infra.top': {
    en: 'The tightest host at its peak: resize it or spread its load before it turns into an incident.',
    'pt-BR': 'O host mais apertado no pico: redimensionar ou distribuir a carga antes que vire incidente.',
  },
  'cap.d.infra.next': {
    en: 'Hosts ordered from the highest peak down; each row says which resource peaked, CPU or memory.',
    'pt-BR': 'Hosts do pico mais alto ao mais baixo; cada linha diz qual recurso chegou ao pico, CPU ou memória.',
  },
  'cap.d.k8s.ring': {
    en: 'Restarts counted per workload across every cluster, with no per-pod setup: stability measured, not guessed.',
    'pt-BR': 'Reinícios contados por workload em todos os clusters, sem configuração por pod: estabilidade medida, não suposta.',
  },
  'cap.d.k8s.top': {
    en: 'The workload that restarts most: Dynatrace ties each restart to its pod, node and cluster for the fix.',
    'pt-BR': 'A workload que mais reinicia: a Dynatrace liga cada reinício ao pod, ao nó e ao cluster para a correção.',
  },
  'cap.d.k8s.line': {
    en: 'The line comes from the assumptions registry: above it, the restarts are worth a review with the platform team.',
    'pt-BR': 'A linha vem do registro de premissas: acima dela, os reinícios merecem revisão com o time de plataforma.',
  },
  'cap.d.svc.top': {
    en: 'The slowest of the busiest services, measured on real requests by distributed tracing: where users wait most.',
    'pt-BR': 'O mais lento entre os serviços mais movimentados, medido em requisições reais pelo rastreamento distribuído.',
  },
  'cap.d.svc.next': {
    en: 'Each service ranked by its average response time, with its status against the review line beside it.',
    'pt-BR': 'Cada serviço ordenado pelo tempo médio de resposta, com o status em relação à linha de revisão ao lado.',
  },
  'cap.d.svc.line': {
    en: 'The 1 s line comes from the assumptions registry; above it a service is worth a code-level look with PurePath.',
    'pt-BR': 'A linha de 1 s vem do registro de premissas; acima dela o serviço merece um olhar no código com o PurePath.',
  },
  'cap.d.cloud.total': {
    en: 'Hosts in each cloud counted from the platform\'s own inventory, with no cloud account mapped by hand.',
    'pt-BR': 'Hosts de cada nuvem contados pelo próprio inventário da plataforma, sem mapear conta de nuvem à mão.',
  },
  'cap.d.cloud.first': {
    en: 'The provider with the largest share: AWS, Azure and GCP in one view, in the same units.',
    'pt-BR': 'O provedor com a maior parte: AWS, Azure e GCP numa só visão, nas mesmas unidades.',
  },
  'cap.d.cloud.next': {
    en: 'Every provider side by side, ready for a multicloud comparison of cost and coverage.',
    'pt-BR': 'Todos os provedores lado a lado, prontos para comparar custo e cobertura entre nuvens.',
  },
  'cap.d.cloud.title': {
    en: 'A multicloud estate read in one place, by the same OneAgent on every provider.',
    'pt-BR': 'Um parque multinuvem lido num só lugar, pelo mesmo OneAgent em todos os provedores.',
  },
  'cap.d.cloud.svc': {
    en: 'Managed cloud services (functions, queues, databases) monitored next to the hosts, under one model.',
    'pt-BR': 'Serviços gerenciados de nuvem (funções, filas, bancos) monitorados ao lado dos hosts, num só modelo.',
  },
  'cap.d.cloud.svcTop': {
    en: 'The most used service of the provider: where a cloud incident would be felt first.',
    'pt-BR': 'O serviço mais usado do provedor: onde um incidente de nuvem seria sentido primeiro.',
  },
  'cap.d.tech.top': {
    en: 'The most present technology, discovered on every process automatically: no list kept by hand.',
    'pt-BR': 'A tecnologia mais presente, descoberta automaticamente em cada processo: nenhuma lista mantida à mão.',
  },
  'cap.d.tech.next': {
    en: 'Frameworks and runtimes read from the processes themselves: the base for upgrade and end-of-support plans.',
    'pt-BR': 'Frameworks e runtimes lidos dos próprios processos: a base para planos de atualização e fim de suporte.',
  },
  'cap.d.tech.title': {
    en: 'The whole stack mapped in one read: every technology monitored with the same agent.',
    'pt-BR': 'A pilha inteira mapeada numa leitura: cada tecnologia monitorada com o mesmo agente.',
  },
  'cap.d.logs.total': {
    en: 'Log volume ingested in the window, read from the platform\'s own usage events.',
    'pt-BR': 'Volume de logs ingerido na janela, lido dos próprios eventos de uso da plataforma.',
  },
  'cap.d.logs.peak': {
    en: 'The busiest hour: where retention and the cost of logs are decided.',
    'pt-BR': 'A hora mais cheia: é onde se decidem a retenção e o custo dos logs.',
  },
  'cap.d.logs.latest': {
    en: 'The latest hour beside the peak shows whether the volume is steady or still growing.',
    'pt-BR': 'A última hora ao lado do pico mostra se o volume está estável ou ainda crescendo.',
  },
  'cap.d.sec.total': {
    en: 'Vulnerabilities found in the code that is running, by Runtime Vulnerability Analytics, with no scanner to schedule.',
    'pt-BR': 'Vulnerabilidades encontradas no código em execução pelo Runtime Vulnerability Analytics, sem agendar scanner.',
  },
  'cap.d.sec.now': {
    en: 'All three signals at once — public exposure, reachable data, a known exploit: fix these first.',
    'pt-BR': 'Os três sinais juntos — exposição pública, dado alcançável, exploit conhecido: corrigir estas primeiro.',
  },
  'cap.d.sec.next': {
    en: 'Two of the three signals: the next in line once the act-now list is clear.',
    'pt-BR': 'Dois dos três sinais: as próximas da fila depois que a lista de agir agora zerar.',
  },
  'cap.d.dx.ring': {
    en: 'Requests without a front-end error, from Real User Monitoring of real users\' browsers.',
    'pt-BR': 'Requisições sem erro de front-end, pelo Real User Monitoring nos navegadores dos usuários reais.',
  },
  'cap.d.dx.worst': {
    en: 'The application with the highest error rate: where users meet the most failures.',
    'pt-BR': 'A aplicação com a maior taxa de erro: onde os usuários encontram mais falhas.',
  },
  'cap.d.dx.next': {
    en: 'Every application on the same absolute scale, worst first: one view for the front-end teams.',
    'pt-BR': 'Todas as aplicações na mesma escala absoluta, a pior primeiro: uma visão para os times de front-end.',
  },
  'cap.d.dx.line': {
    en: 'The 1 % line from the assumptions registry: applications under it are within what is expected.',
    'pt-BR': 'A linha de 1 % do registro de premissas: as aplicações abaixo dela estão dentro do esperado.',
  },
  'cap.d.comp.today': {
    en: 'Agents and tools running today, read from the processes OneAgent already sees on each host.',
    'pt-BR': 'Agentes e ferramentas rodando hoje, lidos dos processos que o OneAgent já vê em cada host.',
  },
  'cap.d.comp.dt': {
    en: 'One OneAgent per host in their place, with one data store and one root cause: fewer consoles to run.',
    'pt-BR': 'Um OneAgent por host no lugar deles, com um só armazenamento e uma causa raiz: menos consoles para operar.',
  },
  'cap.d.comp.platform': {
    en: 'Logs, metrics, traces and events in Grail, joined by Smartscape: one platform instead of several tools.',
    'pt-BR': 'Logs, métricas, traces e eventos no Grail, ligados pelo Smartscape: uma plataforma no lugar de várias ferramentas.',
  },
  'cap.d.asm.level': {
    en: 'Read from 16 criteria on four pillars, each one from a query of this environment.',
    'pt-BR': 'Lido de 16 critérios em quatro pilares, cada um a partir de uma consulta deste ambiente.',
  },
  'cap.d.asm.inplace': {
    en: 'What Dynatrace already delivers here, counted criterion by criterion.',
    'pt-BR': 'O que a Dynatrace já entrega aqui, contado critério a critério.',
  },
  'cap.d.asm.pillar': {
    en: 'Each pillar advances on its own; the rings show where the next step is closest.',
    'pt-BR': 'Cada pilar avança no seu ritmo; os anéis mostram onde o próximo passo está mais perto.',
  },
  'cap.d.asm.next': {
    en: 'The next steps come from the criteria still open: a concrete plan, not a generic checklist.',
    'pt-BR': 'Os próximos passos vêm dos critérios ainda abertos: um plano concreto, não uma lista genérica.',
  },
  'cap.d.asm.here': {
    en: 'Five steps that organisations climb over months, one pillar at a time.',
    'pt-BR': 'Cinco etapas que as organizações sobem ao longo de meses, um pilar de cada vez.',
  },
  'cap.d.asm.centre': {
    en: 'The observable coverage index, 0 to 100, over six domains whose weights live in the assumptions registry.',
    'pt-BR': 'O índice de cobertura observável, de 0 a 100, sobre seis domínios com pesos no registro de premissas.',
  },
  'cap.d.asm.best': {
    en: 'A domain fully covered: the telemetry is there and Dynatrace already uses it.',
    'pt-BR': 'Um domínio coberto por inteiro: a telemetria está lá e a Dynatrace já a usa.',
  },
  'cap.d.asm.gap': {
    en: 'The domain with the most room: the quickest gain of coverage for the next phase.',
    'pt-BR': 'O domínio com mais espaço: o ganho de cobertura mais rápido para a próxima fase.',
  },
  'cap.d.stack.start': {
    en: 'The map starts at the user: real-user and synthetic monitoring of every application.',
    'pt-BR': 'O mapa começa no usuário: monitoramento de usuários reais e sintético de cada aplicação.',
  },
  'cap.d.stack.services': {
    en: 'Services found by OneAgent and tied to the processes that run them, with no tagging by hand.',
    'pt-BR': 'Serviços encontrados pelo OneAgent e ligados aos processos que os executam, sem marcação manual.',
  },
  'cap.d.stack.hosts': {
    en: 'Hosts and clusters under the same model, so a slowdown is traced down to the machine.',
    'pt-BR': 'Hosts e clusters no mesmo modelo, para que uma lentidão seja rastreada até a máquina.',
  },
  'cap.d.stack.end': {
    en: 'The cloud closes the map: every layer connected by Smartscape, in real time.',
    'pt-BR': 'A nuvem fecha o mapa: cada camada ligada pelo Smartscape, em tempo real.',
  },
  'cap.d.mttr.top': {
    en: 'The category that takes longest to close: where automation would give back the most hours.',
    'pt-BR': 'A categoria que mais demora a fechar: onde a automação devolveria mais horas.',
  },
  'cap.d.mttr.next': {
    en: 'Mean time to resolve per category, from the problems Dynatrace Intelligence opened and closed.',
    'pt-BR': 'Tempo médio de resolução por categoria, dos problemas que a Dynatrace Intelligence abriu e fechou.',
  },
  'cap.d.mttr.last': {
    en: 'The fastest category shows what good already looks like in this environment.',
    'pt-BR': 'A categoria mais rápida mostra como é o bom resultado neste ambiente.',
  },
  'cap.d.mttr.title': {
    en: 'Durations only, measured on the window\'s problems: the base for an MTTR goal agreed with the teams.',
    'pt-BR': 'Só durações, medidas nos problemas da janela: a base para uma meta de MTTR acordada com os times.',
  },
  'cap.d.chain.0': {
    en: 'Entities with telemetry, found by OneAgent with no inventory to maintain.',
    'pt-BR': 'Entidades com telemetria, encontradas pelo OneAgent sem inventário para manter.',
  },
  'cap.d.chain.1': {
    en: 'Problems Dynatrace Intelligence opened with no alert rule written.',
    'pt-BR': 'Problemas que a Dynatrace Intelligence abriu sem nenhuma regra de alerta escrita.',
  },
  'cap.d.chain.2': {
    en: 'Share of the problems closed, with the mean time to resolve measured.',
    'pt-BR': 'Parcela dos problemas encerrados, com o tempo médio de resolução medido.',
  },
  'cap.d.chain.3': {
    en: 'Recurring patterns a workflow could absorb: work the team stops doing by hand.',
    'pt-BR': 'Padrões recorrentes que um workflow poderia absorver: trabalho que o time deixa de fazer à mão.',
  },
  'cap.d.chain.4': {
    en: 'Third-party agents one OneAgent can replace, with one platform to run.',
    'pt-BR': 'Agentes de terceiros que um OneAgent pode substituir, com uma só plataforma para operar.',
  },
  'cap.d.cal.busiest': {
    en: 'The busiest day of the window: each problem is a cause Dynatrace Intelligence found, not one alert per symptom.',
    'pt-BR': 'O dia mais cheio da janela: cada problema é uma causa que a Dynatrace Intelligence achou, não um alerta por sintoma.',
  },
  'cap.d.cal.cell': {
    en: 'The busiest six-hour slot: when on-call teams carry the most load.',
    'pt-BR': 'A faixa de seis horas mais cheia: quando o plantão carrega mais trabalho.',
  },
  'cap.d.cal.title': {
    en: 'Each cell is a day and a six-hour slot; the darker, the more problems began.',
    'pt-BR': 'Cada célula é um dia e uma faixa de seis horas; quanto mais escura, mais problemas começaram.',
  },
  'cap.d.rings.closed': {
    en: 'Problems no longer open in the window: Dynatrace Intelligence also closes what it opened.',
    'pt-BR': 'Problemas que não estão mais abertos na janela: a Dynatrace Intelligence também fecha o que abriu.',
  },
  'cap.d.rings.recurrence': {
    en: 'The share of problems that repeat: recurring causes are the first candidates for a workflow.',
    'pt-BR': 'A parcela de problemas que se repetem: causas recorrentes são as primeiras candidatas a um workflow.',
  },
  'cap.d.rings.open': {
    en: 'Problems open right now, out of every problem of the window.',
    'pt-BR': 'Problemas abertos agora, entre todos os problemas da janela.',
  },
  'cap.d.arr.peak': {
    en: 'The busiest stretch: problems opened by cause, so a storm of symptoms reads as a few problems.',
    'pt-BR': 'O trecho mais cheio: problemas abertos por causa, então uma tempestade de sintomas vira poucos problemas.',
  },
  'cap.d.arr.mean': {
    en: 'The mean of the window, drawn as a line: the normal level the peak is compared with.',
    'pt-BR': 'A média da janela, desenhada como linha: o nível normal com que o pico é comparado.',
  },
  'cap.d.arr.title': {
    en: 'Arrivals over seven days, detected with no alert rule written.',
    'pt-BR': 'Chegadas em sete dias, detectadas sem nenhuma regra de alerta escrita.',
  },
  'cap.d.mix.total': {
    en: 'Every problem of the seven days, each one a cause found by Dynatrace Intelligence.',
    'pt-BR': 'Todos os problemas dos sete dias, cada um uma causa encontrada pela Dynatrace Intelligence.',
  },
  'cap.d.mix.first': {
    en: 'The category that weighs most: where a fix or an automation removes the most problems.',
    'pt-BR': 'A categoria que mais pesa: onde uma correção ou automação tira mais problemas.',
  },
  'cap.d.mix.next': {
    en: 'The next category in weight, with its share of every problem.',
    'pt-BR': 'A categoria seguinte em peso, com sua parcela de todos os problemas.',
  },
  'cap.d.rca.problem': {
    en: 'The incident with the widest impact of the window, with its duration from start to close.',
    'pt-BR': 'O incidente de maior impacto da janela, com a duração do início ao fechamento.',
  },
  'cap.d.rca.root': {
    en: 'The root cause Dynatrace Intelligence named on the dependency graph — deterministic, not a correlation.',
    'pt-BR': 'A causa raiz que a Dynatrace Intelligence apontou no grafo de dependências — determinística, não correlação.',
  },
  'cap.d.rca.affected': {
    en: 'An entity the problem reached, linked to the cause by Smartscape.',
    'pt-BR': 'Uma entidade que o problema alcançou, ligada à causa pelo Smartscape.',
  },
  'cap.d.rca.count': {
    en: 'Every affected entity grouped in one problem, instead of one alert per symptom.',
    'pt-BR': 'Todas as entidades afetadas agrupadas num só problema, em vez de um alerta por sintoma.',
  },
  'cap.d.exec.ring': {
    en: 'A headline of the PoC, derived from the same reads as the pages: open the app to see its query.',
    'pt-BR': 'Um destaque da PoC, derivado das mesmas leituras das páginas: abra o app para ver a consulta.',
  },
  'cap.d.chips.top': {
    en: 'The technology with the most instances, discovered automatically, with its official mark.',
    'pt-BR': 'A tecnologia com mais instâncias, descoberta automaticamente, com sua marca oficial.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i98': {
    en: '3.5.6 — The Tech Wrapup and the Real proofs, pinned right. Each capture of the Tech Wrapup now reads itself in three to five pins, each one on a text the app wrote (a host\'s name, a ring\'s label, a legend row) — never on a panel\'s corner — and the legend "How to read" says, for each pin, the figure, what it means technically and the platform capability it shows (Dynatrace Intelligence, Smartscape, OneAgent, Grail…). Ranked bars are photographed as rows with their names. The Real proofs read the screen in the platform\'s own typeface (it had used a stand-in), with better zones for the service and cluster screens: about twice the labels found, and screens read before are read again once.',
    'pt-BR': '3.5.6 — Tech Wrapup e Provas reais com os alfinetes no lugar. Cada captura do Tech Wrapup agora se lê em três a cinco alfinetes, cada um sobre um texto que o app escreveu (o nome de um host, o rótulo de um anel, uma linha de legenda) — nunca no canto de um painel — e a legenda "Como ler" diz, para cada alfinete, o número, o que ele significa tecnicamente e a capacidade da plataforma que ele mostra (Dynatrace Intelligence, Smartscape, OneAgent, Grail…). As barras ranqueadas são fotografadas como linhas com os nomes. As Provas reais leem a tela na fonte da própria plataforma (antes usavam uma substituta), com zonas melhores nas telas de serviço e de cluster: cerca do dobro de rótulos encontrados, e as telas já lidas são lidas de novo uma vez.',
  },
} satisfies Record<string, Entry>;
