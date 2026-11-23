// brand asset not included in this repository (npm run brand:strip).
//
// No product logomarks: deck sections carry none.
// To restore it: npm run brand:install -- --brand <your brand kit>

export const PRODUCT_LOGOS: Record<'davis' | 'grail' | 'smartscape' | 'oneagent' | 'appengine' | 'automation' | 'purepath' | 'dql' | 'openpipeline' | 'loganalytics' | 'appsec' | 'infra' | 'dex' | 'platform', string> = {
  davis: '',
  grail: '',
  smartscape: '',
  oneagent: '',
  appengine: '',
  automation: '',
  purepath: '',
  dql: '',
  openpipeline: '',
  loganalytics: '',
  appsec: '',
  infra: '',
  dex: '',
  platform: '',
};

export type ProductLogoKey = keyof typeof PRODUCT_LOGOS;
