import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * `@dynatrace-sdk/app-environment` outside the platform (3.3.0, backlog TD-06).
 *
 * Every one of its getters writes "Missing <fn> function from web runtime." to stderr before
 * returning a placeholder, and the suite called them hundreds of times: a wall of noise in which
 * a real warning from a component had nowhere to stand out. This returns **exactly the same
 * placeholders the real SDK returns** (checked against the installed package), so no behaviour
 * changes — only the logging stops. A test that needs other values keeps its own `vi.mock`, which
 * wins over this one.
 */
vi.mock('@dynatrace-sdk/app-environment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dynatrace-sdk/app-environment')>()),
  getAppId: () => 'dt.missing.app.id',
  getAppName: () => 'dt.missing.app.name',
  getAppVersion: () => 'dt.missing.app.version',
  getEnvironmentId: () => 'dt.missing.environment.id',
  getEnvironmentUrl: () => 'https://dynatrace.com/',
  getCurrentUserDetails: () => ({ id: 'dt.missing.user.id', name: 'dt.missing.user.name', email: 'dt.missing.user.email' }),
}));

/**
 * `@dynatrace-sdk/user-preferences`, same reason: Strato's `AppRoot` asks it for the theme, the
 * language and the timezone on every mount, and each call logged a "Missing … from web runtime."
 * line. The values are the ones the real package returns outside the platform.
 */
vi.mock('@dynatrace-sdk/user-preferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dynatrace-sdk/user-preferences')>()),
  getLanguage: () => 'en',
  getRegionalFormat: () => 'en',
  getTheme: () => 'auto',
  getTimezone: () => 'UTC',
}));

/**
 * Browser APIs jsdom does not implement, stubbed so Strato components can render
 * in tests.
 *
 * These are not behavioural fakes — they are the minimum needed for a component
 * to mount. Anything that actually depends on observed geometry is not asserted
 * in these tests.
 */

if (typeof window !== 'undefined') {
  // `AppRoot` resolves the light/dark theme through matchMedia. Reports "light"
  // so tests run against a deterministic theme.
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  // Strato overlays (Select, Tooltip, InformationOverlay) measure their trigger
  // to position the popover.
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverStub,
    });
    Object.defineProperty(globalThis, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverStub,
    });
  }

  if (!('IntersectionObserver' in window)) {
    class IntersectionObserverStub {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: readonly number[] = [];
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
      takeRecords() {
        return [];
      }
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: IntersectionObserverStub,
    });
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      writable: true,
      value: IntersectionObserverStub,
    });
  }
}

// 3.4.18: Strato's XY charts, Sparkline and Honeycomb draw on a canvas; jsdom has no 2D context and logs "Not
// implemented" for every chart. The charts already cope with a missing context (jsdom returns nothing), so the stub
// only answers `null` quietly — tests read the wrappers' text and attributes, never the drawing.
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null });
}
