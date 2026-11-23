import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.4.17: Settings → Prerequisites as a PDF for the customer (owner's feedback of
 * 2026-11-20), six cards three by two with the tenant first. Merged in `strings.ts`.
 */

export const v3417Strings = {
  'prq.tenant.title': {
    en: 'Your Dynatrace environment for the PoC',
    'pt-BR': 'O seu ambiente Dynatrace para a PoC',
  },
  'prq.tenant.who': {
    en: 'You, with your Dynatrace contact',
    'pt-BR': 'Você, com o seu contato na Dynatrace',
  },
  'prq.tenant.trial': {
    en: 'Sign up for a free 15-day Dynatrace trial to get an environment for the proof of concept — or use the Dynatrace environment your company already has.',
    'pt-BR': 'Cadastre-se na avaliação gratuita de 15 dias da Dynatrace para ter um ambiente para a prova de conceito — ou use o ambiente Dynatrace que a sua empresa já tem.',
  },
  'prq.tenant.saas': {
    en: 'Dynatrace is SaaS: there is nothing to install for the platform itself; your environment opens in the browser at its own address.',
    'pt-BR': 'A Dynatrace é SaaS: não há nada a instalar para a plataforma em si; o seu ambiente abre no navegador, no seu próprio endereço.',
  },
  'prq.tenant.next': {
    en: 'Then install OneAgent on a host so Dynatrace receives data, and explore what it brings — the cards below say what each of your teams prepares.',
    'pt-BR': 'Depois, instale o OneAgent em um servidor para a Dynatrace receber os dados e explore o que ela traz — os cartões abaixo dizem o que cada um dos seus times prepara.',
  },
  // The platform's "Common actions" pattern: "Download [item] (FORMAT)" (docs/design-guide/03-padroes.md).
  'prq.pdf': { en: 'Download prerequisites (PDF)', 'pt-BR': 'Baixar pré-requisitos (PDF)' },
  'prq.pdf.hint': {
    en: 'Opens the print dialog: choose “Save as PDF”. The PDF carries the drawing, the six cards and every documentation link — the example addresses stay on screen only.',
    'pt-BR': 'Abre a janela de impressão: escolha “Salvar como PDF”. O PDF leva o desenho, os seis cartões e cada link da documentação — os endereços de exemplo ficam só na tela.',
  },
  'prq.pdf.title': { en: 'Dynatrace PoC — prerequisites', 'pt-BR': 'PoC Dynatrace — pré-requisitos' },
  'prq.pdf.for': { en: 'Prepared for {customer}', 'pt-BR': 'Preparado para {customer}' },
  'prq.pdf.footer': {
    en: 'Prepared from the Dynatrace documentation (docs.dynatrace.com), read on 2026-11-20. Each line links to its page; the page is the reference, as the product evolves.',
    'pt-BR': 'Preparado a partir da documentação da Dynatrace (docs.dynatrace.com), lida em 2026-11-20. Cada linha leva à sua página; a página é a referência, já que o produto evolui.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i90': {
    en: '3.4.17 — Settings → Prerequisites as a PDF for the customer: “Download prerequisites (PDF)” prints three landscape pages — the connectivity drawing and where to find the addresses to allow, then six cards three by two — with every documentation link, and never the example addresses. A new first card tells how to get the Dynatrace tenant: the free 15-day trial and “Get started”.',
    'pt-BR': '3.4.17 — Configurações → Pré-requisitos em PDF para o cliente: “Baixar pré-requisitos (PDF)” imprime três páginas em paisagem — o desenho da conectividade e onde encontrar os endereços a liberar, depois seis cartões em três por dois — com cada link da documentação e nunca os endereços de exemplo. Um primeiro cartão novo diz como ter o tenant Dynatrace: a avaliação gratuita de 15 dias e o “Get started”.',
  },
} satisfies Record<string, Entry>;
