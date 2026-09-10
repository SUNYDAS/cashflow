import { money } from '../api';
import { defaultFilters, PRESETS } from '../filterPresets';
import type { Filters, TransactionType } from '../types';

interface Props {
  filters: Filters;
  categories: string[];
  matched: { total: number; income: number; expense: number } | null;
  currency: string;
  onChange: (next: Filters) => void;
}

export function FilterBar({ filters, categories, matched, currency, onChange }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const activePreset = PRESETS.find((preset) => {
    const range = preset.range();
    return range.from === filters.from && range.to === filters.to;
  });

  const toggleCategory = (category: string) =>
    set(
      'categories',
      filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    );

  const extras = (filters.type ? 1 : 0) + filters.categories.length + (filters.q ? 1 : 0);

  return (
    <div className="filters">
      <div className="filter-row">
        <div className="presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={activePreset?.label === preset.label ? 'preset active' : 'preset'}
              onClick={() => onChange({ ...filters, ...preset.range() })}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="inline">
          <span>From</span>
          <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="inline">
          <span>To</span>
          <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
        </label>
      </div>

      <div className="filter-row">
        <label className="inline grow">
          <span>Search</span>
          <input
            type="search"
            placeholder="note or category"
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
          />
        </label>

        <label className="inline">
          <span>Type</span>
          <select
            value={filters.type}
            onChange={(e) => set('type', e.target.value as TransactionType | '')}
          >
            <option value="">All</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
        </label>


        {extras > 0 && (
          <button type="button" className="ghost" onClick={() => onChange(defaultFilters())}>
            Clear ({extras})
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="chips">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={filters.categories.includes(category) ? 'chip on' : 'chip'}
              aria-pressed={filters.categories.includes(category)}
              onClick={() => toggleCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {matched && (
        <p className="matched">
          {matched.total} transaction{matched.total === 1 ? '' : 's'} matched ·{' '}
          <span className="pos">{money(matched.income, currency)} in</span> ·{' '}
          <span className="neg">{money(matched.expense, currency)} out</span>
        </p>
      )}
    </div>
  );
}
