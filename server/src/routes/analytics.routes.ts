import { Router } from 'express';
import { TransactionModel } from '../models/transaction.model.js';
import { categoryQuery, filterQuery, monthlyQuery } from '../schemas/index.js';
import { buildMatch, endOfDay, previousWindow } from '../lib/filters.js';
import { toDecimal } from '../lib/money.js';

export const analyticsRouter = Router();

interface Totals {
  income: number;
  expense: number;
}

/** Income and expense are two series of one chart, so a type filter can't apply. */
const bothTypes = (match: Record<string, unknown>) => {
  const { type: _ignored, ...rest } = match;
  return rest;
};

const SUM_INCOME = { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amountCents', 0] } };
const SUM_EXPENSE = { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amountCents', 0] } };

async function totalsFor(match: Record<string, unknown>): Promise<Totals> {
  const [row] = await TransactionModel.aggregate<Totals & { _id: null }>([
    { $match: match },
    { $group: { _id: null, income: SUM_INCOME, expense: SUM_EXPENSE } },
  ]);
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}

const pctChange = (current: number, before: number): number | null => {
  if (before === 0) return null; // "up from nothing" is not a percentage
  return Math.round(((current - before) / Math.abs(before)) * 1000) / 10;
};

/** Headline numbers for the stat tiles, with the same window a month earlier. */
analyticsRouter.get('/summary', async (req, res) => {
  const query = filterQuery.parse(req.query);
  const match = bothTypes(buildMatch(query));

  const current = await totalsFor(match);
  const savings = current.income - current.expense;

  const window = previousWindow(query.from, query.to);
  let previous: (Totals & { savings: number }) | null = null;
  if (window) {
    const prevTotals = await totalsFor({
      ...match,
      date: { $gte: window.from, $lte: window.to },
    });
    previous = { ...prevTotals, savings: prevTotals.income - prevTotals.expense };
  }

  const days =
    query.from && query.to
      ? Math.max(
          1,
          Math.round((endOfDay(query.to).getTime() - query.from.getTime()) / 86_400_000),
        )
      : null;

  res.json({
    data: {
      income: toDecimal(current.income),
      expense: toDecimal(current.expense),
      savings: toDecimal(savings),
      // Share of income kept. Meaningless with no income, hence null.
      savingsRate: current.income > 0 ? Math.round((savings / current.income) * 1000) / 10 : null,
      avgDailySpend: days ? toDecimal(Math.round(current.expense / days)) : null,
      previous: previous && {
        income: toDecimal(previous.income),
        expense: toDecimal(previous.expense),
        savings: toDecimal(previous.savings),
      },
      change: previous && {
        income: pctChange(current.income, previous.income),
        expense: pctChange(current.expense, previous.expense),
        savings: pctChange(savings, previous.savings),
      },
    },
  });
});

/** Monthly income vs expense, plus the savings each month. */
analyticsRouter.get('/monthly', async (req, res) => {
  const query = monthlyQuery.parse(req.query);
  const match = bothTypes(buildMatch(query));

  // With no explicit window, show the last N months up to today.
  if (!query.from && !query.to) {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - (query.months - 1));
    match.date = { $gte: start };
  }

  const rows = await TransactionModel.aggregate<{ _id: string } & Totals>([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        income: SUM_INCOME,
        expense: SUM_EXPENSE,
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    data: rows.map((row) => ({
      month: row._id,
      income: toDecimal(row.income),
      expense: toDecimal(row.expense),
      savings: toDecimal(row.income - row.expense),
    })),
  });
});

/** Day-by-day series for the spending chart, with a running balance. */
analyticsRouter.get('/daily', async (req, res) => {
  const query = filterQuery.parse(req.query);
  const match = bothTypes(buildMatch(query));

  const rows = await TransactionModel.aggregate<{ _id: string } & Totals>([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        income: SUM_INCOME,
        expense: SUM_EXPENSE,
      },
    },
    { $sort: { _id: 1 } },
  ]);

  let running = 0;
  res.json({
    data: rows.map((row) => {
      running += row.income - row.expense;
      return {
        date: row._id,
        income: toDecimal(row.income),
        expense: toDecimal(row.expense),
        cumulativeSavings: toDecimal(running),
      };
    }),
  });
});

/** Where the money goes: top categories, with everything else folded into Other. */
analyticsRouter.get('/categories', async (req, res) => {
  const query = categoryQuery.parse(req.query);
  const match = buildMatch(query);

  const rows = await TransactionModel.aggregate<{ _id: string; total: number; count: number }>([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amountCents' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const top = rows.slice(0, query.limit);
  const rest = rows.slice(query.limit);

  const entries = top.map((row) => ({
    category: row._id,
    amount: toDecimal(row.total),
    count: row.count,
    share: grandTotal > 0 ? Math.round((row.total / grandTotal) * 1000) / 10 : 0,
  }));

  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, row) => sum + row.total, 0);
    entries.push({
      category: 'Other',
      amount: toDecimal(restTotal),
      count: rest.reduce((sum, row) => sum + row.count, 0),
      share: grandTotal > 0 ? Math.round((restTotal / grandTotal) * 1000) / 10 : 0,
    });
  }

  res.json({ data: { total: toDecimal(grandTotal), entries } });
});
