import { type Entry } from './locales';

/**
 * PoC Value Studio 3.3.5 — the Tech Wrapup tells each captured subject on one story slide, the four
 * dashboards move to a Settings tab of their own, and the deck builds without the brand pack.
 * Merged in `strings.ts`.
 */

export const v335Strings = {
  'settings.tab.dashboards': { en: 'Dashboards', 'pt-BR': 'Dashboards' },
  'dash4.title': { en: 'Dashboards of this PoC', 'pt-BR': 'Dashboards desta PoC' },
  'dash4.body': {
    en: 'Four dashboards you can deploy on this environment: “Value of the PoC” for the sponsors, and one for each team that will live with the platform. Each card below shows what the dashboard will hold; nothing is created until you confirm.',
    'pt-BR': 'Quatro dashboards que você pode implantar neste ambiente: o “Valor da PoC” para os patrocinadores e um para cada time que vai conviver com a plataforma. Cada cartão abaixo mostra o que o dashboard vai trazer; nada é criado antes da sua confirmação.',
  },
  'dash4.count': { en: '{n} of {total} created on this environment', 'pt-BR': '{n} de {total} criados neste ambiente' },
  'dash4.ready': { en: 'Ready to create', 'pt-BR': 'Pronto para criar' },
  'dash4.created': { en: 'Created {at}', 'pt-BR': 'Criado em {at}' },

  'help.whatsNew.i54': {
    en: '3.3.5 — Tech Wrapup: every captured subject now fits on one story slide — the app’s panel, large, with its numbers and what each pin shows beside it, and a strip of key findings, why it matters and the Assist along the bottom. The drawn chart joins it when the panel leaves room. Shorter deck, nothing said twice.',
    'pt-BR': '3.3.5 — Tech Wrapup: cada assunto capturado agora cabe em um slide-história — o painel do app, grande, com os números e o que cada pino mostra ao lado, e uma faixa com principais conclusões, por que importa e o Assist embaixo. O gráfico desenhado entra quando o painel deixa espaço. Deck mais enxuto, nada dito duas vezes.',
  },
  'help.whatsNew.i55': {
    en: '3.3.5 — Settings → Dashboards: “Value of the PoC” and the three specialty dashboards on a tab of their own, opened by an overview of which ones exist on the environment and a link to each.',
    'pt-BR': '3.3.5 — Configurações → Dashboards: o “Valor da PoC” e os três dashboards por especialidade numa guia própria, aberta por uma visão geral de quais já existem no ambiente e o link de cada um.',
  },
  'help.whatsNew.i56': {
    en: '3.3.5 — The deck no longer depends on the brand pack: a copy of the app without the corporate template, font and logos builds the whole Tech Wrapup and Real proof deck on a neutral theme in the deck’s own colours. `npm run brand:install` adds the pack back in one step.',
    'pt-BR': '3.3.5 — O deck não depende mais do pacote de marca: uma cópia do app sem o template corporativo, a fonte e os logos gera o Tech Wrapup e o deck de Provas reais completos, num tema neutro nas cores do próprio deck. O `npm run brand:install` devolve o pacote em um passo.',
  },
} satisfies Record<string, Entry>;
