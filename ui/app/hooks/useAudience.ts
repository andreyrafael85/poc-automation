import { useAccess } from '../config/AccessContext';
import type { NavigationAudience } from '../config/navigation';
import { useStudio } from '../config/StudioContext';

/** Who is looking, as the navigation needs it: executive mode, commercial data, restricted view. */
export function useAudience(): NavigationAudience {
  const { executiveMode } = useStudio();
  const { commercialVisible, restrictedView, level } = useAccess();
  return { executiveMode, commercialVisible, restricted: level === 'customer' && restrictedView };
}
