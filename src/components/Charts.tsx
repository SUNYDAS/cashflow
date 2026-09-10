import { useId, useState, type ReactNode } from 'react';
import { dayLabel, money, monthLabel } from '../api';
import type { CategorySlice, DayPoint, MonthPoint } from '../types';

/*
 * Hand-rolled SVG rather than a chart library, so the mark specs hold exactly:
 * 2px surface gaps between adjacent bars, 4px rounded data-ends anchored to the
 * baseline, recessive grid, and a hover layer on every chart.
 *
 * Colours come from CSS custom properties defined in App.css, so light and dark
 * are separate validated steps rather than an automatic flip.
 */

const W = 760;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 30, left: 58 };
const PLOT = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom };

/** Rounds a max up to a friendly axis top so gridlines land on round numbers. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => value <= s * magnitude) ?? 10;
  return step * magnitude;
}

const ticks = (max: number, count = 4) =>
  Array.from({ length: count + 1 }, (_, i) => (max / count) * i);

const shortMoney = (value: number, currency: string) => money(value, currency, true);

interface TipState {
  x: number;
  y: number;
  rows: { label: string; value: string; color?: string }[];
  title: string;
}

/** Shared frame: title, optional legend, table toggle, tooltip surface. */
function ChartFrame({
  title,
  subtitle,
  legend,
  tip,
  table,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  tip: TipState | null;
  table: ReactNode;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className="chart">
      <figcaption>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="chart-tools">
          {legend && legend.length > 1 && (
            <ul className="legend">
              {legend.map((item) => (
                <li key={item.label}>
                  <span className="swatch" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="ghost"
            aria-pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </figcaption>

      {showTable ? (
        <div className="chart-table">{table}</div>
      ) : (
        <div className="chart-body">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
            {children}
          </svg>
          {tip && (
            <div
              className="tooltip"
              style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}
            >
              <strong>{tip.title}</strong>
              {tip.rows.map((row) => (
                <span key={row.label}>
                  {row.color && <i className="swatch" style={{ background: row.color }} />}
                  {row.label}
                  <b>{row.value}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

function Grid({ max, currency }: { max: number; currency: string }) {
  return (
    <g className="grid">
      {ticks(max).map((value) => {
        const y = PAD.top + PLOT.h - (value / max) * PLOT.h;
        return (
          <g key={value}>
            <line x1={PAD.left} x2={PAD.left + PLOT.w} y1={y} y2={y} />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end">
              {shortMoney(value, currency)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ---------- Monthly income vs expense: two categorical series ---------- */

export function MonthlyChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const clip = useId();

  if (data.length === 0) return <EmptyChart title="Income vs expenses" />;

  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense]), 1));
  const slot = PLOT.w / data.length;
  // 2px surface gap between the paired bars, and a breathing gap between months.
  const barW = Math.max(4, Math.min(26, slot / 2 - 5));

  return (
    <ChartFrame
      title="Income vs expenses"
      subtitle="Trailing months — ignores the date filter so the trend stays visible"
      legend={[
        { label: 'Income', color: 'var(--series-1)' },
        { label: 'Expenses', color: 'var(--series-2)' },
      ]}
      tip={tip}
      table={<MonthTable data={data} currency={currency} />}
    >
      <clipPath id={clip}>
        <rect x={PAD.left} y={PAD.top} width={PLOT.w} height={PLOT.h} />
      </clipPath>
      <Grid max={max} currency={currency} />

      {data.map((point, i) => {
        const centre = PAD.left + slot * i + slot / 2;
        const bars = [
          { key: 'income', value: point.income, color: 'var(--series-1)', x: centre - barW - 1 },
          { key: 'expense', value: point.expense, color: 'var(--series-2)', x: centre + 1 },
        ];
        return (
          <g key={point.month}>
            <rect
              className="hit"
              x={PAD.left + slot * i}
              y={PAD.top}
              width={slot}
              height={PLOT.h}
              onMouseEnter={() =>
                setTip({
                  x: centre,
                  y: PAD.top,
                  title: monthLabel(point.month),
                  rows: [
                    { label: 'Income', value: money(point.income, currency), color: 'var(--series-1)' },
                    { label: 'Expenses', value: money(point.expense, currency), color: 'var(--series-2)' },
                    { label: 'Saved', value: money(point.savings, currency) },
                  ],
                })
              }
              onMouseLeave={() => setTip(null)}
            />
            {bars.map((bar) => {
              const h = (bar.value / max) * PLOT.h;
              return (
                <rect
                  key={bar.key}
                  x={bar.x}
                  y={PAD.top + PLOT.h - h}
                  width={barW}
                  height={Math.max(h, bar.value > 0 ? 2 : 0)}
                  rx={4}
                  fill={bar.color}
                  clipPath={`url(#${clip})`}
                />
              );
            })}
            <text className="axis" x={centre} y={H - 10} textAnchor="middle">
              {monthLabel(point.month)}
            </text>
          </g>
        );
      })}
    </ChartFrame>
  );
}

/* ---------- Savings per month: diverging around a zero baseline ---------- */

export function SavingsChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  const [tip, setTip] = useState<TipState | null>(null);

  if (data.length === 0) return <EmptyChart title="Savings per month" />;

  const max = niceMax(Math.max(...data.map((d) => Math.abs(d.savings)), 1));
  const zeroY = PAD.top + PLOT.h / 2;
  const slot = PLOT.w / data.length;
  const barW = Math.max(6, Math.min(38, slot - 10));
  const half = PLOT.h / 2;

  return (
    <ChartFrame
      title="Savings per month"
      subtitle="Income minus expenses. Below the line means the month ran a deficit."
      tip={tip}
      table={<MonthTable data={data} currency={currency} savingsOnly />}
    >
      <g className="grid">
        {[max, max / 2, 0, -max / 2, -max].map((value) => {
          const y = zeroY - (value / max) * half;
          return (
            <g key={value}>
              <line x1={PAD.left} x2={PAD.left + PLOT.w} y1={y} y2={y} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end">
                {shortMoney(value, currency)}
              </text>
            </g>
          );
        })}
      </g>
      <line className="baseline" x1={PAD.left} x2={PAD.left + PLOT.w} y1={zeroY} y2={zeroY} />

      {data.map((point, i) => {
        const centre = PAD.left + slot * i + slot / 2;
        const h = (Math.abs(point.savings) / max) * half;
        const positive = point.savings >= 0;
        return (
          <g key={point.month}>
            <rect
              x={centre - barW / 2}
              y={positive ? zeroY - h : zeroY}
              width={barW}
              height={Math.max(h, 2)}
              rx={4}
              fill={positive ? 'var(--pos)' : 'var(--neg)'}
              onMouseEnter={() =>
                setTip({
                  x: centre,
                  y: positive ? zeroY - h : zeroY + h,
                  title: monthLabel(point.month),
                  rows: [
                    {
                      label: positive ? 'Saved' : 'Overspent',
                      value: money(Math.abs(point.savings), currency),
                      color: positive ? 'var(--pos)' : 'var(--neg)',
                    },
                  ],
                })
              }
              onMouseLeave={() => setTip(null)}
            />
            <text className="axis" x={centre} y={H - 10} textAnchor="middle">
              {monthLabel(point.month)}
            </text>
          </g>
        );
      })}
    </ChartFrame>
  );
}

/* ---------- Daily spend: single series over the filtered window ---------- */

export function DailyChart({ data, currency }: { data: DayPoint[]; currency: string }) {
  const [tip, setTip] = useState<TipState | null>(null);

  if (data.length === 0) return <EmptyChart title="Daily spending" />;

  const max = niceMax(Math.max(...data.map((d) => d.expense), 1));
  const slot = PLOT.w / data.length;
  const barW = Math.max(2, slot - 2);

  return (
    <ChartFrame
      title="Daily spending"
      subtitle="Every day in the selected range"
      tip={tip}
      table={<DayTable data={data} currency={currency} />}
    >
      <Grid max={max} currency={currency} />
      {data.map((point, i) => {
        const h = (point.expense / max) * PLOT.h;
        const x = PAD.left + slot * i;
        return (
          <rect
            key={point.date}
            x={x}
            y={PAD.top + PLOT.h - h}
            width={barW}
            height={Math.max(h, point.expense > 0 ? 2 : 0)}
            rx={barW > 6 ? 4 : 1}
            fill="var(--series-2)"
            onMouseEnter={() =>
              setTip({
                x: x + barW / 2,
                y: PAD.top + PLOT.h - h,
                title: dayLabel(point.date),
                rows: [
                  { label: 'Spent', value: money(point.expense, currency), color: 'var(--series-2)' },
                  ...(point.income > 0
                    ? [{ label: 'Received', value: money(point.income, currency) }]
                    : []),
                ],
              })
            }
            onMouseLeave={() => setTip(null)}
          />
        );
      })}
      {[data[0], data[data.length - 1]].map((point, i) =>
        point ? (
          <text
            key={point.date + i}
            className="axis"
            x={i === 0 ? PAD.left : PAD.left + PLOT.w}
            y={H - 10}
            textAnchor={i === 0 ? 'start' : 'end'}
          >
            {dayLabel(point.date)}
          </text>
        ) : null,
      )}
    </ChartFrame>
  );
}

/* ---------- Category breakdown: magnitude, so one hue light -> dark ---------- */

const RAMP = ['#0d366b', '#184f95', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#86b6ef', '#9ec5f4'];

export function CategoryChart({
  entries,
  total,
  currency,
}: {
  entries: CategorySlice[];
  total: number;
  currency: string;
}) {
  if (entries.length === 0) return <EmptyChart title="Where the money goes" />;

  const max = Math.max(...entries.map((e) => e.amount), 1);

  return (
    <figure className="chart">
      <figcaption>
        <div>
          <h3>Where the money goes</h3>
          <p>Top expense categories · {money(total, currency)} total</p>
        </div>
      </figcaption>
      {/* Horizontal bars: long category names read straight, and the value sits
          directly on each row so the chart needs no legend or hover to be read. */}
      <ul className="cat-bars">
        {entries.map((entry, i) => (
          <li key={entry.category}>
            <span className="cat-name" title={entry.category}>
              {entry.category}
            </span>
            <span className="cat-track">
              <span
                className="cat-fill"
                style={{
                  width: `${Math.max((entry.amount / max) * 100, 1.5)}%`,
                  background: RAMP[Math.min(i, RAMP.length - 1)],
                }}
              />
            </span>
            <span className="cat-value">{money(entry.amount, currency)}</span>
            <span className="cat-share">{entry.share}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------- table views (the accessibility fallback) ---------- */

function MonthTable({
  data,
  currency,
  savingsOnly,
}: {
  data: MonthPoint[];
  currency: string;
  savingsOnly?: boolean;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>Month</th>
          {!savingsOnly && <th>Income</th>}
          {!savingsOnly && <th>Expenses</th>}
          <th>Savings</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.month}>
            <td>{monthLabel(row.month)}</td>
            {!savingsOnly && <td>{money(row.income, currency)}</td>}
            {!savingsOnly && <td>{money(row.expense, currency)}</td>}
            <td className={row.savings >= 0 ? 'pos' : 'neg'}>{money(row.savings, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DayTable({ data, currency }: { data: DayPoint[]; currency: string }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Spent</th>
          <th>Received</th>
          <th>Running</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.date}>
            <td>{dayLabel(row.date)}</td>
            <td>{money(row.expense, currency)}</td>
            <td>{row.income ? money(row.income, currency) : '—'}</td>
            <td className={row.cumulativeSavings >= 0 ? 'pos' : 'neg'}>
              {money(row.cumulativeSavings, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyChart({ title }: { title: string }) {
  return (
    <figure className="chart">
      <figcaption>
        <h3>{title}</h3>
      </figcaption>
      <p className="empty">No data in this range.</p>
    </figure>
  );
}
