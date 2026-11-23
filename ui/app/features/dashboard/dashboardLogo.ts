import { createContext, useContext } from 'react';

import { isSafeImageDataUrl } from '../../utils/logo';

/**
 * 3.6.6 — the customer's logo in the dashboards the PoC creates (the owner: "ao fazer o upload … se automaticamente esta
 * logo … pode ser incluída no cabeçalho superior esquerdo dos dashboards criados").
 *
 * The logo the SE uploaded on Settings → Customer is a raster data URL (PNG, JPEG or WebP, at most 256 kB). Before it
 * goes into a dashboard it is drawn again at most 320 × 120 pixels, as PNG, so the dashboard document stays light; a
 * markdown tile then shows it in the top-left corner (`buildDashboard`). A lab dashboard on the validation tenant
 * already shows an image written this way (`data:image/…;base64` in a markdown tile).
 */

export const DASHBOARD_LOGO_MAX_WIDTH = 320;
export const DASHBOARD_LOGO_MAX_HEIGHT = 120;
/** Without a canvas (tests, a browser that refuses it) the original is used only up to this length. */
export const DASHBOARD_LOGO_FALLBACK_CHARS = 160_000;

/** The size a logo is drawn at: within 320 × 120, never enlarged. Pure. */
export function fitLogo(width: number, height: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, DASHBOARD_LOGO_MAX_WIDTH / width, DASHBOARD_LOGO_MAX_HEIGHT / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('logo did not load'));
    image.src = src;
  });

/** The logo as a dashboard will carry it: reduced, as PNG; `null` when there is no safe logo. */
export async function shrinkLogo(src: string | null): Promise<string | null> {
  if (src === null || !isSafeImageDataUrl(src)) return null;
  const fallback = src.length <= DASHBOARD_LOGO_FALLBACK_CHARS ? src : null;
  try {
    const image = await loadImage(src);
    const size = fitLogo(image.naturalWidth, image.naturalHeight);
    if (size.width === 0) return fallback;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (context === null) return fallback;
    context.drawImage(image, 0, 0, size.width, size.height);
    const out = canvas.toDataURL('image/png');
    return isSafeImageDataUrl(out) ? out : fallback;
  } catch {
    return fallback;
  }
}

/** The logo the dashboards of this page carry (`undefined`: none, or the SE turned it off). */
export const DashboardLogoContext = createContext<{ src: string; alt: string } | undefined>(undefined);

export const useDashboardLogo = (): { src: string; alt: string } | undefined => useContext(DashboardLogoContext);
