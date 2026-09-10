import { money } from '../api';
import type { Summary } from '../types';

/**
 * A KPI row of stat tiles, not a chart: four headline numbers, each with the
 * change against the previous window of the same length.
 */
export function StatTiles({ summary, currency }: { summary: Summary; currency: string }) {
  const tiles = [
    {
      label: 'Income',
      value: money(summary.income, currency),
      change: summary.change?.income ?? null,
      // More income is good; more spending is not.
      goodWhenUp: true,
    },
    {
      label: 'Expenses',
      value: money(summary.expense, currency),
      change: summary.change?.expense ?? null,
      goodWhenUp: false,
    },
    {
      label: 'Saved',
      value: money(summary.savings, currency),
      change: summary.change?.savings ?? null,
      goodWhenUp: true,
      emphasis: true,
    },
    {
      label: 'Savings rate',
      value: summary.savingsRate === null ? '—' : `${summary.savingsRate}%`,
      change: null,
      goodWhenUp: true,
      hint:
        summary.avgDailySpend === null
          ? undefined
          : `${money(summary.avgDailySpend, currency)} a day`,
    },
  ];

  return (
    <div className="tiles">
      {tiles.map((tile) => {
        const up = tile.change !== null && tile.change > 0;
        const good = tile.change === null ? null : up === tile.goodWhenUp;
        return (
          <div key={tile.label} className={tile.emphasis ? 'tile lead' : 'tile'}>
            <span className="tile-label">{tile.label}</span>
            <strong className="tile-value">{tile.value}</strong>
            {tile.change !== null ? (
              <span className={good ? 'delta good' : 'delta bad'}>
                {/* Arrow plus sign, never colour alone. */}
                {up ? '▲' : '▼'} {Math.abs(tile.change)}% vs previous
              </span>
            ) : (
              <span className="delta muted">{tile.hint ?? 'no earlier period'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
