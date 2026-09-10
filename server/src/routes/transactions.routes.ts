import { Router } from 'express';
import { TransactionModel } from '../models/transaction.model.js';
import { createTransactionBody, idParam, listQuery, updateTransactionBody } from '../schemas/index.js';
import { notFound } from '../lib/http.js';
import { buildMatch } from '../lib/filters.js';
import { toCents, toDecimal } from '../lib/money.js';
import { transactionJson } from '../lib/serialize.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', async (req, res) => {
  const query = listQuery.parse(req.query);
  const match = buildMatch(query);

  const sortField = query.sort === 'amount' ? 'amountCents' : query.sort;
  const direction = query.order === 'asc' ? 1 : -1;

  const [rows, total, totals] = await Promise.all([
    TransactionModel.find(match)
      .sort({ [sortField]: direction, _id: direction })
      .skip(query.skip)
      .limit(query.limit),
    TransactionModel.countDocuments(match),
    // Totals cover the whole filtered set, not just the page on screen.
    TransactionModel.aggregate<{ _id: string; total: number }>([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amountCents' } } },
    ]),
  ]);

  const sumOf = (type: string) => totals.find((t) => t._id === type)?.total ?? 0;

  res.json({
    data: rows.map(transactionJson),
    meta: {
      total,
      limit: query.limit,
      skip: query.skip,
      income: toDecimal(sumOf('income')),
      expense: toDecimal(sumOf('expense')),
    },
  });
});

transactionsRouter.post('/', async (req, res) => {
  const body = createTransactionBody.parse(req.body);
  const tx = await TransactionModel.create({
    type: body.type,
    amountCents: toCents(body.amount),
    category: body.category,
    note: body.note,
    date: body.date ?? new Date(),
  });
  res.status(201).json({ data: transactionJson(tx) });
});

transactionsRouter.patch('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateTransactionBody.parse(req.body);
  const tx = await TransactionModel.findById(id);
  if (!tx) throw notFound('Transaction');

  if (body.type !== undefined) tx.type = body.type;
  if (body.amount !== undefined) tx.amountCents = toCents(body.amount);
  if (body.category !== undefined) tx.category = body.category;
  if (body.note !== undefined) tx.note = body.note;
  if (body.date !== undefined) tx.date = body.date;

  await tx.save();
  res.json({ data: transactionJson(tx) });
});

transactionsRouter.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const tx = await TransactionModel.findById(id);
  if (!tx) throw notFound('Transaction');
  await tx.deleteOne();
  res.status(204).end();
});

/** Powers the category chips in the filter bar. */
transactionsRouter.get('/meta/categories', async (_req, res) => {
  const categories = await TransactionModel.distinct('category');
  res.json({ data: { categories: categories.filter(Boolean).sort() } });
});
