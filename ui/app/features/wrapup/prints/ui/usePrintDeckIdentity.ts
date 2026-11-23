import { useMemo } from 'react';

import { useStudio } from '../../../../config/StudioContext';
import { useTranslation } from '../../../../i18n/useTranslation';
import { DYNATRACE_LOGO_WHITE } from '../../brand';
import type { CoverInput } from '../../spec';
import { useGeneratedAtLabel, useImageAspect, useSeName } from '../../useWrapupViewModel';
import { printDeckCoverTitle } from '../deck/buildPrintDeckSpec';

/**
 * Who the real-prints deck is for and from (3.2.7): the cover and end slides of the Tech Wrapup —
 * customer, engagement, SE, partner and their logos, the provenance line — read from the PoC
 * settings with the Tech Wrapup's own strings, without its view model (whose 28 queries and 10 GB
 * incident-log scan this tab never runs).
 */

export interface PrintDeckIdentity {
  /** The cover's input (`coverSlideFor`), with the Tech Wrapup's strings. */
  cover: CoverInput;
  /** The provenance line without the tenant, for the Customer cover (3.2.7 review PS-7). */
  customerGeneratedAtLabel: string;
  /** "TIP - {customer} - Tech Wrapup · Telas reais", or the generic title without a customer. */
  coverTitle: string;
  /** The SE's role on the cover ("Solutions Engineer"). */
  seLabel: string;
  /** The SE profile's footer watermark. */
  watermark: string;
  /** The Dynatrace logo of the dark slides (white). */
  dtLogo: string;
  /** The customer's name as configured (trimmed), '' when none. */
  customer: string;
  seName: string | null;
}

export function usePrintDeckIdentity(): PrintDeckIdentity {
  const { t, formatDateTime } = useTranslation();
  const { parameters, resolvedTimeframe } = useStudio();
  const seName = useSeName();
  const customerLogoAspect = useImageAspect(parameters.customerLogoDataUrl);
  const partnerLogoAspect = useImageAspect(parameters.partnerLogoDataUrl);
  const generatedAtLabel = useGeneratedAtLabel();
  const customerGeneratedAtLabel = t('tw.generatedAt', { at: formatDateTime(resolvedTimeframe.endIso) });
  const customer = parameters.customerName.trim();

  return useMemo(
    () => ({
      cover: {
        customerName: parameters.customerName,
        engagementName: parameters.engagementName,
        seName,
        partnerName: parameters.partnerName,
        generatedAtLabel,
        customerLogo: parameters.customerLogoDataUrl,
        customerLogoAspect,
        partnerLogo: parameters.partnerLogoDataUrl,
        partnerLogoAspect,
        strings: {
          title: t('tw.deck.title'),
          partnerLabel: t('tw.partner.label'),
          measured: t('tw.measured'),
          confidential: t('tw.confidential'),
          agendaTitle: t('tw.agenda.title'),
        },
      },
      customerGeneratedAtLabel,
      coverTitle: printDeckCoverTitle(t, customer),
      seLabel: t('twt.roleSe'),
      watermark: t('profile.watermark'),
      dtLogo: DYNATRACE_LOGO_WHITE,
      customer,
      seName,
    }),
    [
      t,
      customer,
      seName,
      generatedAtLabel,
      customerGeneratedAtLabel,
      customerLogoAspect,
      partnerLogoAspect,
      parameters.customerName,
      parameters.engagementName,
      parameters.partnerName,
      parameters.customerLogoDataUrl,
      parameters.partnerLogoDataUrl,
    ],
  );
}
