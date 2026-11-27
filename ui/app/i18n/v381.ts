import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.8.1 (the owner's validation of 3.8.0, "Segue validações da 3.8.0"): the service user that runs
 * the anomaly detectors set in Settings → PoC plan (a readiness step) and only checked on the PoC Builder; the customer's brand
 * colour on the dashboards' section banners, with two more colours; AI Observability in proportion; the menu in seven stages.
 * Merged in `strings.ts`.
 */

export const v381Strings = {
  // ------------------------------------------------------------------ Settings → PoC plan: the service user
  'su.title': { en: 'Service user for the anomaly detectors', 'pt-BR': 'Usuário de serviço dos detectores de anomalia' },
  'su.what': {
    en: 'The PoC Builder’s anomaly detectors run their query every minute on behalf of a service user — the platform does not take a person’s own account as a detector’s actor. Set it here once; the PoC Builder uses it.',
    'pt-BR': 'Os detectores de anomalia do PoC Builder rodam a sua consulta a cada minuto em nome de um usuário de serviço — a plataforma não aceita a conta de uma pessoa como ator de um detector. Defina aqui uma vez; o PoC Builder usa este.',
  },
  'su.none': { en: 'No service user saved with this PoC yet.', 'pt-BR': 'Ainda sem usuário de serviço salvo com esta PoC.' },
  'su.account.title': { en: 'Dynatrace account UUID', 'pt-BR': 'UUID da conta Dynatrace' },
  'su.account.why': {
    en: 'It opens the service users of the right account. Find it in Account Management’s address (account-uuid=…) or under Identity & access management → OAuth clients.',
    'pt-BR': 'Com ele o link abre os usuários de serviço da conta certa. Ele aparece no endereço do Account Management (account-uuid=…) ou em Identity & access management → OAuth clients.',
  },
  'su.account.placeholder': { en: 'Account UUID (8-4-4-4-12)', 'pt-BR': 'UUID da conta (8-4-4-4-12)' },
  'su.account.save': { en: 'Save the account', 'pt-BR': 'Salvar a conta' },
  'su.account.invalid': {
    en: 'An account UUID has 8-4-4-4-12 characters, as in the address of Account Management.',
    'pt-BR': 'O UUID da conta tem 8-4-4-4-12 caracteres, como no endereço do Account Management.',
  },
  'su.link.account': { en: 'Open this account’s service users', 'pt-BR': 'Abrir os usuários de serviço desta conta' },
  'su.link.root': { en: 'Open Account Management', 'pt-BR': 'Abrir o Account Management' },
  'su.steps.title': { en: 'Creating one for the PoC', 'pt-BR': 'Criando um para a PoC' },
  'su.steps.1': {
    en: 'In Account Management → Identity & access management → Service users, choose “Add service user” and name it, for example “{name}”.',
    'pt-BR': 'Em Account Management → Identity & access management → Service users, escolha “Add service user” e dê um nome, por exemplo “{name}”.',
  },
  'su.steps.2': {
    // 3.8.3: the policy below is the least a detector's actor needs (a new user with only "Pro User" failed at run time).
    en: 'Under “Assign permissions”, choose “Directly” and give it, for this environment, a policy with the statements below — the least a detector’s actor needs. “Pro User” alone is not enough: the detector then fails when it runs.',
    'pt-BR': 'Em “Assign permissions”, escolha “Directly” e dê a ele, para este ambiente, uma política com as instruções abaixo — o mínimo que o ator de um detector precisa. Só “Pro User” não basta: o detector falha ao rodar.',
  },
  'su.steps.3': {
    en: 'Copy its id (the UUID on its page) and paste it below, then “Check and use”.',
    'pt-BR': 'Copie o id dele (o UUID na sua página), cole abaixo e use “Conferir e usar”.',
  },
  'su.steps.why': {
    en: 'The service user is created in Account Management: its API takes an account-level OAuth client, which this app does not hold. To pick a service user as an actor, your user needs the “iam:service-users:use” permission — Dynatrace Pro and Admin users have it.',
    'pt-BR': 'O usuário de serviço é criado no Account Management: a API dele pede um cliente OAuth da conta, que este app não tem. Para escolher um usuário de serviço como ator, o seu usuário precisa da permissão “iam:service-users:use” — os usuários Dynatrace Pro e Admin já têm.',
  },
  'su.pick.title': { en: 'Service user to use', 'pt-BR': 'Usuário de serviço a usar' },
  'su.pick.none': {
    en: 'None of the detectors on this environment runs as a service user the platform accepts for you yet — paste the id of the one you created.',
    'pt-BR': 'Nenhum detector deste ambiente roda ainda como um usuário de serviço que a plataforma aceite para você — cole o id do que você criou.',
  },

  // ------------------------------------------------------------------ the PoC Builder reads it
  'builder.ad.actor.fromSettings': {
    en: 'Set the service user that runs the detectors in Settings → PoC plan; the PoC Builder uses it.',
    'pt-BR': 'Defina o usuário de serviço que roda os detectores em Configurações → Plano da PoC; o PoC Builder usa este.',
  },
  'builder.ad.actor.recheck': { en: 'Check with the platform', 'pt-BR': 'Conferir com a plataforma' },
  'builder.ad.actor.okBuilder': { en: 'Accepted by the platform: the detectors can be created.', 'pt-BR': 'Aceito pela plataforma: os detectores podem ser criados.' },
  'builder.ad.actor.openSettings': { en: 'Open Settings → PoC plan', 'pt-BR': 'Abrir Configurações → Plano da PoC' },

  // ------------------------------------------------------------------ readiness
  'settings.ready.serviceUser': { en: 'A service user for the anomaly detectors', 'pt-BR': 'Um usuário de serviço para os detectores de anomalia' },
  'setup.why.serviceUser': {
    en: 'The anomaly detectors the PoC Builder creates run as it — the platform does not take a person’s account as their actor.',
    'pt-BR': 'Os detectores de anomalia que o PoC Builder cria rodam como ele — a plataforma não aceita a conta de uma pessoa como ator.',
  },

  // ------------------------------------------------------------------ two more brand colours
  'settings.brand.navy': { en: 'Navy', 'pt-BR': 'Azul-marinho' },
  'settings.brand.green': { en: 'Green', 'pt-BR': 'Verde' },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i123': {
    en: '3.8.1 — The service user that runs the anomaly detectors is set in Settings → PoC plan, a step of the preparation: give the account’s UUID to open its service users in Account Management, pick one already running detectors here or paste the id of one made for the PoC, and the platform checks it before it is saved (the check no longer sends an empty event description, which it refused). The PoC Builder only reads and re-checks it. The dashboards’ section banners take the customer’s brand colour chosen in Settings, which gains navy and green. AI Observability is in proportion: tokens over time across the page, then tokens by model, tokens by service and the models in use side by side, the tables below; a donut’s total fits its ring. The menu has seven stages: the Executive summary opens Demonstrated value, and Consumption and events and Licensing close Recommendations.',
    'pt-BR': '3.8.1 — O usuário de serviço que roda os detectores de anomalia é definido em Configurações → Plano da PoC, um passo da preparação: informe o UUID da conta para abrir os usuários de serviço dela no Account Management, escolha um que já roda detectores aqui ou cole o id de um criado para a PoC, e a plataforma o confere antes de salvar (a conferência não manda mais a descrição do evento vazia, que ela recusava). O PoC Builder só lê e confere de novo. Os banners de seção dos dashboards usam a cor da marca do cliente escolhida em Configurações, que ganha azul-marinho e verde. A Observabilidade de IA fica proporcional: os tokens ao longo do tempo na largura da página, depois tokens por modelo, tokens por serviço e os modelos em uso lado a lado, e as tabelas abaixo; o total do donut cabe no anel. O menu tem sete etapas: o Resumo executivo abre Valor demonstrado, e Consumo e eventos e Licenciamento fecham Recomendações.',
  },
} satisfies Record<string, Entry>;
