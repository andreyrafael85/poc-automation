import { assumed } from '../../config/assumptions';
import { PUBLIC_QUERY_USD_PER_GIB } from '../../models/licensing';
import type { Preflight } from './preflight';

/**
 * What using this app is expected to cost, at the public list price (3.4.13, owner's order of 2026-11-19: "esta guia
 * deverá migrar para a página de licenciamento, e gerar uma expectativa de custo do uso do app de forma geral com
 * base no ratecard público"). From the pre-flight's projected visit (`preflight.ts`) and the same model the
 * consumption study measured on the lab tenant (docs/v3.4/CONSUMO-DO-APP.md §5–§6):
 *
 *   billable GiB = the log part + the other part (business events, vulnerabilities, sessions)
 *   ceiling GiB  = everything a visit reads, the Dynatrace Intelligence problems included
 *
 * The problems and events of Dynatrace Intelligence are queried at no charge with Full-Stack Monitoring, so they are
 * out of the billable line and in the ceiling only — for a customer without Full-Stack. Every GiB is priced at the
 * public query price (`PUBLIC_QUERY_USD_PER_GIB`); a log bucket kept with "Retain with included queries" reads its
 * logs at no charge, which the caller says when the window shows no billed log query. In DPS this comes out of the
 * customer's annual commitment, not a separate bill. The PoC's use (people, visits a day, days) lives in the
 * assumptions register. USD here; the Licensing page converts it with the operator's rate card (rule 6).
 */

export interface AppCostUsage {
  people: number;
  visitsPerDay: number;
  days: number;
}

export interface AppCostExpectation {
  /** One full visit: what it reads, what of it is billable, and both priced. */
  visitGiB: number;
  visitBillableGiB: number;
  visitBillableUsd: number;
  visitCeilingUsd: number;
  /** The whole team for one day, and the whole PoC. */
  dayBillableUsd: number;
  dayCeilingUsd: number;
  pocVisits: number;
  pocGiB: number;
  pocBillableUsd: number;
  pocCeilingUsd: number;
  usage: AppCostUsage;
  /** True when the window showed log queries billed (pay-per-query); false when none; null when not read. */
  logsPayPerQuery: boolean | null;
}

export function pocUsage(): AppCostUsage {
  return { people: assumed('consumption.poc.people'), visitsPerDay: assumed('consumption.poc.visitsPerDay'), days: assumed('consumption.poc.days') };
}

/** Null when the pre-flight could not project a visit (the log volume was not read). */
export function appCostExpectation(plan: Preflight, usage: AppCostUsage = pocUsage(), usdPerGib: number = PUBLIC_QUERY_USD_PER_GIB): AppCostExpectation | null {
  if (plan.visitGiB === null || plan.visitLogsGiB === null) return null;
  const visitBillableGiB = plan.visitLogsGiB + plan.visitOtherGiB;
  const visitBillableUsd = visitBillableGiB * usdPerGib;
  const visitCeilingUsd = plan.visitGiB * usdPerGib;
  const perDay = usage.people * usage.visitsPerDay;
  const pocVisits = perDay * usage.days;
  return {
    visitGiB: plan.visitGiB,
    visitBillableGiB,
    visitBillableUsd,
    visitCeilingUsd,
    dayBillableUsd: visitBillableUsd * perDay,
    dayCeilingUsd: visitCeilingUsd * perDay,
    pocVisits,
    pocGiB: plan.visitGiB * pocVisits,
    pocBillableUsd: visitBillableUsd * pocVisits,
    pocCeilingUsd: visitCeilingUsd * pocVisits,
    usage,
    logsPayPerQuery: plan.billedLogQueryGiB === null ? null : plan.billedLogQueryGiB > 0,
  };
}

/** The most this session's reads can have cost, every GiB at the query price (the meter cannot tell what was included). */
export function sessionCeilingUsd(bytes: number, usdPerGib: number = PUBLIC_QUERY_USD_PER_GIB): number {
  return (bytes / 1024 ** 3) * usdPerGib;
}
