import { type Entry } from './locales';

/**
 * PoC Value Studio 3.4.6 — the Assessment's action plan (proposal §C8 F-06: an owner, a due day and a state
 * per recommended action, kept for the PoC team and exported as CSV) and the Dynatrace documentation beside
 * each recommendation (F-09). Merged in `strings.ts`.
 */

export const v346Strings = {
  'asm.plan.column': { en: 'Agreed plan', 'pt-BR': 'Plano combinado' },
  'asm.plan.owner': { en: 'Owner', 'pt-BR': 'Responsável' },
  'asm.plan.ownerPlaceholder': { en: 'Team or role', 'pt-BR': 'Time ou função' },
  'asm.plan.ownerNone': { en: 'To be agreed', 'pt-BR': 'A combinar' },
  'asm.plan.due': { en: 'Due', 'pt-BR': 'Prazo' },
  'asm.plan.dueNone': { en: 'To be agreed', 'pt-BR': 'A combinar' },
  'asm.plan.status': { en: 'State', 'pt-BR': 'Situação' },
  'asm.plan.status.open': { en: 'To start', 'pt-BR': 'A iniciar' },
  'asm.plan.status.inProgress': { en: 'In progress', 'pt-BR': 'Em andamento' },
  'asm.plan.status.done': { en: 'Done', 'pt-BR': 'Concluída' },
  'asm.plan.overdue': { en: 'due date to review', 'pt-BR': 'prazo a rever' },
  'asm.plan.overdueCount': { en: 'Due dates to review: {count}.', 'pt-BR': 'Prazos a rever: {count}.' },
  'asm.plan.progress': {
    en: 'Plan for the {total} actions: done {done}, in progress {inProgress}, to start {open}; with an owner named: {owned}.',
    'pt-BR': 'Plano das {total} ações: concluídas {done}, em andamento {inProgress}, a iniciar {open}; com responsável definido: {owned}.',
  },
  'asm.plan.save': { en: 'Save the plan', 'pt-BR': 'Salvar o plano' },
  'asm.plan.discard': { en: 'Undo changes', 'pt-BR': 'Desfazer alterações' },
  'asm.plan.unsaved': { en: 'Changes not saved yet.', 'pt-BR': 'Alterações ainda não salvas.' },
  'asm.plan.saving': { en: 'Saving the plan…', 'pt-BR': 'Salvando o plano…' },
  'asm.plan.saved': { en: 'Plan saved for the PoC team.', 'pt-BR': 'Plano salvo para o time da PoC.' },
  'asm.plan.offline': {
    en: 'The plan is kept on the tenant; outside it, it can be read here but not saved.',
    'pt-BR': 'O plano fica guardado no tenant; fora dele, pode ser lido aqui, mas não salvo.',
  },
  'asm.plan.forbidden': {
    en: 'This user cannot save the PoC’s shared state; the PoC owner can grant it.',
    'pt-BR': 'Este usuário ainda não pode salvar o estado compartilhado da PoC; o dono da PoC pode liberar.',
  },
  'asm.plan.tooLarge': { en: 'The plan is too large to save; shorten the owners.', 'pt-BR': 'O plano ficou grande demais para salvar; encurte os responsáveis.' },
  'asm.plan.failed': { en: 'The plan could not be saved now; try again in a moment.', 'pt-BR': 'Não foi possível salvar o plano agora; tente de novo em instantes.' },
  'asm.plan.csv': { en: 'Download the plan (CSV)', 'pt-BR': 'Baixar o plano (CSV)' },
  'asm.plan.csvHint': {
    en: 'The actions with their owner, due date, state and documentation, for the customer’s own tracker. No commercial data.',
    'pt-BR': 'As ações com responsável, prazo, situação e documentação, para o acompanhamento do próprio cliente. Sem dado comercial.',
  },
  'asm.plan.csv.rule': { en: 'Rule', 'pt-BR': 'Regra' },
  'asm.plan.docs': { en: 'Documentation', 'pt-BR': 'Documentação' },
  'asm.plan.docsShort': { en: 'Docs', 'pt-BR': 'Docs' },
  'asm.plan.docsFor': { en: 'Dynatrace documentation: {capability}', 'pt-BR': 'Documentação Dynatrace: {capability}' },
  'asm.plan.docsLong': { en: 'How to set up {capability} (Dynatrace documentation)', 'pt-BR': 'Como configurar {capability} (documentação Dynatrace)' },
  'asm.plan.noneYet': {
    en: 'The SE or the partner fills in the plan with the customer: owner, due date and state of each action.',
    'pt-BR': 'O SE ou o parceiro preenche o plano com o cliente: responsável, prazo e situação de cada ação.',
  },

  // ---------------------------------------------------------------- What's new
  'help.whatsNew.i79': {
    en: '3.4.6 — The Coverage page’s action plan: for each recommended action, the owner, the due date and the state agreed with the customer, kept for the PoC team, printed with the report and downloadable as CSV; and a link to the Dynatrace documentation beside each recommendation.',
    'pt-BR': '3.4.6 — O plano de ação da Cobertura: para cada ação recomendada, o responsável, o prazo e a situação combinados com o cliente, guardados para o time da PoC, impressos com o relatório e baixáveis em CSV; e um link para a documentação Dynatrace ao lado de cada recomendação.',
  },
} satisfies Record<string, Entry>;
