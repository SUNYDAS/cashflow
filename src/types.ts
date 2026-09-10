export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface TransactionPage {
  data: Transaction[];
  meta: { total: number; limit: number; skip: number; income: number; expense: number };
}

export interface Summary {
  income: number;
  expense: number;
  savings: number;
  /** Share of income kept. null when there was no income in the window. */
  savingsRate: number | null;
  avgDailySpend: number | null;
  previous: { income: number; expense: number; savings: number } | null;
  change: { income: number | null; expense: number | null; savings: number | null } | null;
}

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface DayPoint {
  date: string;
  income: number;
  expense: number;
  cumulativeSavings: number;
}

export interface CategorySlice {
  category: string;
  amount: number;
  count: number;
  share: number;
}

export interface CategoryBreakdown {
  total: number;
  entries: CategorySlice[];
}

/** The one filter state the table and every chart read from. */
export interface Filters {
  from: string;
  to: string;
  type: TransactionType | '';
  categories: string[];
  q: string;
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  date?: string;
}
