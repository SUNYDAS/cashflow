import { TransactionModel } from './models/transaction.model.js';
import { toCents } from './lib/money.js';

/**
 * Builds ~8 months of plausible personal finance history so the dashboard has
 * something to show. Deterministic: the same seed produces the same data.
 */
const MONTHS_BACK = 8;

const EXPENSES: { category: string; min: number; max: number; perMonth: number }[] = [
  { category: 'Rent', min: 18000, max: 18000, perMonth: 1 },
  { category: 'Groceries', min: 250, max: 3200, perMonth: 9 },
  { category: 'Eating out', min: 120, max: 1400, perMonth: 6 },
  { category: 'Transport', min: 40, max: 900, perMonth: 8 },
  { category: 'Utilities', min: 600, max: 2800, perMonth: 2 },
  { category: 'Shopping', min: 400, max: 9000, perMonth: 3 },
  { category: 'Health', min: 200, max: 4500, perMonth: 1 },
  { category: 'Subscriptions', min: 99, max: 799, perMonth: 3 },
  { category: 'Travel', min: 2500, max: 26000, perMonth: 0.4 },
];

const NOTES: Record<string, string[]> = {
  Rent: ['Monthly rent'],
  Groceries: ['Supermarket run', 'Corner shop', 'Weekly shop', 'Market'],
  'Eating out': ['Lunch with team', 'Dinner', 'Coffee', 'Takeaway'],
  Transport: ['Metro card', 'Auto', 'Cab', 'Petrol'],
  Utilities: ['Electricity', 'Internet', 'Water'],
  Shopping: ['Clothes', 'Headphones', 'Home bits', 'Gift'],
  Health: ['Pharmacy', 'Dentist', 'Gym'],
  Subscriptions: ['Streaming', 'Cloud storage', 'Music'],
  Travel: ['Flights', 'Hotel', 'Weekend trip'],
};

/** Small deterministic PRNG so reseeding gives identical charts. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export async function seedDemoData() {
  await TransactionModel.deleteMany({});

  const random = makeRandom(20260910);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!;
  const between = (min: number, max: number) => min + random() * (max - min);

  const rows: {
    type: 'income' | 'expense';
    amountCents: number;
    category: string;
    note?: string;
    date: Date;
  }[] = [];

  const now = new Date();

  for (let back = MONTHS_BACK - 1; back >= 0; back--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = back === 0 ? now.getDate() : daysInMonth;

    // Salary is credited on the 1st, so a part-way-through month still shows it.
    if (lastDay >= 1) {
      rows.push({
        type: 'income',
        amountCents: toCents(back >= 4 ? 86000 : 95000),
        category: 'Salary',
        note: 'Monthly salary',
        date: new Date(year, month, 1, 9, 0),
      });
    }

    // Occasional side income.
    if (random() < 0.55) {
      rows.push({
        type: 'income',
        amountCents: toCents(Math.round(between(6000, 45000))),
        category: 'Freelance',
        note: 'Side project',
        date: new Date(year, month, Math.min(lastDay, 1 + Math.floor(random() * 25)), 14, 0),
      });
    }

    for (const spec of EXPENSES) {
      // A fractional perMonth means "some months only".
      const count =
        spec.perMonth < 1
          ? random() < spec.perMonth
            ? 1
            : 0
          : Math.max(1, Math.round(spec.perMonth * (0.75 + random() * 0.5)));

      for (let i = 0; i < count; i++) {
        const day = spec.category === 'Rent' ? 1 : 1 + Math.floor(random() * lastDay);
        if (day > lastDay) continue;
        rows.push({
          type: 'expense',
          amountCents: toCents(Math.round(between(spec.min, spec.max) * 100) / 100),
          category: spec.category,
          note: pick(NOTES[spec.category] ?? ['']),
          date: new Date(year, month, day, 12, 0),
        });
      }
    }
  }

  await TransactionModel.insertMany(rows);

  const income = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amountCents, 0);
  const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amountCents, 0);

  return {
    count: rows.length,
    months: MONTHS_BACK,
    income: income / 100,
    expense: expense / 100,
    savings: (income - expense) / 100,
  };
}
