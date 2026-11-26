import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.8.0 (the owner's validation of 3.7.9, "Seguir com a próxima release, validações da 3.7.9"):
 * the PoC Builder's anomaly detectors run as a service user and are created by the app again, one per signal or per service;
 * the OpenPipeline routing and the alerts links; the AI Observability models beside the tokens table. Merged in `strings.ts`.
 */

export const v380Strings = {
  // ------------------------------------------------------------------ anomaly detectors: per service, run by a service user
  'builder.ad.nameService': { en: '{signal} — {service} (PoC of {customer})', 'pt-BR': '{signal} — {service} (PoC de {customer})' },
  'builder.ad.perService': {
    en: 'One detector per service ticked (each signal for each service, named after it)',
    'pt-BR': 'Um detector por serviço marcado (cada sinal para cada serviço, com o nome dele)',
  },
  'builder.ad.perServiceScope': {
    en: 'One detector per signal for each of the {n} service(s) ticked.',
    'pt-BR': 'Um detector por sinal para cada um do(s) {n} serviço(s) marcado(s).',
  },
  'builder.ad.eachService': { en: 'each of {n} service(s)', 'pt-BR': 'cada um de {n} serviço(s)' },
  'builder.ad.pickSignal': { en: 'Tick at least one golden signal to create detectors.', 'pt-BR': 'Marque ao menos um sinal de ouro para criar detectores.' },
  'builder.ad.pickActor': {
    en: 'Choose the service user that runs the detectors (above) to create them here.',
    'pt-BR': 'Escolha o usuário de serviço que roda os detectores (acima) para criá-los aqui.',
  },
  'builder.ad.room': { en: 'A PoC keeps up to {n} detectors: the list was cut to fit.', 'pt-BR': 'Uma PoC guarda até {n} detectores: a lista foi ajustada para caber.' },
  'builder.ad.actor.title': { en: 'Service user that runs the detectors', 'pt-BR': 'Usuário de serviço que roda os detectores' },
  'builder.ad.actor.why': {
    en: 'A detector runs its query every minute on behalf of an actor, and the platform takes a service user as that actor — a person’s own account is not accepted, in the API or in the Anomaly Detection app.',
    'pt-BR': 'Um detector roda a sua consulta a cada minuto em nome de um ator, e a plataforma aceita um usuário de serviço como esse ator — a conta de uma pessoa não é aceita, nem pela API nem pelo app Anomaly Detection.',
  },
  'builder.ad.actor.looking': {
    en: 'Looking for the service users already running detectors here…',
    'pt-BR': 'Procurando os usuários de serviço que já rodam detectores aqui…',
  },
  'builder.ad.actor.offer': { en: 'Use {id}… · runs {n} detector(s), e.g. “{example}”', 'pt-BR': 'Usar {id}… · roda {n} detector(es), ex. “{example}”' },
  'builder.ad.actor.placeholder': { en: 'Or paste a service user id (UUID)', 'pt-BR': 'Ou cole o id de um usuário de serviço (UUID)' },
  'builder.ad.actor.check': { en: 'Check and use', 'pt-BR': 'Conferir e usar' },
  'builder.ad.actor.checking': { en: 'Asking the platform (nothing is written)…', 'pt-BR': 'Consultando a plataforma (nada é gravado)…' },
  'builder.ad.actor.ok': {
    en: 'Accepted by the platform — saved with this PoC as the detectors’ actor.',
    'pt-BR': 'Aceito pela plataforma — salvo com esta PoC como o ator dos detectores.',
  },
  'builder.ad.actor.refused': { en: 'The platform did not take this one: {reason}', 'pt-BR': 'A plataforma não aceitou este: {reason}' },
  'builder.ad.actor.notId': { en: 'A service user id is a UUID (8-4-4-4-12 characters).', 'pt-BR': 'O id de um usuário de serviço é um UUID (8-4-4-4-12 caracteres).' },
  'builder.ad.actor.saved': { en: 'Detectors run as the service user {id}', 'pt-BR': 'Os detectores rodam como o usuário de serviço {id}' },
  'builder.ad.actor.how': {
    en: 'No service user yet? In Account Management → Identity & access management → Service users, create one, give it a policy that reads the environment’s data (storage read), then paste its id here.',
    'pt-BR': 'Ainda sem usuário de serviço? Em Account Management → Identity & access management → Service users, crie um, dê a ele uma política de leitura dos dados do ambiente (storage read) e cole o id aqui.',
  },
  'builder.ad.orApp': { en: 'Or open one in the Anomaly Detection app', 'pt-BR': 'Ou abrir um no app Anomaly Detection' },

  // ------------------------------------------------------------------ What's new
  'help.whatsNew.i122': {
    en: '3.8.0 — The PoC Builder creates the anomaly detectors again: they run as a service user (the platform does not take a person’s own account as a detector’s actor), offered from those already running detectors on the environment or pasted, and checked with the platform before anything is written; one detector per golden signal over the services ticked, or one per signal and per service; kept in the Register and removed by the clean-up. Opening a detector in the Anomaly Detection app now arrives with its event filled in. The links go to Settings → all the alerts and to the OpenPipeline dynamic routes. On AI Observability, the models in use sit beside the tokens by service and model.',
    'pt-BR': '3.8.0 — O PoC Builder volta a criar os detectores de anomalia: eles rodam como um usuário de serviço (a plataforma não aceita a conta de uma pessoa como ator de um detector), oferecido entre os que já rodam detectores no ambiente ou colado, e conferido com a plataforma antes de gravar qualquer coisa; um detector por sinal de ouro sobre os serviços marcados, ou um por sinal e por serviço; guardados no Registro e removidos pela limpeza. Abrir um detector no app Anomaly Detection agora chega com o evento preenchido. Os links vão para Configurações → todos os alertas e para as rotas dinâmicas do OpenPipeline. Em Observabilidade de IA, os modelos em uso ficam ao lado dos tokens por serviço e modelo.',
  },
} satisfies Record<string, Entry>;
