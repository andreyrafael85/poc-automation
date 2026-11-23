import React from 'react';

import { useTranslation } from '../../i18n/useTranslation';
import { STATUS_LABEL, type ChartStatus } from './status';
import './chart.css';

export interface ActionRow {
  key: string;
  entity: string;
  signal: string;
  /** 0–1: how far the value reaches toward the row's scale, for the bar beside the signal. */
  share: number;
  measured: string;
  /** The value against its line, signed ("+3.8 pp", "−0.4 pp"). */
  versus: string;
  status: ChartStatus;
  /** The chip's words when the row is not read against a line (a PoC objective: "Met", "Not yet"). */
  statusText?: string;
  /** Where the row's evidence is (a page of the app), when there is one. */
  href?: string;
}

export interface ActionTableProps {
  rows: readonly ActionRow[];
  caption: string;
  headers: { entity: string; signal: string; measured: string; versus: string; status: string };
}

/**
 * "Where to act first" (3.3.7): one table of the measured values that crossed — or come close
 * to — their review line, worst first, each with an inline bar, the distance to the line and a
 * status chip in words. A plain semantic table, so a screen reader reads it as one.
 */
export const ActionTable = ({ rows, caption, headers }: ActionTableProps) => {
  const { t } = useTranslation();
  if (rows.length === 0) return null;
  return (
    <div className="pvs-actions">
      <table className="pvs-actions__table">
        <caption className="pvs-sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{headers.entity}</th>
            <th scope="col">{headers.signal}</th>
            <th scope="col" className="pvs-actions__num">
              {headers.measured}
            </th>
            <th scope="col" className="pvs-actions__num">
              {headers.versus}
            </th>
            <th scope="col">{headers.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} data-status={row.status}>
              <th scope="row" className="pvs-actions__entity" title={row.entity}>
                {row.href === undefined ? (
                  row.entity
                ) : (
                  <a href={row.href} className="pvs-actions__link">
                    {row.entity}
                  </a>
                )}
              </th>
              <td>
                <span className="pvs-actions__signal">
                  {row.signal}
                  <span className="pvs-actions__bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(Math.min(1, Math.max(0, row.share)) * 100)}%` }} />
                  </span>
                </span>
              </td>
              <td className="pvs-actions__num">{row.measured}</td>
              <td className="pvs-actions__num pvs-actions__versus">{row.versus}</td>
              <td>
                <span className="pvs-actions__chip">{row.statusText ?? t(STATUS_LABEL[row.status])}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
