import React from "react";

import { MessageContainer } from "@dynatrace/strato-components/content";
import { Flex } from "@dynatrace/strato-components/layouts";
import {
  DataTable,
  type DataTableColumnDef,
} from "@dynatrace/strato-components/tables";
import {
  Heading,
  Paragraph,
  Text,
} from "@dynatrace/strato-components/typography";

import { DatabaseIcon } from "@dynatrace/strato-icons";

import { PageSummary, type SummaryItem } from "../components/PageSummary";
import { TrendChart } from "../components/TrendChart";
import type { SpectrumFamily } from "../components/spectrum";
import { toBucketContext, toQualityRows, type QualityRow } from "../models/logQuality";
import { PALETTE } from "../design/palette";
import { useSummaryFact } from "../hooks/useSummaryFact";
import { CatalogTable } from "../components/CatalogTable";
import { DqlDisclosure } from "../components/DqlDisclosure";
import { AssistPanel } from "../components/AssistPanel";
import { CockpitRow } from "../engine/chart/CockpitRow";
import { SectionIntro } from "../components/SectionIntro";
import { QueryStateBoundary } from "../components/QueryStateBoundary";
import { useQueryScope } from "../config/StudioContext";
import { useCatalogQuery } from "../hooks/useCatalogQuery";
import { getQuery } from "../queries/catalog";
import {
  bool,
  num,
  ratio,
  str,
  type GrailRecord,
} from "../utils/records";
import { formatBytes } from "../utils/time";
import { BucketRetention } from "../features/logs/BucketRetention";
import { ErrorConsole } from "../features/logs/ErrorConsole";
import { useTranslation, type Translation } from "../i18n/useTranslation";
import { Callout, Panel, Stack } from '../engine';
import { decimal } from '../utils/activeLocale';
import { assumed } from '../config/assumptions';
import { logTrendSeries } from "../features/trends/trendSeries";

/**
 * Logs and data quality.
 *
 * The distinction this page makes is between storing logs and being able to use
 * them. Volume alone is a cost; volume with topology context is an asset. Both
 * are measured here, and the gap between them is the finding.
 *
 * No retention, deletion or pipeline change is ever executed from this app.
 */

const qualityColumns = (
  t: Translation["t"],
  formatCount: Translation['formatCount'],
  formatRatio: Translation['formatRatio'],
): DataTableColumnDef<QualityRow>[] => [
  {
    id: "status",
    header: t("p.logs.h.severity"),
    accessor: "status",
    width: "1fr",
  },
  {
    id: "total",
    header: t("common.records"),
    accessor: "total",
    width: 150,
    alignment: "right",
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatCount(rowData.total)}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: "withService",
    header: t("p.logs.h.withService"),
    accessor: "withService",
    width: 190,
    alignment: "right",
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatRatio(ratio(rowData.withService, rowData.total))}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: "withHost",
    header: t("p.logs.h.withHost"),
    accessor: "withHost",
    width: 190,
    alignment: "right",
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatRatio(ratio(rowData.withHost, rowData.total))}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: "withK8sNamespace",
    header: t("p.logs.h.withNamespace"),
    accessor: "withK8sNamespace",
    width: 210,
    alignment: "right",
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatRatio(ratio(rowData.withK8sNamespace, rowData.total))}
      </DataTable.DefaultCell>
    ),
  },
];

interface BucketRow extends GrailRecord {
  name: string;
  records: number | null;
  retentionDays: number | null;
  bytes: number | null;
  readable: string;
}

const bucketColumns = (
  t: Translation["t"],
  formatCount: Translation['formatCount'],
): DataTableColumnDef<BucketRow>[] => [
  { id: "name", header: t("common.bucket"), accessor: "name", width: "1.6fr" },
  {
    id: "records",
    header: t("common.records"),
    accessor: "records",
    width: 160,
    alignment: "right",
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatCount(rowData.records)}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: "bytes",
    header: t("common.uncompressed"),
    accessor: "bytes",
    width: 150,
    alignment: "right",
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {formatBytes(rowData.bytes)}
      </DataTable.DefaultCell>
    ),
  },
  {
    id: "retentionDays",
    header: t("common.retentionDays"),
    accessor: "retentionDays",
    width: 160,
    alignment: "right",
  },
  {
    id: "readable",
    header: t("common.readable"),
    accessor: "readable",
    width: 120,
  },
];

const toBucketRows = (records: GrailRecord[]): BucketRow[] =>
  records.map((record) => ({
    ...record,
    name: str(record, "name") ?? "—",
    records: num(record, "records"),
    retentionDays: num(record, "retentionDays"),
    bytes: num(record, "bytes"),
    readable: bool(record, "hasAccess") === true ? "Yes" : "No",
  }));

interface SfmRow extends GrailRecord {
  kind: string;
  type: string;
  occurrences: number | null;
}

const sfmColumns = (t: Translation["t"]): DataTableColumnDef<SfmRow>[] => [
  { id: "kind", header: t("common.signal"), accessor: "kind", width: "1fr" },
  { id: "type", header: t("common.type"), accessor: "type", width: "1.4fr" },
  {
    id: "occurrences",
    header: t("common.occurrences"),
    accessor: "occurrences",
    width: 150,
    alignment: "right",
  },
];

const toSfmRows = (records: GrailRecord[]): SfmRow[] =>
  records.map((record) => ({
    ...record,
    kind: str(record, "event.kind") ?? "—",
    type: str(record, "event.type") ?? "Not reported",
    occurrences: num(record, "occurrences"),
  }));

export const LogsAndDataQuality = () => {
  const { t, tWindow, formatNumber, formatCount, formatRatio } = useTranslation();
  const scope = useQueryScope();
  const quality = useCatalogQuery("log.quality", scope);
  const logBuckets = useCatalogQuery("log.buckets", scope);
  const ingest = useCatalogQuery("log.ingest", scope);
  const factFrom = useSummaryFact();

  const bytesFor = (type: string): number | null => {
    if (ingest.outcome !== "ok") return null;
    const row = ingest.records.find(
      (record) => str(record, "event.type") === type,
    );
    return num(row, "bytes");
  };
  const ingestedBytes = bytesFor(
    "Log Management & Analytics - Ingest & Process",
  );
  const queriedBytes = bytesFor("Log Management & Analytics - Query");

  const rows = toQualityRows(quality.records);
  const bucketContext = toBucketContext(quality.records);
  const totalRecords = rows.reduce((total, row) => total + (row.total ?? 0), 0);
  const withService = rows.reduce(
    (total, row) => total + (row.withService ?? 0),
    0,
  );
  const unclassified = rows
    .filter((row) => row.status === "NONE" || row.status === "Not classified")
    .reduce((total, row) => total + (row.total ?? 0), 0);

  const serviceContext = ratio(withService, totalRecords);
  const unclassifiedShare = ratio(unclassified, totalRecords);

  const storedRecords = logBuckets.records.reduce(
    (total, record) => total + (num(record, "records") ?? 0),
    0,
  );

  // Dynatrace Assist — where a platform/observability engineer should act on log value first.
  const logsAssist: string[] = [];
  if (quality.outcome === "ok") {
    if (serviceContext !== null) {
      logsAssist.push(
        t("p.logs.assist.s.context", {
          pct: formatNumber(Number(serviceContext.percent.toFixed(1))),
          records: formatNumber(totalRecords),
        }),
      );
    }
    if (unclassifiedShare !== null && unclassifiedShare.percent > 0) {
      logsAssist.push(
        t("p.logs.assist.s.unclassified", {
          pct: formatNumber(Number(unclassifiedShare.percent.toFixed(1))),
        }),
      );
    }
  }
  if (ingestedBytes !== null) {
    logsAssist.push(t("p.logs.assist.s.ingest", { bytes: formatBytes(ingestedBytes) }));
  }

  /**
   * The whole argument of this page in four figures: a lot is stored, almost
   * none of it carries context, and the cost of both is identical.
   *
   * The context share carries the tone rather than the volume: high volume is
   * not a problem, high volume without context is.
   */
  const headline: SummaryItem[] = [
    {
      key: "stored",
      label: t("p.logs.band.stored"),
      fact: factFrom(
        logBuckets,
        logBuckets.outcome === "ok" ? storedRecords : null,
      ),
      display:
        logBuckets.outcome === "ok" ? formatNumber(storedRecords) : undefined,
      detail: t("p.logs.band.storedDetail", {
        buckets: logBuckets.records.length,
      }),
    },
    {
      key: "ingested",
      label: t("p.logs.band.ingested"),
      fact: factFrom(ingest, ingestedBytes),
      display: formatBytes(ingestedBytes),
      detail: t("p.logs.band.ingestedDetail"),
    },
    {
      key: "queried",
      label: t("p.logs.band.queried"),
      fact: factFrom(ingest, queriedBytes),
      display: formatBytes(queriedBytes),
      detail: t("p.logs.band.queriedDetail"),
      // Scanning several times what you ingest is the finding, not the volume.
      tone:
        ingestedBytes !== null &&
        queriedBytes !== null &&
        queriedBytes > ingestedBytes * 2
          ? PALETTE.review
          : PALETTE.absent,
    },
    {
      key: "sampled",
      label: t("p.logs.band.sampled"),
      fact: factFrom(quality, quality.outcome === "ok" ? totalRecords : null),
      display:
        quality.outcome === "ok" ? formatNumber(totalRecords) : undefined,
      detail: t("p.logs.band.sampledDetail"),
    },
    {
      key: "context",
      label: t("p.logs.band.context"),
      fact: factFrom(
        quality,
        serviceContext === null
          ? null
          : Number(serviceContext.percent.toFixed(2)),
        { calculation: t("p.logs.band.contextCalc"), unit: "%" },
      ),
      display:
        serviceContext === null
          ? undefined
          : `${decimal(serviceContext.percent, 2)}%`,
      detail: t("p.logs.band.contextDetail"),
      tone:
        serviceContext !== null && serviceContext.percent < assumed('findings.logContext.low')
          ? PALETTE.review
          : PALETTE.good,
    },
    {
      key: "unclassified",
      label: t("p.logs.band.unclassified"),
      fact: factFrom(
        quality,
        unclassifiedShare === null
          ? null
          : Number(unclassifiedShare.percent.toFixed(1)),
        { calculation: t("p.logs.band.unclassifiedCalc"), unit: "%" },
      ),
      display:
        unclassifiedShare === null
          ? undefined
          : `${decimal(unclassifiedShare.percent, 1)}%`,
      detail: t("p.logs.band.unclassifiedDetail"),
      tone:
        unclassifiedShare !== null && unclassifiedShare.percent > assumed('findings.unclassified.high')
          ? PALETTE.review
          : PALETTE.good,
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.logs.title"
        questionKey="p.logs.question"
        takeawayKey="p.logs.takeaway"
      />

      <PageSummary items={headline} footnote={t("p.logs.band.footnote")} />

      {/* 3.6.3 (v6): the three tiles that repeated the band above (records, service context, severity) left the page; the
          boundary still says when the quality read was refused or failed. */}
      <QueryStateBoundary result={quality} permissionImpact={t("st.logs.perm")}>{null}</QueryStateBoundary>

      {/* 3.2.3: how much context each bucket's logs carry, over every readable bucket (C12). */}
      {quality.outcome === "ok" && bucketContext.length > 0 && (
        <Panel as="section" pad="roomy" className="pvs-spec-band">
          <span className="pvs-spec-band__edge" aria-hidden="true" />
          <Stack gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t("p.logs.ctx.title")}
              </Heading>
              <Text className="pvs-caption">{t("p.logs.ctx.caption", { window: tWindow(quality.timeframe.label) })}</Text>
            </Stack>
            <div className="pvs-logctx">
              {bucketContext.map((row) => (
                <article key={row.bucket} className="pvs-logctx__bucket">
                  <div className="pvs-logctx__head">
                    <span className="pvs-inv__icon pvs-logctx__icon" data-spectrum="blue-turquoise" aria-hidden="true">
                      <DatabaseIcon />
                    </span>
                    <div className="pvs-stack" style={{ "--pvs-gap": "var(--dt-spacings-size-2)" } as React.CSSProperties}>
                      <Text className="pvs-logctx__name">{row.bucket}</Text>
                      <Text className="pvs-caption">{t("p.logs.ctx.records", { count: formatNumber(row.total) })}</Text>
                    </div>
                  </div>
                  <ContextMeter label={t("p.logs.h.withService")} part={row.withService} total={row.total} family="turquoise" />
                  <ContextMeter label={t("p.logs.h.withHost")} part={row.withHost} total={row.total} family="purple" />
                  <ContextMeter label={t("p.logs.h.withNamespace")} part={row.withK8sNamespace} total={row.total} family="blue" />
                </article>
              ))}
            </div>
          </Stack>
        </Panel>
      )}

      {/* 3.3.10: the ingest trend beside the Assist, as a cockpit row. */}
      <CockpitRow data-testid="logs-cockpit">
        <Stack as="section" gap="group">
          <Heading level={3} as="h2">{t("p.logs.trend.title")}</Heading>
          <TrendChart
            queryId="log.ingest.trend"
            minWidth={420}
            series={logTrendSeries(t)}
          />
        </Stack>
        {logsAssist.length > 0 && (
          <AssistPanel
            eyebrow={t("assist.tech.eyebrow")}
            title={t("p.logs.assist.title")}
            sentences={logsAssist}
            note={t("assist.tech.note")}
          />
        )}
      </CockpitRow>

      {/* 3.6.4 (v6): the most recent error records as console lines. */}
      <ErrorConsole />

      {serviceContext !== null && serviceContext.percent < assumed('findings.logContext.veryLow') && (
        <MessageContainer variant="warning">
          <MessageContainer.Title>
            {t("p.logs.noContextTitle")}
          </MessageContainer.Title>
          <MessageContainer.Description>
            <Flex flexDirection="column" gap={4}>
              <Paragraph>
                {t("p.logs.onlyPct", { pct: formatRatio(serviceContext) })}
              </Paragraph>
              <Text>{t("p.logs.noContextRec")}</Text>
            </Flex>
          </MessageContainer.Description>
        </MessageContainer>
      )}

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t("p.logs.severityMix")}</Heading>
        <CatalogTable<QualityRow>
          queryId="log.quality"
          columns={qualityColumns(t, formatCount, formatRatio)}
          transform={toQualityRows}
        />
      </Flex>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t("p.logs.ingestQuality")}</Heading>
        <Paragraph>{t("p.logs.ingestQualityBody")}</Paragraph>
        <CatalogTable<SfmRow>
          queryId="log.sfm"
          columns={sfmColumns(t)}
          transform={toSfmRows}
        />
      </Flex>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t("p.logs.buckets")}</Heading>
        <Callout kind="note" title={t("p.logs.neverChangesTitle")}>
          {t("p.logs.neverChangesBody")}
        </Callout>
        {/* 3.6.3 (v6): each bucket's volume and retention as bars, above the full table. */}
        {logBuckets.outcome === "ok" && <BucketRetention records={logBuckets.records} fact={factFrom(logBuckets, storedRecords)} />}
        <CatalogTable<BucketRow>
          queryId="log.buckets"
          columns={bucketColumns(t, formatCount)}
          transform={toBucketRows}
          summary={() => <Text>{t("p.logs.emptyBuckets")}</Text>}
        />
      </Flex>

      <DqlDisclosure
        entries={[
          getQuery("log.quality"),
          getQuery("log.ingest"),
          getQuery("log.ingest.trend"),
          getQuery("log.sfm"),
          getQuery("log.buckets"),
        ]}
      />
    </Stack>
  );
};

/** One share of a bucket's records as a Spectrum meter: the label, the bar and the share as text. */
const ContextMeter = ({ label, part, total, family }: { label: string; part: number; total: number; family: SpectrumFamily }) => {
  const { formatDecimal } = useTranslation();
  const pct = total > 0 ? (part / total) * 100 : 0;
  return (
    <div className="pvs-logctx__meter" data-spectrum={family}>
      <Text className="pvs-caption">{label}</Text>
      <span className="pvs-rank__track" aria-hidden="true">
        <span className="pvs-rank__fill" style={{ display: "block", width: `${Math.max(pct > 0 ? 1.5 : 0, pct)}%` }} />
      </span>
      <Text className="pvs-logctx__share">{formatDecimal(pct, pct > 0 && pct < 1 ? 2 : 1)}%</Text>
    </div>
  );
};
