import { type Entry } from './locales';

/**
 * PoC Value Studio 3.1 — strings, group E.
 *
 * One file per workstream so parallel work never edits the same file. Merged into the
 * single dictionary in `strings.ts`; both locales are required.
 *
 * DQL Efficiency Advisor. `features/advisor/analyzeQuery.ts` is a pure function that
 * returns these keys (and pre-formatted params) instead of English sentences;
 * `AdvisorPanel` resolves them with `t()` at render time.
 *
 *   f.advisor.chk.*   which practice was checked
 *   f.advisor.find.*  what was found in the query text or its recorded validation
 *   f.advisor.rec.*   the suggested change (never applied automatically)
 */
export const v31EStrings = {
  // ------------------------------------------------------------ practice checked
  'f.advisor.chk.timeframe': { en: 'Timeframe', 'pt-BR': 'Período' },
  'f.advisor.chk.bucket': { en: 'Bucket scoping', 'pt-BR': 'Escopo de bucket' },
  'f.advisor.chk.ceiling': { en: 'Scan ceiling', 'pt-BR': 'Limite de scan' },
  'f.advisor.chk.earlyFilter': { en: 'Early filtering', 'pt-BR': 'Filtragem antecipada' },
  'f.advisor.chk.filterEff': { en: 'Filter efficiency', 'pt-BR': 'Eficiência do filtro' },
  'f.advisor.chk.projection': { en: 'Field projection', 'pt-BR': 'Projeção de campos' },
  'f.advisor.chk.sort': { en: 'Sort placement', 'pt-BR': 'Posição da ordenação' },
  'f.advisor.chk.truncation': { en: 'Result truncation', 'pt-BR': 'Truncamento do resultado' },
  'f.advisor.chk.joins': { en: 'Joins and lookups', 'pt-BR': 'Joins e lookups' },
  'f.advisor.chk.cost': { en: 'Recorded cost', 'pt-BR': 'Custo registrado' },
  'f.advisor.chk.reuse': { en: 'Result reuse', 'pt-BR': 'Reuso de resultados' },
  'f.advisor.find.timeframeGlobal': {
    en: 'Follows the app timeframe selector, which offers no window wider than 7 days.',
    'pt-BR': 'Segue o seletor de período do app, que não oferece nenhuma janela maior que 7 dias.',
  },
  'f.advisor.find.timeframePinned': {
    en: 'Pinned to {window} ({label}).',
    'pt-BR': 'Fixado em {window} ({label}).',
  },
  'f.advisor.find.bucketNone': {
    en: 'No bucket is named, so the query may scan every bucket backing the table.',
    'pt-BR': 'Nenhum bucket é informado, então a consulta pode fazer scan de todos os buckets que sustentam a tabela.',
  },
  'f.advisor.find.bucketScoped': {
    en: 'Scopes at least one bucket explicitly.',
    'pt-BR': 'Delimita explicitamente pelo menos um bucket.',
  },
  'f.advisor.find.ceilingNone': {
    en: 'No scan ceiling is set, so an unexpected data-volume increase would raise cost silently.',
    'pt-BR':
      'Nenhum limite de scan está definido, então um aumento inesperado no volume de dados elevaria o custo silenciosamente.',
  },
  'f.advisor.find.ceilingSet': {
    en: 'Capped at {limit} GB.',
    'pt-BR': 'Limitado a {limit} GB.',
  },
  'f.advisor.find.earlyNone': {
    en: 'Neither a filter nor an aggregation is applied, so every record is returned to the browser.',
    'pt-BR': 'Nenhum filtro nem agregação é aplicado, então todos os registros são retornados ao navegador.',
  },
  'f.advisor.find.earlyAfter': {
    en: 'Filtering happens after aggregation, so records are aggregated and then discarded.',
    'pt-BR': 'O filtro acontece depois da agregação, então os registros são agregados e só depois descartados.',
  },
  'f.advisor.find.earlyOk': {
    en: 'Filters and aggregations are ordered correctly.',
    'pt-BR': 'Filtros e agregações estão na ordem correta.',
  },
  'f.advisor.find.filterFn': {
    en: 'A filter wraps a field in a string transformation, which prevents efficient matching.',
    'pt-BR':
      'Um filtro envolve um campo em uma transformação de string, o que impede uma correspondência eficiente.',
  },
  'f.advisor.find.projectNone': {
    en: 'Neither a projection nor an aggregation narrows the record shape.',
    'pt-BR': 'Nem uma projeção nem uma agregação reduz o formato do registro.',
  },
  'f.advisor.find.projectAgg': {
    en: 'Aggregates in Grail, which bounds the result shape.',
    'pt-BR': 'Agrega no Grail, o que limita o formato do resultado.',
  },
  'f.advisor.find.projectList': {
    en: 'Projects an explicit field list.',
    'pt-BR': 'Projeta uma lista explícita de campos.',
  },
  'f.advisor.find.sortBefore': {
    en: 'Sorting happens before aggregation, so work is spent ordering records that are then collapsed.',
    'pt-BR':
      'A ordenação acontece antes da agregação, então o esforço é gasto ordenando registros que depois são consolidados.',
  },
  'f.advisor.find.limitBefore': {
    en: 'A limit is applied before aggregation, which changes the aggregate rather than just trimming output.',
    'pt-BR':
      'Um limit é aplicado antes da agregação, o que altera o valor agregado em vez de apenas reduzir a saída.',
  },
  'f.advisor.find.joinsUsed': {
    en: 'The query joins or looks up a second dataset.',
    'pt-BR': 'A consulta faz join ou lookup com um segundo conjunto de dados.',
  },
  'f.advisor.find.joinsNone': {
    en: 'No join or lookup is used.',
    'pt-BR': 'Nenhum join ou lookup é usado.',
  },
  'f.advisor.find.costHigh': {
    en: 'The platform recorded {gb} GB scanned on demand during validation.',
    'pt-BR': 'A plataforma registrou {gb} GB escaneados on-demand durante a validação.',
  },
  'f.advisor.find.costZero': {
    en: 'The platform recorded zero on-demand bytes scanned.',
    'pt-BR': 'A plataforma registrou zero bytes escaneados on-demand.',
  },
  'f.advisor.find.reuse': {
    en: 'Results are cached for 5 minutes and shared by every view that requests the same query and window.',
    'pt-BR':
      'Os resultados ficam em cache por 5 minutos e são compartilhados por toda visão que solicita a mesma consulta e o mesmo período.',
  },

  // ------------------------------------------------------------ recommendations
  'f.advisor.rec.noChange': {
    en: 'No change needed.',
    'pt-BR': 'Nenhuma mudança necessária.',
  },
  'f.advisor.rec.timeframeGlobal': {
    en: 'No change needed. The user controls the window and cannot request an unbounded one.',
    'pt-BR': 'Nenhuma mudança necessária. O usuário controla o período e não consegue pedir uma janela sem limite.',
  },
  'f.advisor.rec.timeframePinned': {
    en: 'No change needed. A pinned window is correct where the figure is only meaningful over that range.',
    'pt-BR':
      'Nenhuma mudança necessária. Uma janela fixa é a correta quando o número só faz sentido naquele intervalo.',
  },
  'f.advisor.rec.bucketLogs': {
    en: 'Name the buckets explicitly. On log and span tables this is usually the single largest cost reduction available.',
    'pt-BR':
      'Informe os buckets explicitamente. Em tabelas de logs e spans, esta costuma ser a maior redução de custo disponível.',
  },
  'f.advisor.rec.bucketOther': {
    en: 'Consider naming buckets if this table is backed by several, but confirm the bucket names first rather than guessing them.',
    'pt-BR':
      'Considere informar os buckets se esta tabela for sustentada por vários, mas confirme os nomes dos buckets antes, em vez de adivinhá-los.',
  },
  'f.advisor.rec.ceilingNone': {
    en: 'Set scanLimitGbytes on this entry. Reaching the ceiling is handled as a partial-result state in the UI, not as an absence of data.',
    'pt-BR':
      'Defina scanLimitGbytes nesta entrada. Atingir o limite é tratado na interface como um estado de resultado parcial, não como ausência de dados.',
  },
  'f.advisor.rec.earlyNone': {
    en: 'Filter or aggregate in Grail so the browser receives a result rather than a dataset.',
    'pt-BR': 'Filtre ou agregue no Grail para que o navegador receba um resultado, e não um conjunto de dados.',
  },
  'f.advisor.rec.earlyAfter': {
    en: 'Move the filter ahead of the aggregation.',
    'pt-BR': 'Mova o filtro para antes da agregação.',
  },
  'f.advisor.rec.filterFn': {
    en: 'Compare the field directly, using the ~ operator for partial matches.',
    'pt-BR': 'Compare o campo diretamente, usando o operador ~ para correspondências parciais.',
  },
  'f.advisor.rec.projectNone': {
    en: 'Select only the fields the view renders, so unused columns are never transferred.',
    'pt-BR': 'Selecione apenas os campos que a visão exibe, para que colunas não usadas nunca sejam transferidas.',
  },
  'f.advisor.rec.sortBefore': {
    en: 'Move the sort to the end of the pipeline.',
    'pt-BR': 'Mova a ordenação para o fim do pipeline.',
  },
  'f.advisor.rec.limitBefore': {
    en: 'Move the limit after the aggregation, or state clearly in the UI that the figure is computed from a truncated subset.',
    'pt-BR':
      'Mova o limit para depois da agregação, ou informe claramente na interface que o número é calculado a partir de um subconjunto truncado.',
  },
  'f.advisor.rec.joins': {
    en: 'Confirm this is enrichment rather than filtering. If it only narrows rows, filter on an existing enriched field instead.',
    'pt-BR':
      'Confirme que isto é enriquecimento e não filtragem. Se apenas reduz linhas, filtre por um campo já enriquecido.',
  },
  'f.advisor.rec.costHigh': {
    en: 'This is a dominant cost in the app. Keep it cached, keep the window narrow, and avoid refreshing it on every navigation.',
    'pt-BR':
      'Este é um custo dominante no app. Mantenha-o em cache, mantenha a janela estreita e evite atualizá-lo a cada navegação.',
  },
  'f.advisor.rec.costZero': {
    en: 'No change needed. Queries like this can be refreshed freely.',
    'pt-BR': 'Nenhuma mudança necessária. Consultas como esta podem ser atualizadas à vontade.',
  },
  'f.advisor.rec.reuse': {
    en: 'No change needed. Reuse is keyed on query text plus timeframe, so two views cannot silently share results from different windows.',
    'pt-BR':
      'Nenhuma mudança necessária. O reuso é indexado pelo texto da consulta mais o período, então duas visões não podem compartilhar resultados de janelas diferentes sem que isso apareça.',
  },
} as const satisfies Record<string, Entry>;
