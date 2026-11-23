import { type Entry } from './locales';

/**
 * PoC Automation 3.0 — release 3.6.3, the v6 finishing touches (the owner's choice on 2026-11-22, "Acabamento v6"): Logs
 * without the tiles that repeated its band and with each bucket's volume and retention as bars; flat panels everywhere
 * (no spectrum edge, no wash, no painted title); the app's own areas in one hue. Merged in `strings.ts`.
 */

export const v363Strings = {
  'logs.ret.title': { en: 'Volume and retention per bucket', 'pt-BR': 'Volume e retenção por bucket' },
  'logs.ret.caption': {
    en: '{total} held across {buckets} log buckets, uncompressed — each bar is the bucket’s share of it, beside how long it keeps its records.',
    'pt-BR': '{total} guardados em {buckets} buckets de log, sem compressão — cada barra é a parte do bucket nesse total, ao lado de por quanto tempo ele guarda os registros.',
  },
  'logs.ret.days': { en: '{days} d', 'pt-BR': '{days} d' },
  'logs.ret.notReadable': { en: 'Not readable here', 'pt-BR': 'Sem leitura por aqui' },
  'logs.ret.more': {
    en: 'And {count} more buckets in the table below.',
    'pt-BR': 'E mais {count} buckets na tabela abaixo.',
  },
  'help.whatsNew.i105': {
    en: '3.6.3 — The v6 finishing touches. Logs no longer repeats its headline figures in a second row, and shows each log bucket’s volume as a bar beside how long it keeps its records. Every panel is flat — no coloured edge along the top, no wash, no painted title — and the app’s own area charts (the Executive story, the PoC timeline, Value) are drawn in one hue, as the platform’s.',
    'pt-BR': '3.6.3 — O acabamento da v6. Logs deixa de repetir os números do topo numa segunda fileira e mostra o volume de cada bucket de log numa barra, ao lado de por quanto tempo ele guarda os registros. Todos os painéis ficaram planos — sem borda colorida no topo, sem lavagem de cor, sem título pintado — e as áreas desenhadas pelo app (a história do Executivo, a linha do tempo da PoC, Valor) saem num só tom, como as da plataforma.',
  },
} satisfies Record<string, Entry>;
