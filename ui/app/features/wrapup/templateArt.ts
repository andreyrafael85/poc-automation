import JSZip from 'jszip';
import { useEffect, useState } from 'react';

import { NEUTRAL_MARK } from './neutralTemplate';
import { loadBrandTemplate } from './pptxTemplate';

/**
 * The corporate template's own pictures, read from the template file itself (3.2.4), so the deck
 * preview shows the cover, the end slide and the Dynatrace signet exactly as the PowerPoint does,
 * without shipping a second copy of them in the bundle.
 */
export interface TemplateArt {
  coverBackground?: string;
  coverLogo?: string;
  endBackground?: string;
  endLogo?: string;
  /** The small Dynatrace signet beside the slide number of the dark layouts. */
  signet?: string;
  /** The tagline the end slide's layout carries. */
  endText?: string;
  /** The neutral template the app writes without the brand pack (3.3.5, `neutralTemplate.ts`). */
  neutral?: boolean;
}

const MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', svg: 'image/svg+xml', gif: 'image/gif' };

/** The data URL of every named picture of a layout (or master), by the picture's name. */
async function pictures(zip: JSZip, part: string): Promise<Record<string, string>> {
  const xml = await zip.file(part)?.async('string');
  const relsPath = part.replace(/([^/]+)$/, '_rels/$1.rels');
  const rels = await zip.file(relsPath)?.async('string');
  if (xml === undefined || rels === undefined) return {};
  const targets = new Map<string, string>();
  for (const match of rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) targets.set(match[1] as string, match[2] as string);
  const out: Record<string, string> = {};
  for (const pic of xml.match(/<p:pic>[\s\S]*?<\/p:pic>/g) ?? []) {
    const name = /<p:cNvPr id="\d+" name="([^"]+)"/.exec(pic)?.[1];
    const embed = /r:embed="([^"]+)"/.exec(pic)?.[1];
    const target = embed === undefined ? undefined : targets.get(embed);
    if (name === undefined || target === undefined) continue;
    const mediaPath = `ppt/${target.replace(/^\.\.\//, '')}`;
    const ext = mediaPath.split('.').pop()?.toLowerCase() ?? '';
    const base64 = await zip.file(mediaPath)?.async('base64');
    if (base64 !== undefined && MIME[ext] !== undefined) out[name] = `data:${MIME[ext]};base64,${base64}`;
  }
  return out;
}

export async function readTemplateArt(templateBytes: ArrayBuffer | Uint8Array): Promise<TemplateArt> {
  const zip = await JSZip.loadAsync(templateBytes);
  const app = (await zip.file('docProps/app.xml')?.async('string')) ?? '';
  if (app.includes(`<Application>${NEUTRAL_MARK}</Application>`)) return { neutral: true };
  const cover = await pictures(zip, 'ppt/slideLayouts/slideLayout1.xml');
  const end = await pictures(zip, 'ppt/slideLayouts/slideLayout56.xml');
  const dark = await pictures(zip, 'ppt/slideLayouts/slideLayout28.xml');
  const endXml = (await zip.file('ppt/slideLayouts/slideLayout56.xml')?.async('string')) ?? '';
  // The layout's own tagline: the text of its shapes that are not placeholders (the footer's
  // "CONFIDENTIAL" and the slide number are placeholders the slide fills or leaves empty).
  const endText = (endXml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? [])
    .filter((shape) => !shape.includes('<p:ph'))
    .flatMap((shape) => [...shape.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map((match) => match[1]))
    .join(' ')
    .trim();
  return {
    coverBackground: cover['Picture 4'],
    coverLogo: cover['Graphic 5'],
    endBackground: end['Picture 1'],
    endLogo: end['Graphic 37'],
    signet: dark['Graphic 11'],
    endText: endText === '' ? undefined : endText,
  };
}

/** The template's pictures for the preview, read once; empty (CSS fallbacks) until they arrive or if they cannot. */
export function useTemplateArt(): TemplateArt {
  const [art, setArt] = useState<TemplateArt>({});
  useEffect(() => {
    let alive = true;
    loadBrandTemplate()
      .then((bytes) => readTemplateArt(bytes))
      .then((value) => {
        if (alive) setArt(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return art;
}
