/**
 * The colour families of the Spectrum skin (`engine/spectrum.css`).
 *
 * A family is a pair of stops from one of Strato's sequential chart palettes, picked per theme
 * so the ink stays readable on both. Components set it as `data-spectrum`; the stylesheet turns
 * it into `--pvs-sp-from/to` (marks) and `--pvs-ink-from/to` (numerals).
 *
 * A family is identity, never a verdict: no family means "good" or "bad". Conditions keep their
 * own tones (warning, critical) and their shapes and words. The one exception is `red` (3.2.6),
 * kept for risk totals — the open vulnerabilities — where the owner asked the number to read as
 * the alarm it is.
 */
export const SPECTRUM_FAMILIES = [
  'blue',
  'blue-turquoise',
  'turquoise',
  'moss',
  'orange',
  'pink-purple',
  'purple',
  'grey',
  'red',
] as const;

export type SpectrumFamily = (typeof SPECTRUM_FAMILIES)[number];

/** A stable, selector-safe id for SVG gradients (`useId` returns `:r1:`, which `url(#…)` rejects). */
export function svgId(reactId: string, suffix: string): string {
  return `pvs${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-${suffix}`;
}
