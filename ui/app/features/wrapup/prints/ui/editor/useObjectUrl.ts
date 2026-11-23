import { useEffect, useState } from 'react';

/**
 * An object URL for a Blob while `active`, revoked when the Blob changes, when it turns inactive
 * and on unmount — the editor's master and the crop dialog's picture never outlive their dialog.
 */
export function useObjectUrl(blob: Blob, active: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [blob, active]);
  return url;
}
