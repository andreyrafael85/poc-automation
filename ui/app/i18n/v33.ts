import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.0 — "Fundação e verdade".
 *
 * The strings of the foundation release: the page that appears instead of a white screen, the
 * address this app does not have, and the What's new entries of 3.3.0. Merged in `strings.ts`;
 * `tests/i18n.test.ts` checks that no fragment silently overrides a key defined by another.
 */

export const v33Strings = {
  // ------------------------------------------------------------------ Route boundary (TD-24)
  'boundary.title': {
    en: 'This section could not be drawn',
    'pt-BR': 'Esta seção não pôde ser desenhada',
  },
  'boundary.body': {
    en: 'The rest of the app is working: the navigation, the window and everything you had set are still here. Try this section again, or open another stage and come back. If it happens right after an update, reloading picks up the new files.',
    'pt-BR': 'O resto do app está funcionando: a navegação, a janela e tudo o que você configurou continuam aqui. Tente esta seção de novo, ou abra outra etapa e volte. Se isso aconteceu logo depois de uma atualização, recarregar busca os arquivos novos.',
  },
  'boundary.retry': { en: 'Try this section again', 'pt-BR': 'Tentar esta seção de novo' },
  'boundary.reload': { en: 'Reload the app', 'pt-BR': 'Recarregar o app' },
  'boundary.technical': { en: 'Technical detail', 'pt-BR': 'Detalhe técnico' },

  // ------------------------------------------------------------------ Unknown address (TD-24)
  'notfound.title': { en: 'This address is not part of the app', 'pt-BR': 'Este endereço não faz parte do app' },
  'notfound.body': {
    en: 'The link you followed may be from an older version, or the address may have a typo. Everything the app has is in the navigation on the left.',
    'pt-BR': 'O link que você seguiu pode ser de uma versão anterior, ou o endereço pode ter um erro de digitação. Tudo o que o app tem está na navegação à esquerda.',
  },
  'notfound.back': { en: 'Go to the Overview', 'pt-BR': 'Ir para a Visão geral' },

  'common.causeNotNamed': { en: 'Cause not named by Dynatrace Intelligence', 'pt-BR': 'Causa não nomeada pela Dynatrace Intelligence' },
  'p.ai.h.rootCause': { en: 'Root cause', 'pt-BR': 'Causa raiz' },

  // ------------------------------------------------------------------ Catalog purposes (3.3.1, Q8)
  'catalog.purpose.lic.k8spodhours': {
    en: 'Kubernetes pod-hours the platform actually billed in the window, with the window it covers, so the annual sizing is extrapolated from measured hours instead of from a count of pods that happen to exist right now.',
    'pt-BR': 'Pod-horas de Kubernetes que a plataforma realmente cobrou na janela, com a janela que elas cobrem, para o dimensionamento anual ser extrapolado de horas medidas em vez de uma contagem de pods que por acaso existem agora.',
  },
  'catalog.purpose.cons.advisor.total': {
    en: 'Exact totals of the query accounting over every table at once: how many distinct queries ran, how much they scanned on demand and how many records they delivered. Exists because one query touching several tables appears once per table, so adding up the per-table rows counts it twice.',
    'pt-BR': 'Totais exatos da contabilidade de consultas sobre todas as tabelas de uma vez: quantas consultas distintas rodaram, quanto varreram sob demanda e quantos registros entregaram. Existe porque uma consulta que toca várias tabelas aparece uma vez por tabela, então somar as linhas por tabela a conta duas vezes.',
  },

  // ------------------------------------------------------------------ Access (3.3.1, S2)
  'gate.noPassword': {
    en: 'This PoC has no password yet. The Sales Engineer running it sets one in Settings, then shares it with you — there is nothing to type until then.',
    'pt-BR': 'Esta PoC ainda não tem senha. O SE que conduz a PoC define uma em Configurações e compartilha com você — até lá, não há o que digitar.',
  },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i47': {
    en: '3.3.1 — Three figures were corrected against the tenant itself. "Queries executed" counted one query once per table it touched, so it read 33,974 where 33,154 queries ran. Recurring problems are now grouped by the entity Dynatrace Intelligence blamed: "Failure rate increase" was one pattern of 59 and is really three — 32 with no cause named, 8 on one database, 7 on one service. And the Kubernetes sizing now extrapolates from the pod-hours the platform billed instead of holding today\'s pod count for a year, which read 53 % high.',
    'pt-BR': '3.3.1 — Três números foram corrigidos contra o próprio tenant. "Consultas executadas" contava uma consulta uma vez por tabela tocada, e por isso lia 33.974 onde rodaram 33.154. Os problemas recorrentes passam a ser agrupados pela entidade que a Dynatrace Intelligence apontou: "Failure rate increase" era um padrão de 59 e são três — 32 sem causa nomeada, 8 num banco, 7 num serviço. E o dimensionamento de Kubernetes extrapola das pod-horas que a plataforma cobrou, em vez de segurar a contagem de pods de hoje por um ano, que lia 53% a mais.',
  },
  'help.whatsNew.i45': {
    en: '3.3.1 — Tech Wrapup deck: a bar chart\'s value is no longer cut. The room beside each bar is measured from the widest value in the deck\'s own typeface instead of a fixed box, so the logs slide prints "1,557,000" whole — it was losing its last digit since 3.2.4. The .pptx itself changes on slides that carry a bar chart.',
    'pt-BR': '3.3.1 — Deck Tech Wrapup: o valor de um gráfico de barras não é mais cortado. O espaço ao lado de cada barra passa a ser medido pelo maior valor na própria fonte do deck, em vez de uma caixa fixa, então o slide de logs imprime "1.557.000" inteiro — ele perdia o último dígito desde a 3.2.4. O .pptx muda nos slides que levam gráfico de barras.',
  },
  'help.whatsNew.i46': {
    en: '3.3.1 — A PoC now needs a password of its own before a partner can open the app. The password that used to come built into the app is gone: it was the same in every tenant where no SE had set one, and it travelled in the app\'s own files. Settings says so, and a partner who arrives before the SE has set one is told exactly that instead of "wrong password".',
    'pt-BR': '3.3.1 — Uma PoC agora precisa de senha própria antes que um parceiro consiga abrir o app. A senha que vinha embutida acabou: ela era a mesma em todo tenant onde nenhum SE definiu outra, e viajava nos próprios arquivos do app. As Configurações dizem isso, e um parceiro que chega antes de o SE definir uma recebe exatamente essa informação, não "senha incorreta".',
  },
  'help.whatsNew.i41': {
    en: '3.3.0 — A page that fails to draw no longer blanks the app. The section that failed shows a recovery card with "Try this section again" and "Reload the app", while the header, the navigation and the stage pager keep working; an address the app does not have now says so instead of showing an empty page.',
    'pt-BR': '3.3.0 — Uma página que não consegue desenhar não apaga mais o app. A seção que falhou mostra um cartão com “Tentar esta seção de novo” e “Recarregar o app”, enquanto o cabeçalho, a navegação e o paginador de etapas continuam funcionando; um endereço que o app não tem passa a dizer isso em vez de mostrar uma página vazia.',
  },
  'help.whatsNew.i42': {
    en: '3.3.0 — Executive mode, the presentation mode that puts licensing, consumption and cost away for the whole app, is now reachable on a phone and on a split screen: on a narrow screen its switch moves to a row of its own just under the header, with its label beside it, instead of disappearing from the strip.',
    'pt-BR': '3.3.0 — O Modo executivo, que é o modo de apresentação e guarda licenciamento, consumo e custo do app inteiro, agora é alcançável no celular e em tela dividida: numa tela estreita a chave passa para uma linha própria logo abaixo do cabeçalho, com o rótulo ao lado, em vez de sair da faixa.',
  },
  'help.whatsNew.i43': {
    en: '3.3.0 — Every measured number on a tile is written in the active language, so "6842" reads as "6,842" (and "6.842" in Portuguese) wherever it appears. Long names that a chip or the deck preview has to clip now show the whole text on hover and to assistive technology.',
    'pt-BR': '3.3.0 — Todo número medido num cartão é escrito no idioma ativo, então “6842” aparece como “6.842” em qualquer lugar. Nomes longos que um chip ou a prévia do deck precisa cortar passam a mostrar o texto inteiro ao passar o mouse e para a tecnologia assistiva.',
  },
  'help.whatsNew.i44': {
    en: '3.3.0 — A surface mounted outside the access provider now starts closed instead of open: nothing commercial can appear before the session has said who is watching.',
    'pt-BR': '3.3.0 — Uma superfície montada fora do provedor de acesso agora começa fechada, não aberta: nada comercial aparece antes de a sessão dizer quem está olhando.',
  },
} satisfies Record<string, Entry>;
