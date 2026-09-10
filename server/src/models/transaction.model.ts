import { Schema, model, type HydratedDocument } from 'mongoose';

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  type: TransactionType;
  /** Integer cents, so sums and averages never drift. */
  amountCents: number;
  category: string;
  note?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<Transaction>(
  {
    type: { type: String, enum: TRANSACTION_TYPES, required: true, index: true },
    amountCents: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, trim: true, maxlength: 60, index: true },
    note: { type: String, trim: true, maxlength: 300 },
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

// Every dashboard query filters by type over a date window, so index the pair.
transactionSchema.index({ type: 1, date: -1 });

export type TransactionDoc = HydratedDocument<Transaction>;
export const TransactionModel = model<Transaction>('Transaction', transactionSchema);
