/**
 * Whether this checkout of the app carries the brand pack (3.3.5): the corporate PowerPoint template
 * (`ui/assets/techwrapup-brand-template.pptx`), the DT Flow font (`fonts.ts`) and the logos
 * (`brand.ts`, `productLogos.ts`). Written by `npm run brand:install` — never by hand.
 *
 * Without it the Tech Wrapup and the Real proof deck are built on the neutral template the app
 * writes itself (`neutralTemplate.ts`): every slide, the same layout, the deck's own colours.
 */
export const BRAND_PACK_INSTALLED: boolean = false;
