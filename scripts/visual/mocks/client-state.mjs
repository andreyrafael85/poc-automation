/**
 * Mock of `@dynatrace-sdk/client-state` (the platform's App State).
 *
 * The tenant's state is simulated in `sessionStorage`, so a reload inside one capture session
 * keeps what was saved, exactly as the tenant would. What it starts with is `?state=`:
 *
 *   empty      nothing saved yet (default)
 *   seeded     a saved PoC and a saved SE profile
 *   priced     the same, with the rate card on (USD, public list prices) — 3.4.13, Licensing's priced panels
 *   built      the seeded PoC with the PoC Builder's OpenPipeline pipeline already created — 3.7.6, the route section
 *   forbidden  every call is refused for a missing scope
 *   fail       every call fails with a platform error
 *
 * Errors carry the flags the real guards (`isNotFound`, `isForbidden`) read.
 */

export * from '@pvs-real/client-state';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAAwCAYAAACWqXFuAAACCklEQVR42u3dw5adYRCF4f8y6tpi27Zt27ZtJx3btvsSKvs7VaNeK7OsPoO8g/cOnvHelbW4VtVqqVqVGiprrdo0eK22193aZe1VhxtRR9VJdb4ZdVFdS7fcuqnuWY/bbj2zXqr3naiP6qv63Y36qwGle24D1aBs8H23IdlQNexBNFyNUCMfRqPU6NIjtzFqbDbusdv4bIKa+CSapCarKU+jqWpa6ZnbdDUjm/ncbVY2W815Ec1V89T8l9ECtbD0ym2RWpwtee22NFumlr+JVqiVatXbaLVaU3rntlaty9a/d9uQbVSbPkSb1Ra19WO0TW0vfXLboXZmuz677c72qL1fon1qvzrwNTqoDpW+uR1WR7Kj392OZcfViR/RSXVKnf4ZnVFnS7/czqnz2YXfbhdrVXZJXW6MrqirjVXVBKALoAugAxCA/xigC6ALn/8NoAMQgM0E0JsCdAACsJkBOgABCEAAAtABCMA6AXQAAhCAAAQgAAEIQAACEIAABCAAAQhAAAIQgAAEIAABCEAAAhCAAAQgAAEIQAACEIAABCAAAQhAAAIQgAAEIAABCEAAAhCAAAQgAAEIQAACEIAABCAAAQhAAAIQgAAEIAABCEAAAhCAAAQgAAEIQAACEIAABCAA/2OAjJQDkJV8AAIQgACsG0CuugBY16suzgoBWPezQu5aAdjsd61/ANwNHT4D24YHAAAAAElFTkSuQmCC';

const mode = () => globalThis.__PVS__?.state ?? 'empty';
const store = () => globalThis.sessionStorage;
const id = (scope, key) => `pvs.tenant.${scope}.${key}`;

function flagged(name, message, extra) {
  const error = new Error(message);
  error.name = name;
  return Object.assign(error, extra);
}
// The SDK's own guards (`isNotFound`, `isForbidden`) accept an error only when all three of these
// flags are set as well, so the mock carries them; an error missing one is "some other failure".
const API_ERROR = { isApiClientError: true, isClientRequestError: true, isErrorResponseError: true };
const notFound = () => flagged('NotFound', 'Not found', { ...API_ERROR, isNotFound: true, response: { status: 404 } });
const forbidden = (scope) =>
  flagged('Forbidden', 'Forbidden', {
    ...API_ERROR,
    isForbidden: true,
    body: { error: { details: { missingScopes: [scope] } } },
  });
const platform = () => flagged('InternalServerError', 'The platform returned an internal error (synthetic).', { isInternalServerError: true });

/** A UTC day relative to today, `YYYY-MM-DD`. */
function dayFromToday(offset) {
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const SEEDED_SHARED = {
  v: 1,
  rev: 4,
  savedAt: '2026-09-14T15:42:00.000Z',
  savedBy: 'se@example.com',
  parameters: {
    customerName: 'Acme Corp',
    engagementName: 'Observability PoC · Q3',
    scopeDescription: 'Checkout, payments and the Kubernetes platform that runs them.',
    pocDescription: '',
    customerLogoDataUrl: PNG,
    brandTone: 'default',
    partnerName: '',
    partnerLogoDataUrl: null,
  },
  pillars: ['resilience', 'productivity'],
  // 3.2.5: a PoC that started 20 days ago and ends in 10, with what was agreed.
  poc: {
    startDate: dayFromToday(-20),
    endDate: dayFromToday(10),
    criteria: [
      { id: 'c1', metric: 'coverage.categories', operator: '>=', target: 75, text: '', origin: 'Kick-off', manualStatus: 'pending' },
      { id: 'c2', metric: 'problems.mttr', operator: '<=', target: 4, text: 'Faster resolution of production incidents', origin: 'Kick-off', manualStatus: 'pending' },
      { id: 'c3', metric: 'problems.closed', operator: '>=', target: 95, text: '', origin: 'Statement of work', manualStatus: 'pending' },
      { id: 'c4', metric: 'security.critical', operator: '<=', target: 0, text: '', origin: 'Security review', manualStatus: 'pending' },
      { id: 'c5', metric: 'manual', operator: '>=', target: null, text: 'Root cause found without a war room', origin: 'Kick-off', manualStatus: 'met', pillar: 'agility' },
    ],
    dashboard: null,
    // 3.8.1: the service user that runs the detectors is a preparation step; the seeded PoC has one (a made-up id), so it
    // keeps six of its eight steps and opens in full.
    detectorActor: '00000000-1111-4222-8333-444455556666', detectorActorName: 'poc-automation-detectors',
  },
};
const SEEDED_PRIVATE = {
  v: 1,
  savedAt: '2026-09-14T15:42:00.000Z',
  costModel: { ratePerHour: null, currencyLabel: '', rateBasis: '', downtimeRatePerHour: null, downtimeBasis: '' },
  baseline: { manualMttrHours: null, annualCostPerAgent: null },
  rateCard: { enabled: false, currencyLabel: '', usdToLocalRate: null },
  locale: 'en',
  timeframe: 'now-24h',
};

// 3.4.6: an Assessment action plan agreed for three of the rich fixture's actions — one in progress, one
// done, one with its due day already past — so the printed plan and its counts are reviewed with content.
const SEEDED_PLAN = {
  v: 1,
  savedAt: '2026-09-10T12:00:00.000Z',
  items: {
    'ASM-04': { owner: 'Platform team', due: '2026-12-15', status: 'inProgress' },
    'ASM-13': { owner: 'Kubernetes team', due: '2026-09-01', status: 'open' },
    'ASM-26': { owner: 'Security office', due: '2026-09-05', status: 'done' },
  },
};

function seed(scope, key) {
  if (mode() !== 'seeded' && mode() !== 'priced' && mode() !== 'built') return undefined;
  if (mode() === 'built' && scope === 'app' && key === 'pvs.shared.v1')
    return JSON.stringify({
      ...SEEDED_SHARED,
      poc: {
        ...(SEEDED_SHARED.poc ?? {}),
        pipeline: { id: 'harness-pipeline-0001', name: 'PoC Automation — log levels (Acme Corp)', createdAt: '2026-09-14T15:40:00.000Z', createdBy: 'se@example.com', shared: true },
      },
    });
  if (mode() === 'priced' && scope === 'user' && key === 'pvs.private.v1')
    return JSON.stringify({ ...SEEDED_PRIVATE, locale: globalThis.__PVS__?.locale === 'pt-BR' ? 'pt-BR' : 'en', rateCard: { enabled: true, currencyLabel: '', usdToLocalRate: null } });
  if (scope === 'app' && key === 'pvs.assessment.plan.v1') return JSON.stringify(SEEDED_PLAN);
  if (scope === 'app' && key === 'pvs.shared.v1') return JSON.stringify(SEEDED_SHARED);
  // 3.7.7: the seeded user saved the language the run asks for (a pt-BR run reads the seeded PoC in Portuguese).
  if (scope === 'user' && key === 'pvs.private.v1') return JSON.stringify({ ...SEEDED_PRIVATE, locale: globalThis.__PVS__?.locale === 'pt-BR' ? 'pt-BR' : 'en' });
  return undefined;
}

function guard(scope, kind) {
  if (mode() === 'forbidden') {
    throw forbidden(`state:${scope === 'app' ? 'app-states' : 'user-app-states'}:${kind}`);
  }
  if (mode() === 'fail') throw platform();
}

function read(scope, key) {
  guard(scope, 'read');
  const stored = store().getItem(id(scope, key));
  const value = stored ?? seed(scope, key);
  if (value === undefined || value === null) throw notFound();
  return Promise.resolve({
    value,
    modificationInfo: { lastModifiedBy: 'harness', lastModifiedTime: new Date('2026-09-14T15:42:00.000Z') },
  });
}
function write(scope, key, body) {
  guard(scope, 'write');
  store().setItem(id(scope, key), body.value);
  return Promise.resolve();
}
function remove(scope, key) {
  guard(scope, 'delete');
  store().removeItem(id(scope, key));
  return Promise.resolve();
}

export const stateClient = {
  getAppState: ({ key }) => read('app', key),
  setAppState: ({ key, body }) => write('app', key, body),
  deleteAppState: ({ key }) => remove('app', key),
  getUserAppState: ({ key }) => read('user', key),
  setUserAppState: ({ key, body }) => write('user', key, body),
  deleteUserAppState: ({ key }) => remove('user', key),
};
