import type { Filters } from './types';

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Presets cover the ranges people actually ask for; Custom is the escape hatch. */
export const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    },
  },
  {
    label: 'Last month',
    range: () => {
      const now = new Date();
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: 'Last 30 days',
    range: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { from: iso(start), to: iso(now) };
    },
  },
  {
    label: 'Last 3 months',
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(now) };
    },
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    },
  },
];

export const defaultFilters = (): Filters => ({
  ...PRESETS[0]!.range(),
  type: '',
  categories: [],
  q: '',
});
