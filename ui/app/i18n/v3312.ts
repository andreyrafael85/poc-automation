import { type Entry } from './locales';

/** PoC Value Studio 3.3.12 — the Coverage stage on the chart engine (lot 3). Merged in `strings.ts`. */

export const v3312Strings = {
  'cockpit.biz.title': { en: 'The most frequent event types', 'pt-BR': 'Os tipos de evento mais frequentes' },
  'cockpit.biz.topOf': { en: 'top {shown} of the {listed} listed', 'pt-BR': 'top {shown} dos {listed} listados' },
  'cockpit.biz.topOfTotal': { en: 'top {shown} of the {listed} listed · {total} types', 'pt-BR': 'top {shown} dos {listed} listados · {total} tipos' },
  'help.whatsNew.i63': {
    en: '3.3.12 — The Coverage stage on the chart engine: Coverage shows every category on compact tiles beside the estate by layer; Technologies puts the technologies by process count beside the chips; Cloud puts the providers beside the hosts’ distribution; Business events ranks the most frequent event types beside what the page cannot say; and Digital experience puts its five headline figures beside the Assist.',
    'pt-BR': '3.3.12 — A etapa Cobertura no motor gráfico: Cobertura mostra todas as categorias em tiles compactos ao lado do ambiente por camada; Tecnologias põe as tecnologias por quantidade de processos ao lado dos chips; Cloud põe os provedores ao lado da distribuição dos hosts; Eventos de negócio mostra os tipos de evento mais frequentes ao lado do que a página não afirma; e Experiência digital põe os cinco números principais ao lado do Assist.',
  },
} satisfies Record<string, Entry>;
