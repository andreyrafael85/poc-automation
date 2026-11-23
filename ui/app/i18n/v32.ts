import { type Entry } from './locales';

/**
 * PoC Value Studio 3.2 — strings.
 *
 * Group A: where the configuration is kept (tenant persistence).
 * Merged into the one dictionary in `strings.ts`; both locales are required.
 */
export const v32Strings = {
  // ------------------------------------------------------------------ persistence
  'persist.loading': { en: 'Reading the saved configuration from the tenant…', 'pt-BR': 'Lendo a configuração salva na tenant…' },
  'persist.nothingYet': {
    en: 'Nothing saved yet. What you enter is saved automatically on the tenant.',
    'pt-BR': 'Nada salvo ainda. O que você preencher é salvo automaticamente na tenant.',
  },
  'persist.saved': { en: 'Saved on the tenant at {time}', 'pt-BR': 'Salvo na tenant às {time}' },
  'persist.savedBy': { en: 'Saved on the tenant at {time} by {who}', 'pt-BR': 'Salvo na tenant às {time} por {who}' },
  'persist.saving': { en: 'Saving…', 'pt-BR': 'Salvando…' },
  'persist.forbidden.title': { en: 'This configuration is not being kept', 'pt-BR': 'Esta configuração não está sendo guardada' },
  'persist.forbidden.body': {
    en: 'The tenant refused to read or store the app’s state, so everything you enter works in this session but is lost when you leave the app. Missing permission: {scopes}. Ask an administrator to grant it to your user (IAM policy), then try again.',
    'pt-BR':
      'A tenant recusou ler ou guardar o estado do app, então tudo o que você preenche funciona nesta sessão, mas se perde ao sair do app. Permissão que falta: {scopes}. Peça a um administrador para concedê-la ao seu usuário (política IAM) e tente de novo.',
  },
  'persist.error.title': { en: 'The configuration could not be saved or read', 'pt-BR': 'A configuração não pôde ser salva ou lida' },
  'persist.error.body': {
    en: 'The tenant answered with an error: {detail}. Nothing was overwritten. Your changes are still on screen; try again.',
    'pt-BR': 'A tenant respondeu com um erro: {detail}. Nada foi sobrescrito. Suas alterações continuam na tela; tente de novo.',
  },
  'persist.tooLarge': {
    en: 'the stored configuration would exceed the size limit (use smaller logos)',
    'pt-BR': 'a configuração armazenada passaria do limite de tamanho (use logos menores)',
  },
  'persist.conflict.title': { en: 'Someone else saved this configuration', 'pt-BR': 'Outra pessoa salvou esta configuração' },
  'persist.conflict.body': {
    en: 'A newer version was saved on the tenant{who} at {time}. Nothing was overwritten. Reload to take theirs and lose your edits, or overwrite to keep yours.',
    'pt-BR':
      'Uma versão mais nova foi salva na tenant{who} às {time}. Nada foi sobrescrito. Recarregue para ficar com a dela e perder as suas alterações, ou sobrescreva para manter as suas.',
  },
  'persist.conflict.by': { en: ' by {who}', 'pt-BR': ' por {who}' },
  'persist.btn.retry': { en: 'Try again', 'pt-BR': 'Tentar de novo' },
  'persist.btn.reload': { en: 'Reload theirs', 'pt-BR': 'Recarregar a dela' },
  'persist.btn.overwrite': { en: 'Overwrite with mine', 'pt-BR': 'Sobrescrever com a minha' },
  'persist.header.problem': { en: 'Not saved', 'pt-BR': 'Não salvo' },

  'persist.newPoc.title': { en: 'New PoC', 'pt-BR': 'Nova PoC' },
  'persist.newPoc.body': {
    en: 'Deletes the saved configuration — customer, scope, logos, pillars and your own rates — from the tenant and empties this page. Use it when this tenant starts a different PoC, so one customer’s identity never carries into the next presentation.',
    'pt-BR':
      'Apaga da tenant a configuração salva — cliente, escopo, logos, pilares e as suas taxas — e esvazia esta página. Use quando esta tenant começar uma PoC diferente, para que a identidade de um cliente nunca passe para a apresentação seguinte.',
  },
  'persist.newPoc.btn': { en: 'Start a new PoC…', 'pt-BR': 'Começar uma nova PoC…' },
  'persist.newPoc.confirm': {
    en: 'This cannot be undone. Delete the saved configuration?',
    'pt-BR': 'Isso não pode ser desfeito. Apagar a configuração salva?',
  },
  'persist.newPoc.yes': { en: 'Yes, delete it', 'pt-BR': 'Sim, apagar' },
  'persist.newPoc.no': { en: 'Cancel', 'pt-BR': 'Cancelar' },

  // ------------------------------------------------------------------ access (login, SE-only)
  'gate.title': { en: 'Restricted access', 'pt-BR': 'Acesso restrito' },
  'gate.lead': {
    en: 'This app is for Dynatrace Sales Engineers and the partners who run a PoC with them. Enter the access password that the SE in charge of the PoC sent you, or the partner master password Dynatrace gave you.',
    'pt-BR':
      'Este app é de uso dos Sales Engineers da Dynatrace e dos parceiros que conduzem a PoC com eles. Digite a senha de acesso que o SE responsável pela PoC enviou para você, ou a senha mestre de parceiro que a Dynatrace forneceu.',
  },
  'gate.signedAs': { en: 'You are signed in as {who}.', 'pt-BR': 'Você entrou como {who}.' },
  'gate.signedAsUnknown': {
    en: 'The platform did not say who is signed in.',
    'pt-BR': 'A plataforma não informou quem está conectado.',
  },
  'gate.password.label': { en: 'PoC access password', 'pt-BR': 'Senha de acesso da PoC' },
  'gate.password.show': { en: 'Show', 'pt-BR': 'Mostrar' },
  'gate.password.hide': { en: 'Hide', 'pt-BR': 'Ocultar' },
  'gate.enter': { en: 'Sign in', 'pt-BR': 'Entrar' },
  'gate.checking': { en: 'Checking…', 'pt-BR': 'Verificando…' },
  'gate.wrong': { en: 'Wrong password. {n} {n|attempt|attempts} left.', 'pt-BR': 'Senha incorreta. {n} {n|tentativa restante|tentativas restantes}.' },
  'gate.locked': {
    en: 'Too many attempts. Try again in {s} s.',
    'pt-BR': 'Tentativas demais. Tente de novo em {s} s.',
  },
  'gate.unavailable': {
    en: 'The password could not be checked right now (the tenant did not answer). Try again in a moment.',
    'pt-BR': 'Não foi possível verificar a senha agora (a tenant não respondeu). Tente de novo em instantes.',
  },
  'gate.success': { en: 'Access granted', 'pt-BR': 'Acesso liberado' },
  'gate.vault.aria': {
    en: 'Password progress: {n} of 8 segments lit',
    'pt-BR': 'Progresso da senha: {n} de 8 segmentos acesos',
  },
  'gate.restricted.btn': { en: 'See the executive view (read-only)', 'pt-BR': 'Ver a visão executiva (somente leitura)' },
  'gate.restricted.note': {
    en: 'Without the password you see only the executive view of the PoC.',
    'pt-BR': 'Sem a senha você vê apenas a visão executiva da PoC.',
  },
  'gate.footer': {
    en: 'This gate keeps the app from being shown by accident. What you can query on the tenant is still decided by your own permissions.',
    'pt-BR':
      'Esta tela evita que o app seja exibido por engano. O que você pode consultar na tenant continua sendo decidido pelas suas próprias permissões.',
  },
  'access.chip.customer': { en: 'Customer mode', 'pt-BR': 'Modo cliente' },
  'access.chip.partner': { en: 'Partner', 'pt-BR': 'Parceiro' },
  'access.signIn': { en: 'Sign in as partner', 'pt-BR': 'Entrar como parceiro' },
  'access.signOut': { en: 'Leave partner mode', 'pt-BR': 'Sair do modo parceiro' },
  'access.commercial.label': { en: 'Commercial data', 'pt-BR': 'Dados comerciais' },
  'access.commercial.help': {
    en: 'Licensing, DPS and cost. It starts hidden in every session, so it is never on screen in front of a customer by accident.',
    'pt-BR':
      'Licenciamento, DPS e custos. Começa oculto em toda sessão, para que nunca apareça na frente do cliente por engano.',
  },
  'restricted.title': { en: 'Restricted to the SE', 'pt-BR': 'Restrito ao SE' },
  'restricted.body.customer': {
    en: 'This page is not part of the executive view. Ask the Sales Engineer in charge of the PoC for access.',
    'pt-BR': 'Esta página não faz parte da visão executiva. Peça acesso ao Sales Engineer responsável pela PoC.',
  },
  'restricted.body.commercial': {
    en: 'This page carries licensing, DPS or cost material, which a customer must not see. Turn on “Commercial data” in the header to open it.',
    'pt-BR':
      'Esta página traz material de licenciamento, DPS ou custo, que o cliente não deve ver. Ative “Dados comerciais” no cabeçalho para abri-la.',
  },
  'restricted.back': { en: 'Back to the overview', 'pt-BR': 'Voltar à visão geral' },

  // ------------------------------------------------------------------ access settings (SE)
  'access.tab': { en: 'Partner access', 'pt-BR': 'Acesso de parceiros' },
  'access.heading': { en: 'Partner access to this PoC', 'pt-BR': 'Acesso de parceiros a esta PoC' },
  'access.intro': {
    en: 'A partner whose e-mail is not a Dynatrace corporate address enters the app with the PoC password. Dynatrace e-mails need no password.',
    'pt-BR': 'Um parceiro cujo e-mail não é corporativo da Dynatrace entra no app com a senha da PoC. E-mails corporativos da Dynatrace não precisam de senha.',
  },
  // 3.3.1 (S2): the built-in password is gone. A PoC with none lets no partner in at all, and the
  // notice says what to do rather than warning about a shared secret that no longer exists.
  'access.pw.builtin': {
    en: 'This PoC has no password yet, so a partner cannot open the app. Set one below and share it with them.',
    'pt-BR': 'Esta PoC ainda não tem senha, então um parceiro não consegue abrir o app. Defina uma abaixo e compartilhe com ele.',
  },
  'access.pw.custom': {
    en: 'This PoC has its own password, set by {who} on {when}.',
    'pt-BR': 'Esta PoC tem senha própria, definida por {who} em {when}.',
  },
  'access.pw.label': { en: 'New PoC password', 'pt-BR': 'Nova senha da PoC' },
  'access.pw.suggest': { en: 'Suggest one', 'pt-BR': 'Sugerir uma' },
  'access.pw.suggested': { en: 'Suggested: {pw}', 'pt-BR': 'Sugerida: {pw}' },
  'access.pw.copy': { en: 'Copy', 'pt-BR': 'Copiar' },
  'access.pw.copied': { en: 'Copied', 'pt-BR': 'Copiada' },
  'access.pw.set': { en: 'Set password', 'pt-BR': 'Definir senha' },
  'access.pw.warn': {
    en: 'Setting a new password signs out every partner who is in. Give the new one only to the partner of this PoC.',
    'pt-BR': 'Definir uma nova senha desconecta todos os parceiros que estão dentro. Passe a nova apenas ao parceiro desta PoC.',
  },
  'access.pw.tooShort': { en: 'Use at least 8 characters.', 'pt-BR': 'Use pelo menos 8 caracteres.' },
  'access.pw.done': { en: 'Password set. Partners who were in have been signed out.', 'pt-BR': 'Senha definida. Os parceiros que estavam dentro foram desconectados.' },
  'access.pw.unavailable': {
    en: 'The password could not be saved on the tenant (permission or connection). Nothing changed.',
    'pt-BR': 'Não foi possível salvar a senha na tenant (permissão ou conexão). Nada mudou.',
  },
  'access.expiry.label': { en: 'A partner stays in for', 'pt-BR': 'O parceiro fica dentro por' },
  'access.expiry.hours': { en: '{n} hours', 'pt-BR': '{n} horas' },
  'access.expiry.days': { en: '{n} days', 'pt-BR': '{n} dias' },
  'access.roster.title': { en: 'Partners with access', 'pt-BR': 'Parceiros com acesso' },
  'access.roster.empty': { en: 'No partner is in right now.', 'pt-BR': 'Nenhum parceiro está dentro agora.' },
  'access.roster.entry': { en: 'In since {since} · expires {until}', 'pt-BR': 'Dentro desde {since} · expira {until}' },
  'access.roster.revoke': { en: 'Revoke', 'pt-BR': 'Revogar' },
  'access.roster.revokeAll': { en: 'Revoke all', 'pt-BR': 'Revogar todos' },
  'access.roster.unavailable': {
    en: 'The roster could not be read from the tenant, so partners are not listed. A password set here still needs the tenant to be saved.',
    'pt-BR': 'Não foi possível ler a lista da tenant, então os parceiros não aparecem. Uma senha definida aqui ainda depende de salvar na tenant.',
  },
  'access.limits': {
    en: 'This gate keeps the app from being shown by accident; it does not decide what anyone may query on the tenant. The password is stored only as a salted hash.',
    'pt-BR': 'Esta tela evita que o app seja exibido por engano; ela não decide o que alguém pode consultar na tenant. A senha é guardada apenas como hash com sal.',
  },
} as const satisfies Record<string, Entry>;
