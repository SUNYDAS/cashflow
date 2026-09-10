import { useState, type FormEvent } from 'react';
import { money } from '../api';
import type { NewTransaction, Transaction, TransactionType } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

const SUGGESTED = {
  expense: ['Groceries', 'Rent', 'Transport', 'Eating out', 'Utilities', 'Shopping', 'Health'],
  income: ['Salary', 'Freelance', 'Refund', 'Interest'],
};

export function TransactionForm({
  categories,
  onSubmit,
}: {
  categories: string[];
  onSubmit: (tx: NewTransaction) => Promise<void>;
}) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number.parseFloat(amount) || 0;
  const options = [...new Set([...SUGGESTED[type], ...categories])];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (value <= 0 || !category.trim() || busy) return;

    setBusy(true);
    try {
      await onSubmit({
        type,
        amount: Math.round(value * 100) / 100,
        category: category.trim(),
        note: note.trim() || undefined,
        date: new Date(`${date}T12:00:00`).toISOString(),
      });
      setAmount('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="tx-form" onSubmit={submit}>
      <div className="toggle" role="group" aria-label="Transaction type">
        {(['expense', 'income'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={type === option ? `toggle-btn active ${option}` : 'toggle-btn'}
            aria-pressed={type === option}
            onClick={() => setType(option)}
          >
            {option === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <label>
        <span>Amount</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      <label>
        <span>Category</span>
        <input
          list="category-options"
          placeholder="Groceries"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="category-options">
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>

      <label>
        <span>Date</span>
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="grow">
        <span>Note</span>
        <input placeholder="optional" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" disabled={busy || value <= 0 || !category.trim()}>
        {busy ? 'Saving…' : `Add ${type}`}
      </button>
    </form>
  );
}

export function TransactionTable({
  rows,
  total,
  currency,
  sort,
  order,
  onSort,
  onDelete,
  onLoadMore,
}: {
  rows: Transaction[];
  total: number;
  currency: string;
  sort: string;
  order: string;
  onSort: (field: string) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
}) {
  if (rows.length === 0) {
    return <p className="empty">No transactions match these filters.</p>;
  }

  const header = (field: string, label: string, align?: 'right') => (
    <th className={align} aria-sort={sort === field ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort" onClick={() => onSort(field)}>
        {label}
        {sort === field && <span aria-hidden="true">{order === 'asc' ? ' ▲' : ' ▼'}</span>}
      </button>
    </th>
  );

  return (
    <>
      <div className="table-wrap">
        <table className="tx-table">
          <thead>
            <tr>
              {header('date', 'Date')}
              {header('category', 'Category')}
              <th>Note</th>
              {header('amount', 'Amount', 'right')}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td className="nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                <td>
                  <span className={tx.type === 'income' ? 'tag income' : 'tag expense'}>
                    {tx.category}
                  </span>
                </td>
                <td className="muted">{tx.note || '—'}</td>
                <td className={tx.type === 'income' ? 'right pos' : 'right neg'}>
                  {tx.type === 'income' ? '+' : '−'}
                  {money(tx.amount, currency)}
                </td>
                <td className="right">
                  <button
                    type="button"
                    className="icon danger"
                    title="Delete"
                    onClick={() => onDelete(tx.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length < total && (
        <button type="button" className="ghost more" onClick={onLoadMore}>
          Load more ({rows.length} of {total})
        </button>
      )}
    </>
  );
}
