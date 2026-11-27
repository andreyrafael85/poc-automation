import React, { useRef, useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Chip, MessageContainer } from '@dynatrace/strato-components/content';
import { Checkbox, NumberInputV2, TextArea, TextInput } from '@dynatrace/strato-components/forms';
import { Divider } from '@dynatrace/strato-components/layouts';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { Heading, Link, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CheckmarkIcon } from '@dynatrace/strato-icons';

import { AccessSettings } from '../components/AccessSettings';
import { NewPocPanel, PersistenceNotice } from '../components/PersistenceNotice';
import { PocTransferPanel } from '../components/PocTransfer';
import { SectionIntro } from '../components/SectionIntro';
import { AssumptionsList } from '../components/AssumptionsList';
import { APP_CREATOR, installedVersion } from '../config/appInfo';
import { useAccess } from '../config/AccessContext';
import { safeWebUrl } from '../config/persistence';
import { useStudio } from '../config/StudioContext';
import { BRAND_COLOR, BRAND_TONES, type BrandTone } from '../design/palette';
import { ServiceUserPicker } from '../features/builder/ServiceUserPicker';
import { Callout, Cluster, Figure, Grid, Panel, Stack } from '../engine';
import '../engine/page-d.css';
import type { StringKey } from '../i18n/strings';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import {
  EMPTY_DOWNTIME_INPUTS,
  formatMoney,
  suggestDowntimeRate,
  type DowntimeInputs,
} from '../models/cost';
import type { PillarId } from '../models/pillars';
import type { PocPlan } from '../models/pocPlan';
import { PrerequisitesGuide } from '../features/prerequisites/PrerequisitesGuide';
import { PocPlanEditor } from '../features/pocPlan/PocPlanEditor';
import { normaliseRateCard } from '../models/licensing';
import { ReadinessList, type ReadinessItem } from '../engine/chart/ReadinessList';
import { STEP_LABEL, useReadiness, type ReadinessKey } from '../features/setup/readiness';
import { RingRankPanel } from '../engine/chart/RingRankPanel';
import { ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES, isSafeImageDataUrl, validateLogo } from '../utils/logo';

/**
 * Engagement parameters.
 *
 * These exist so the app can be reused across engagements without any customer
 * detail being compiled into the bundle. From 3.2 they are kept on the tenant (see
 * `useTenantPersistence`); "New PoC" is what clears them, so the next presentation cannot
 * inherit a customer's branding by accident.
 *
 * The hourly rate is the one input that changes what numbers appear. It is
 * always labelled as an operator assumption, never as environment data.
 *
 * ## Tabs
 *
 * One draft and one Apply/Discard span every tab — the customer, cost, partner and rate-card
 * tabs and the pillar choices. Each tab is `keepMounted`, so
 * switching away hides a panel instead of unmounting it — the same "hidden but
 * still mounted" behaviour the page always had, now with Strato's keyboard model
 * and `aria-selected` wiring instead of hand-built pills.
 */

/** A labelled form control. The label is what the control's `aria-labelledby` points at. */
const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <Stack gap="tight">
    <Text id={id}>{label}</Text>
    {children}
  </Stack>
);

/**
 * The words for a refused logo.
 *
 * `validateLogo` (kept as is, with its tests) decides *whether* a file is
 * acceptable and returns an English `reason`. The reader of this page may not
 * read English, so the page says it in the active language: it names the same
 * four refusals from the same file facts, and falls back to the model's own
 * reason for anything it does not recognise.
 */
function logoRejection(file: File, fallbackReason: string, t: Translation['t']): string {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return t('settings.logo.err.svg');
  if (!(ALLOWED_LOGO_TYPES as readonly string[]).includes(file.type)) {
    return t('settings.logo.err.format', {
      type: file.type === '' ? t('settings.logo.err.unknownType') : file.type,
    });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return t('settings.logo.err.size', {
      size: Math.round(file.size / 1024),
      max: MAX_LOGO_BYTES / 1024,
    });
  }
  if (file.size === 0) return t('settings.logo.err.empty');
  return fallbackReason;
}

/**
 * The tab `/settings?tab=…` opens: the PoC plan is the second, after "Customer & engagement". 3.6.6: the dashboards left
 * for the PoC builder; the old address `?tab=dashboards` is sent there by the router (`App.tsx`).
 */
// 3.7.7: the wizard opens the tab where each readiness step is done.
const SETTINGS_TAB_INDEX: Readonly<Record<string, number>> = { customer: 0, plan: 1, cost: 2 };

const SettingsForm = ({ imported, onImported }: { imported: string | null; onImported: (customer: string) => void }) => {
  const { parameters, setParameters, costModel, setCostModel, rateCard, setRateCard, selectedPillars, togglePillar, pocPlan, setPocPlan } =
    useStudio();
  const { t } = useTranslation();
  // Read once, on mount, from the address: no router needed (the page also renders outside one).
  const access = useAccess();
  const [initialTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') ?? '';
    return SETTINGS_TAB_INDEX[tab] ?? 0;
  });
  const appVersion = installedVersion();

  const [customerName, setCustomerName] = useState(parameters.customerName);
  const [engagementName, setEngagementName] = useState(parameters.engagementName);
  // 3.7.3: the customer's main web address — the first HTTP monitor the PoC Builder offers.
  const [customerUrl, setCustomerUrl] = useState(parameters.customerUrl);
  const customerUrlInvalid = customerUrl.trim() !== '' && safeWebUrl(customerUrl) === '';
  const [scopeDescription, setScopeDescription] = useState(parameters.scopeDescription);
  const [pocDescription, setPocDescription] = useState(parameters.pocDescription);
  const [logo, setLogo] = useState<string | null>(parameters.customerLogoDataUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [brandTone, setBrandTone] = useState<BrandTone>(parameters.brandTone);
  const [partnerName, setPartnerName] = useState(parameters.partnerName);
  const [partnerLogo, setPartnerLogo] = useState<string | null>(parameters.partnerLogoDataUrl);
  const [partnerLogoError, setPartnerLogoError] = useState<string | null>(null);

  const [rate, setRate] = useState<string>(
    costModel.ratePerHour === null ? '' : String(costModel.ratePerHour),
  );
  const [currencyLabel, setCurrencyLabel] = useState(costModel.currencyLabel);
  const [rateBasis, setRateBasis] = useState(costModel.rateBasis);
  const [downtimeRate, setDowntimeRate] = useState<string>(
    costModel.downtimeRatePerHour === null ? '' : String(costModel.downtimeRatePerHour),
  );
  const [downtimeBasis, setDowntimeBasis] = useState(costModel.downtimeBasis);
  const [builder, setBuilder] = useState<DowntimeInputs>(EMPTY_DOWNTIME_INPUTS);
  // The rate card and the pillars are part of the same draft as every other tab: nothing here
  // reaches the reports until Apply, and Discard puts it all back. (They used to commit on
  // every keystroke, so "one Apply for every tab" was not true of two of the four.)
  const [rateCardDraft, setRateCardDraft] = useState(rateCard);
  const [pillarDraft, setPillarDraft] = useState<readonly PillarId[]>(selectedPillars);
  // The PoC plan (3.2.5) joins the same draft. The dashboard reference is not part of it: the
  // dashboard is created or updated by its own button, at once.
  const [planDraft, setPlanDraft] = useState<PocPlan>(pocPlan);

  const fileInput = useRef<HTMLInputElement>(null);
  const partnerFileInput = useRef<HTMLInputElement>(null);

  const detailsDirty =
    customerName !== parameters.customerName ||
    engagementName !== parameters.engagementName ||
    customerUrl !== parameters.customerUrl ||
    scopeDescription !== parameters.scopeDescription ||
    pocDescription !== parameters.pocDescription ||
    logo !== parameters.customerLogoDataUrl ||
    brandTone !== parameters.brandTone ||
    partnerName !== parameters.partnerName ||
    partnerLogo !== parameters.partnerLogoDataUrl;

  const parsedRate = rate.trim() === '' ? null : Number(rate);
  const rateIsValid = parsedRate === null || (Number.isFinite(parsedRate) && parsedRate > 0);
  const parsedDowntime = downtimeRate.trim() === '' ? null : Number(downtimeRate);
  const downtimeIsValid =
    parsedDowntime === null || (Number.isFinite(parsedDowntime) && parsedDowntime > 0);
  const suggestion = suggestDowntimeRate(builder, currencyLabel, { t });
  const costDirty =
    (parsedDowntime ?? null) !== costModel.downtimeRatePerHour ||
    downtimeBasis !== costModel.downtimeBasis ||
    (parsedRate ?? null) !== costModel.ratePerHour ||
    currencyLabel !== costModel.currencyLabel ||
    rateBasis !== costModel.rateBasis;

  const normalisedDraft = normaliseRateCard(rateCardDraft);
  const rateCardDirty =
    normalisedDraft.enabled !== rateCard.enabled ||
    normalisedDraft.currencyLabel !== rateCard.currencyLabel ||
    normalisedDraft.usdToLocalRate !== rateCard.usdToLocalRate;
  const pillarsDirty =
    pillarDraft.length !== selectedPillars.length || pillarDraft.some((id) => !selectedPillars.includes(id));

  const planDirty =
    // 3.8.1: the service user and the account are saved by their own panel, never by Apply.
    JSON.stringify({ ...planDraft, dashboard: null, detectorActor: undefined, detectorActorName: undefined, accountUuid: undefined }) !==
      JSON.stringify({ ...pocPlan, dashboard: null, detectorActor: undefined, detectorActorName: undefined, accountUuid: undefined });
  // A manual criterion is nothing but its words, and a PoC cannot end before it starts.
  const planValid =
    (planDraft.startDate === null || planDraft.endDate === null || planDraft.endDate >= planDraft.startDate) &&
    planDraft.criteria.every((criterion) => criterion.metric !== 'manual' || criterion.text.trim() !== '');

  const anyDirty = detailsDirty || costDirty || rateCardDirty || pillarsDirty || planDirty;

  const resetDetails = () => {
    setCustomerName(parameters.customerName);
    setEngagementName(parameters.engagementName);
    setCustomerUrl(parameters.customerUrl);
    setScopeDescription(parameters.scopeDescription);
    setPocDescription(parameters.pocDescription);
    setLogo(parameters.customerLogoDataUrl);
    setLogoError(null);
    setBrandTone(parameters.brandTone);
    setPartnerName(parameters.partnerName);
    setPartnerLogo(parameters.partnerLogoDataUrl);
    setPartnerLogoError(null);
  };

  const resetCost = () => {
    setRate(costModel.ratePerHour === null ? '' : String(costModel.ratePerHour));
    setCurrencyLabel(costModel.currencyLabel);
    setRateBasis(costModel.rateBasis);
    setDowntimeRate(
      costModel.downtimeRatePerHour === null ? '' : String(costModel.downtimeRatePerHour),
    );
    setDowntimeBasis(costModel.downtimeBasis);
  };

  const resetRateCardAndPillars = () => {
    setRateCardDraft(rateCard);
    setPillarDraft(selectedPillars);
    setPlanDraft(pocPlan);
  };

  /**
   * Commits every section.
   *
   * The two rates are independent: a customer who knows their engineering cost
   * but not their downtime cost supplies one and leaves the other blank, and
   * both outcomes are saved. Neither field gates the other.
   */
  const applyAll = () => {
    setParameters({
      customerName,
      engagementName,
      scopeDescription,
      pocDescription,
      customerLogoDataUrl: logo,
      brandTone,
      partnerName,
      partnerLogoDataUrl: partnerLogo,
      customerUrl: safeWebUrl(customerUrl),
    });
    setCostModel({
      ratePerHour: parsedRate,
      currencyLabel,
      rateBasis,
      downtimeRatePerHour: parsedDowntime,
      downtimeBasis,
    });
    setRateCard(rateCardDraft);
    // `togglePillar` flips membership, so toggle exactly the ones that differ.
    const changed = new Set<PillarId>([
      ...pillarDraft.filter((id) => !selectedPillars.includes(id)),
      ...selectedPillars.filter((id) => !pillarDraft.includes(id)),
    ]);
    changed.forEach((id) => togglePillar(id));
    setPocPlan({ ...planDraft, dashboard: pocPlan.dashboard, detectorActor: pocPlan.detectorActor, detectorActorName: pocPlan.detectorActorName, accountUuid: pocPlan.accountUuid });
  };

  /**
   * Reads a chosen logo file into state. The customer and partner logos follow the
   * same two gates — the model's `validateLogo`, then a check that the produced
   * data URL really is a raster image before it is ever placed in an `img` src.
   */
  const pickLogo = (
    event: React.ChangeEvent<HTMLInputElement>,
    input: React.RefObject<HTMLInputElement>,
    setImage: (value: string) => void,
    setError: (value: string | null) => void,
  ) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateLogo({ type: file.type, size: file.size, name: file.name });
    if (!validation.ok) {
      setError(logoRejection(file, validation.reason, t));
      if (input.current !== null) input.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (result === null || !isSafeImageDataUrl(result)) {
        setError(t('settings.logo.err.notRaster'));
        return;
      }
      setImage(result);
    };
    reader.onerror = () => setError(t('settings.logo.err.read'));
    reader.readAsDataURL(file);
  };

  const suggestedPerHour = suggestion.totalPerHour;

  // 3.3.21 — what the story and the exports take from this page, from what is saved (not the draft):
  // each item ticked or still to fill in, with the tab where it is set. The dashboard is the SE's
  // (only they create it); the hourly cost is commercial, so it is listed only where commercial data
  // is visible — the line says "set", never the rate.
  // 3.7.7: the same steps the first-run wizard counts (features/setup/readiness.ts), so the two never disagree.
  const prepared = useReadiness();
  const STEP_WHERE: Record<ReadinessKey, StringKey> = {
    customer: 'settings.tab.customer',
    logo: 'settings.tab.customer',
    description: 'settings.tab.customer',
    dates: 'settings.tab.plan',
    criteria: 'settings.tab.plan',
    dashboard: 'nav.builder',
    serviceUser: 'settings.tab.plan',
    rate: 'settings.tab.cost',
  };
  const readiness: ReadinessItem[] = prepared.steps.map((step) => ({ key: step.key, label: t(STEP_LABEL[step.key]), where: t(STEP_WHERE[step.key]), done: step.done }));
  const readyDone = readiness.filter((item) => item.done).length;
  const readyPct = Math.round((readyDone / readiness.length) * 100);

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="settings.title"
        questionKey="settings.question"
        takeawayKey="settings.takeaway"
      />

      {/* App creator — a quiet credit at the top of the page. */}
      <Panel pad="compact">
        <Cluster>
          <Text>{t('settings.creator.body', { name: APP_CREATOR.name, role: APP_CREATOR.role })}</Text>
          <Link href={`mailto:${APP_CREATOR.email}`}>{APP_CREATOR.email}</Link>
          <Chip color="neutral" variant="accent" size="condensed">
            {t('settings.creator.version', { version: appVersion })}
          </Chip>
        </Cluster>
      </Panel>

      <Callout kind="note" title={t('settings.session.title')}>
        <Stack gap="tight">
          <Paragraph>{t('settings.session.body')}</Paragraph>
          <Paragraph>{t('settings.session.why')}</Paragraph>
        </Stack>
      </Callout>

      <PersistenceNotice />

      <RingRankPanel
        data-testid="settings-ready"
        title={t('settings.ready.title')}
        caption={t('settings.ready.caption')}
        ring={{
          family: 'turquoise',
          value: readyPct,
          valueDisplay: `${readyPct}%`,
          label: t('settings.ready.ring'),
          caption: t('settings.ready.ringCaption', { done: String(readyDone), total: String(readiness.length) }),
          ariaLabel: t('settings.ready.aria'),
          missingLabel: t('tl.notMeasured'),
        }}
      >
        <ReadinessList
          items={readiness}
          ariaLabel={t('settings.ready.title')}
          doneLabel={t('settings.ready.done')}
          openLabel={t('settings.ready.open')}
        />
      </RingRankPanel>

      {/* 3.2.6: `/settings?tab=plan` opens the PoC plan (the Timeline's "open Settings" lands there). */}
      <Tabs defaultIndex={initialTab}>
        {/* ------------------------------------------------ customer identity */}
        <Tab title={t('settings.tab.customer')} keepMounted>
          <Panel pad="roomy">
            <Stack gap="group" className="pvs-d-form">
              <Heading level={4} as="h2">
                {t('settings.customer.heading')}
              </Heading>

              <Field id="customer-name-label" label={t('settings.customer.name')}>
                <TextInput
                  value={customerName}
                  onChange={setCustomerName}
                  placeholder={t('settings.customer.namePlaceholder')}
                  aria-labelledby="customer-name-label"
                />
              </Field>

              <Field id="customer-url-label" label={t('settings.customer.url')}>
                <TextInput
                  value={customerUrl}
                  onChange={setCustomerUrl}
                  placeholder={t('settings.customer.urlPlaceholder')}
                  aria-labelledby="customer-url-label"
                />
              </Field>
              {customerUrlInvalid ? (
                <Text className="pvs-caption">{t('settings.customer.urlInvalid')}</Text>
              ) : (
                <Text className="pvs-caption" data-testid="settings-url-use">
                  {t('settings.customer.urlUse')}
                </Text>
              )}

              <Field id="engagement-name-label" label={t('settings.engagement.name')}>
                <TextInput
                  value={engagementName}
                  onChange={setEngagementName}
                  placeholder={t('settings.engagement.placeholder')}
                  aria-labelledby="engagement-name-label"
                />
              </Field>

              <Field id="poc-description-label" label={t('settings.poc.description')}>
                <TextArea
                  value={pocDescription}
                  onChange={setPocDescription}
                  placeholder={t('settings.poc.placeholder')}
                  aria-labelledby="poc-description-label"
                  rows={3}
                />
              </Field>

              <Field id="scope-label" label={t('settings.scope.label')}>
                <TextArea
                  value={scopeDescription}
                  onChange={setScopeDescription}
                  placeholder={t('settings.scope.placeholder')}
                  aria-labelledby="scope-label"
                  rows={3}
                />
              </Field>

              {/* ----------------------------------------------- brand accent */}
              <Stack gap="tight">
                <Heading level={5} as="h3">
                  {t('settings.brand.heading')}
                </Heading>
                <Paragraph>{t('settings.brand.body')}</Paragraph>
                <Cluster>
                  {BRAND_TONES.map((tone) => {
                    const selected = brandTone === tone;
                    const label = t(`settings.brand.${tone}` as StringKey);
                    return (
                      <Button
                        key={tone}
                        variant={selected ? 'emphasized' : 'default'}
                        onClick={() => setBrandTone(tone)}
                        aria-pressed={selected}
                        aria-label={label}
                      >
                        {selected && (
                          <Button.Prefix>
                            <CheckmarkIcon aria-hidden="true" />
                          </Button.Prefix>
                        )}
                        <span className="pvs-d-choice">
                          <span
                            className="pvs-d-swatch"
                            aria-hidden="true"
                            style={{ backgroundColor: BRAND_COLOR[tone] }}
                          />
                          {label}
                        </span>
                      </Button>
                    );
                  })}
                </Cluster>
                <Cluster>
                  <Text>{t('settings.brand.preview')}</Text>
                  <Chip color="neutral" variant="emphasized" size="condensed">
                    <span className="pvs-d-choice">
                      <span
                        className="pvs-d-swatch"
                        data-shape="dot"
                        aria-hidden="true"
                        style={{ backgroundColor: BRAND_COLOR[brandTone] }}
                      />
                      {customerName === '' ? t('settings.brand.placeholder') : customerName}
                    </span>
                  </Chip>
                </Cluster>
              </Stack>

              {/* ------------------------------------------------------ logo */}
              <Stack gap="tight">
                <Text id="logo-label">{t('settings.logo.label')}</Text>
                <Paragraph>{t('settings.logo.help', { max: MAX_LOGO_BYTES / 1024 })}</Paragraph>

                <input
                  ref={fileInput}
                  type="file"
                  className="pvs-file-input"
                  accept={ALLOWED_LOGO_TYPES.join(',')}
                  onChange={(event) => pickLogo(event, fileInput, setLogo, setLogoError)}
                  aria-labelledby="logo-label"
                />

                {logoError !== null && (
                  <MessageContainer variant="critical">
                    <MessageContainer.Title>{t('settings.logo.rejected')}</MessageContainer.Title>
                    <MessageContainer.Description>{logoError}</MessageContainer.Description>
                  </MessageContainer>
                )}

                {logo !== null && (
                  <Stack gap="tight">
                    <Text>{t('settings.logo.preview')}</Text>
                    <img
                      className="pvs-d-logo"
                      src={logo}
                      alt={
                        customerName === ''
                          ? t('settings.logo.alt.customer')
                          : t('settings.logo.alt.customerNamed', { name: customerName })
                      }
                    />
                    <Cluster>
                      <Button
                        onClick={() => {
                          setLogo(null);
                          setLogoError(null);
                          if (fileInput.current !== null) fileInput.current.value = '';
                        }}
                      >
                        {t('settings.logo.remove')}
                      </Button>
                    </Cluster>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Panel>
        </Tab>
        {/* ------------------------------------------------ PoC plan (3.2.5) */}
        <Tab title={t('settings.tab.plan')} keepMounted>
          <Stack gap="section">
            <PocPlanEditor draft={planDraft} onChange={setPlanDraft} pillars={pillarDraft} onPillarsChange={setPillarDraft} />
            {/* 3.8.1: the service user that runs the PoC's anomaly detectors (a readiness step for the SE). */}
            {access.canWork && <ServiceUserPicker onSaved={(patch) => setPlanDraft((draft) => ({ ...draft, ...patch }))} />}
          </Stack>
        </Tab>

        {/* 3.6.6: the dashboards moved to the PoC builder (/builder), the page of what the PoC creates on the tenant. */}

        {/* --------------------------------------------------- cost model */}
        {/* Rates and the price table are commercial: hidden unless "Commercial data" is on. */}
        {access.commercialVisible && (
        <Tab title={t('settings.tab.cost')} keepMounted>
          <Panel pad="roomy">
            <Stack gap="group" className="pvs-d-form">
              <Heading level={4} as="h2">
                {t('settings.cost.heading')}
              </Heading>

              {/* The rate is the operator's assumption, not something measured. */}
              <Callout kind="assumption" title={t('settings.cost.warnTitle')}>
                <Stack gap="tight">
                  <Paragraph>{t('settings.cost.warnBody1')}</Paragraph>
                  <Paragraph>{t('settings.cost.warnBody2')}</Paragraph>
                </Stack>
              </Callout>

              <Grid min={200}>
                <Field id="rate-label" label={t('settings.cost.rate')}>
                  <NumberInputV2
                    value={parsedRate}
                    onChange={(value) => setRate(value === null ? '' : String(value))}
                    min={0}
                    placeholder={t('settings.cost.ratePlaceholder')}
                    aria-labelledby="rate-label"
                  />
                </Field>

                <Field id="currency-label" label={t('settings.cost.currency')}>
                  <TextInput
                    value={currencyLabel}
                    onChange={setCurrencyLabel}
                    placeholder={t('p.settings.currencyPlaceholder')}
                    aria-labelledby="currency-label"
                  />
                </Field>
              </Grid>

              <Field id="basis-label" label={t('settings.cost.basis')}>
                <TextArea
                  value={rateBasis}
                  onChange={setRateBasis}
                  placeholder={t('settings.cost.basisPlaceholder')}
                  aria-labelledby="basis-label"
                  rows={2}
                />
              </Field>

              {(!rateIsValid || !downtimeIsValid) && (
                <MessageContainer variant="critical">
                  <MessageContainer.Title>{t('settings.cost.invalid')}</MessageContainer.Title>
                  <MessageContainer.Description>
                    {t('p.settings.rateInvalid')}
                  </MessageContainer.Description>
                </MessageContainer>
              )}

              {/* ------------------------------------------- downtime rate */}
              <Divider />

              <Stack gap="tight">
                <Heading level={5} as="h3">
                  {t('settings.downtime.heading')}
                </Heading>
                <Paragraph>{t('settings.downtime.body')}</Paragraph>

                <Grid min={200}>
                  <Field id="downtime-rate-label" label={t('settings.downtime.rate')}>
                    <NumberInputV2
                      value={parsedDowntime}
                      onChange={(value) => setDowntimeRate(value === null ? '' : String(value))}
                      min={0}
                      placeholder={t('settings.downtime.ratePlaceholder')}
                      aria-labelledby="downtime-rate-label"
                    />
                  </Field>
                </Grid>

                <Field id="downtime-basis-label" label={t('settings.downtime.basis')}>
                  <TextArea
                    value={downtimeBasis}
                    onChange={setDowntimeBasis}
                    placeholder={t('settings.downtime.basisPlaceholder')}
                    aria-labelledby="downtime-basis-label"
                    rows={2}
                  />
                </Field>
              </Stack>

              {/* --------------------------- guided downtime-rate builder */}
              <Panel pad="compact">
                <Stack gap="group">
                  <Stack gap="tight">
                    <Heading level={5} as="h3">
                      {t('settings.builder.heading')}
                    </Heading>
                    <Paragraph>{t('settings.builder.body')}</Paragraph>
                  </Stack>

                  <Heading level={6} as="h4">
                    {t('settings.builder.revenueHeading')}
                  </Heading>
                  <Grid min={190}>
                    {(
                      [
                        ['annualRevenue', 'settings.builder.annualRevenue'],
                        ['operatingHoursPerYear', 'settings.builder.operatingHours'],
                        ['revenueSharePct', 'settings.builder.revenueShare'],
                      ] as const
                    ).map(([field, labelKey]) => (
                      <Field key={field} id={`builder-${field}`} label={t(labelKey)}>
                        <NumberInputV2
                          value={builder[field]}
                          onChange={(value) => setBuilder((current) => ({ ...current, [field]: value }))}
                          min={0}
                          aria-labelledby={`builder-${field}`}
                        />
                      </Field>
                    ))}
                  </Grid>

                  <Heading level={6} as="h4">
                    {t('settings.builder.productivityHeading')}
                  </Heading>
                  <Grid min={190}>
                    {(
                      [
                        ['employeesAffected', 'settings.builder.employees'],
                        ['loadedHourlyWage', 'settings.builder.wage'],
                        ['productivityLossPct', 'settings.builder.lossPct'],
                      ] as const
                    ).map(([field, labelKey]) => (
                      <Field key={field} id={`builder-${field}`} label={t(labelKey)}>
                        <NumberInputV2
                          value={builder[field]}
                          onChange={(value) => setBuilder((current) => ({ ...current, [field]: value }))}
                          min={0}
                          aria-labelledby={`builder-${field}`}
                        />
                      </Field>
                    ))}
                  </Grid>

                  {suggestedPerHour === null ? (
                    <Text>{t('settings.builder.empty')}</Text>
                  ) : (
                    <Stack gap="tight">
                      {/* A suggestion built from typed numbers: an estimate, drawn as one. */}
                      <Panel pad="compact" evidence="projection">
                        <Stack gap="tight">
                          <Text className="pvs-label">{t('settings.builder.suggested')}</Text>
                          <Figure value={formatMoney(suggestedPerHour, currencyLabel)} size="md" />
                          {suggestion.steps.map((step) => (
                            <Text key={step} className="pvs-caption">
                              {step}
                            </Text>
                          ))}
                        </Stack>
                      </Panel>
                      <Cluster>
                        <Button
                          onClick={() => {
                            setDowntimeRate(String(Math.round(suggestedPerHour)));
                            setDowntimeBasis(suggestion.steps.join(' · '));
                          }}
                        >
                          {t('settings.builder.use')}
                        </Button>
                      </Cluster>
                    </Stack>
                  )}

                  <Callout kind="estimate" title={t('callout.estimate')}>
                    {t('settings.builder.caveat')}
                  </Callout>
                </Stack>
              </Panel>

              {/* Why the declared scope is shown verbatim — kept beside the cost
                 reasoning: both are about giving the customer numbers they can trust. */}
              <Callout kind="note" title={t('p.settings.verbatimTitle')}>
                {t('p.settings.verbatimBody')}
              </Callout>
            </Stack>
          </Panel>
        </Tab>
        )}

        {/* -------------------------------------------------------- partner */}
        <Tab title={t('settings.tab.partner')} keepMounted>
          <Panel pad="roomy">
            <Stack gap="group" className="pvs-d-form">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('settings.partner.heading')}
                </Heading>
                <Paragraph>{t('settings.partner.body')}</Paragraph>
              </Stack>

              <Field id="partner-name-label" label={t('settings.partner.name')}>
                <TextInput
                  value={partnerName}
                  onChange={setPartnerName}
                  placeholder={t('settings.partner.namePlaceholder')}
                  aria-labelledby="partner-name-label"
                />
              </Field>

              <Stack gap="tight">
                <Text id="partner-logo-label">{t('settings.partner.logo')}</Text>
                <Paragraph>{t('settings.logo.help', { max: MAX_LOGO_BYTES / 1024 })}</Paragraph>

                <input
                  ref={partnerFileInput}
                  type="file"
                  className="pvs-file-input"
                  accept={ALLOWED_LOGO_TYPES.join(',')}
                  onChange={(event) =>
                    pickLogo(event, partnerFileInput, setPartnerLogo, setPartnerLogoError)
                  }
                  aria-labelledby="partner-logo-label"
                />

                {partnerLogoError !== null && (
                  <MessageContainer variant="critical">
                    <MessageContainer.Title>{t('settings.logo.rejected')}</MessageContainer.Title>
                    <MessageContainer.Description>{partnerLogoError}</MessageContainer.Description>
                  </MessageContainer>
                )}

                {partnerLogo !== null && (
                  <Stack gap="tight">
                    <Text>{t('settings.logo.preview')}</Text>
                    <img
                      className="pvs-d-logo"
                      src={partnerLogo}
                      alt={
                        partnerName === ''
                          ? t('settings.logo.alt.partner')
                          : t('settings.logo.alt.partnerNamed', { name: partnerName })
                      }
                    />
                    <Cluster>
                      <Button
                        onClick={() => {
                          setPartnerLogo(null);
                          setPartnerLogoError(null);
                          if (partnerFileInput.current !== null) partnerFileInput.current.value = '';
                        }}
                      >
                        {t('settings.logo.remove')}
                      </Button>
                    </Cluster>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Panel>
        </Tab>

        {/* ------------------------------------------------------ rate card */}
        {access.commercialVisible && (
        <Tab title={t('settings.tab.rate')} keepMounted>
          <Panel pad="roomy">
            <Stack gap="group" className="pvs-d-form">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('settings.rate.title')}
                </Heading>
                <Paragraph>{t('settings.rate.body')}</Paragraph>
              </Stack>
              <Checkbox
                value={rateCardDraft.enabled}
                onChange={() => setRateCardDraft({ ...rateCardDraft, enabled: !rateCardDraft.enabled })}
              >
                <Text>{t('settings.rate.enable')}</Text>
              </Checkbox>
              {rateCardDraft.enabled && (
                <Stack gap="tight">
                  <Text className="pvs-caption">{t('settings.rate.convertHint')}</Text>
                  <Grid min={200}>
                    <Field id="rate-currency-label" label={t('settings.rate.currency')}>
                      <TextInput
                        value={rateCardDraft.currencyLabel}
                        onChange={(value) => setRateCardDraft({ ...rateCardDraft, currencyLabel: value })}
                        placeholder={t('settings.rate.currencyPlaceholder')}
                        aria-labelledby="rate-currency-label"
                      />
                    </Field>
                    <Field id="rate-fx-label" label={t('settings.rate.fx')}>
                      <NumberInputV2
                        value={rateCardDraft.usdToLocalRate}
                        onChange={(value) => setRateCardDraft({ ...rateCardDraft, usdToLocalRate: value })}
                        min={0}
                        placeholder={t('settings.rate.fxPlaceholder')}
                        aria-labelledby="rate-fx-label"
                      />
                    </Field>
                  </Grid>
                </Stack>
              )}
              <Callout kind="estimate" title={t('callout.estimate')}>
                {t('settings.rate.disclaimer')}
              </Callout>
            </Stack>
          </Panel>
        </Tab>
        )}
        {/* 3.4.13 (owner's order of 2026-11-19): the app's consumption moved to Licensing; in its place, what a PoC
            needs before day one — the SE's and the partner's guide, from Dynatrace's documentation. */}
        {access.canWork && (
          <Tab title={t('settings.tab.prerequisites')} keepMounted>
            <PrerequisitesGuide />
          </Tab>
        )}
        <Tab title={t('help.assumptions')}>
          <AssumptionsList />
        </Tab>
        {access.canManageAccess && (
          <Tab title={t('access.tab')} keepMounted>
            <AccessSettings />
          </Tab>
        )}
      </Tabs>

      {/* One Apply/Discard for the whole page, on every tab. */}
      <Panel pad="compact">
        <Stack gap="group">
          <Stack gap="tight">
            {/* Rates are commercial: with "Commercial data" off this line says nothing priced,
                so a shared screen on any tab never shows them (3.2.1). */}
            {access.commercialVisible ? (
              <Text>
                {t('settings.willSave', {
                  rate:
                    parsedRate === null
                      ? t('settings.willSave.none')
                      : formatMoney(parsedRate, currencyLabel),
                  downtime:
                    parsedDowntime === null
                      ? t('settings.willSave.none')
                      : formatMoney(parsedDowntime, currencyLabel),
                })}
              </Text>
            ) : (
              <Text>{t('settings.willSave.neutral')}</Text>
            )}
            <Text className="pvs-caption">{t('settings.independent')}</Text>
          </Stack>

          <Cluster>
            {/* 3.7.4 (the owner: in dark mode the buttons were hard to see): a filled primary button to save, a filled neutral one to discard. */}
            <Button
              variant="accent"
              color="primary"
              disabled={!anyDirty || !rateIsValid || !downtimeIsValid || !planValid}
              onClick={applyAll}
              data-testid="settings-apply-all"
            >
              {t('settings.applyAll')}
            </Button>
            <Button
              variant="emphasized"
              color="neutral"
              disabled={!anyDirty}
              data-testid="settings-discard"
              onClick={() => {
                resetDetails();
                resetCost();
                resetRateCardAndPillars();
              }}
            >
              {t('settings.discard')}
            </Button>
          </Cluster>
        </Stack>
      </Panel>

      {/* 3.3.6: export the PoC to a file, or import one (the app's new id starts empty). SE only. */}
      {access.canManageAccess && <PocTransferPanel imported={imported} onImported={onImported} />}

      <NewPocPanel />
    </Stack>
  );
};

/**
 * The form keeps a draft of its own, so it is re-mounted whenever the configuration is replaced
 * from the tenant (first read, reload, new PoC): otherwise it would keep showing what it mounted
 * with, a moment before the saved values arrived.
 */
export const Settings = () => {
  const { persistence } = useStudio();
  // 3.3.6: an imported PoC also re-mounts the form, so its drafts start from what was imported.
  const [imported, setImported] = useState<{ n: number; customer: string } | null>(null);
  return (
    <SettingsForm
      key={`${persistence.epoch}-${imported?.n ?? 0}`}
      imported={imported?.customer ?? null}
      onImported={(customer) => setImported((current) => ({ n: (current?.n ?? 0) + 1, customer }))}
    />
  );
};
