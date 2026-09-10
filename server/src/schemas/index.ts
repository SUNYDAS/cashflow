import { z } from 'zod';
import { TRANSACTION_TYPES } from '../models/transaction.model.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-character id');
const money = z.number().positive().max(10_000_000).multipleOf(0.01);

export const idParam = z.object({ id: objectId });

export const createTransactionBody = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: money,
  category: z.string().trim().min(1).max(60),
  note: z.string().trim().max(300).optional(),
  date: z.coerce.date().optional(),
});

export const updateTransactionBody = createTransactionBody.partial();

/** One shared filter shape: the table and every chart read the same window. */
export const filterQuery = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(120).optional(),
});

export const listQuery = filterQuery.extend({
  sort: z.enum(['date', 'amount', 'category']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  skip: z.coerce.number().int().min(0).default(0),
});

export const monthlyQuery = filterQuery.extend({
  months: z.coerce.number().int().min(1).max(60).default(12),
});

export const categoryQuery = filterQuery.extend({
  type: z.enum(TRANSACTION_TYPES).default('expense'),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

export type FilterQuery = z.infer<typeof filterQuery>;
