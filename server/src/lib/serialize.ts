import type { TransactionDoc } from '../models/transaction.model.js';
import { toDecimal } from './money.js';

/** Clients get human money (12.34); the database keeps cents (1234). */
export const transactionJson = (tx: TransactionDoc) => ({
  id: tx.id as string,
  type: tx.type,
  amount: toDecimal(tx.amountCents),
  category: tx.category,
  note: tx.note ?? '',
  date: tx.date.toISOString(),
  createdAt: tx.createdAt.toISOString(),
});
