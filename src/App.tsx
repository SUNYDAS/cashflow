import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, auth } from './api';
import { CategoryChart, DailyChart, MonthlyChart, SavingsChart } from './components/Charts';
import { FilterBar } from './components/FilterBar';
import { defaultFilters } from './filterPresets';
import { StatTiles } from './components/StatTiles';
import { TransactionForm, TransactionTable } from './components/TransactionPanel';
import { LoginPage } from './components/LoginPage';
import type {
  CategoryBreakdown,
  DayPoint,
  Filters,
  MonthPoint,
  NewTransaction,
  Summary,
  Transaction,
  TransactionPage,
} from './types';
import './App.css';

const CURRENCY = 'INR';
const PAGE = 25;

export default function App() {
  // undefined = still checking the session, null = signed out.
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthPoint[]>([]);
  const [daily, setDaily] = useState<DayPoint[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [page, setPage] = useState<TransactionPage | null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<{ categories: string[] }>({ categories: [] });
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);

  const report = (err: unknown) => {
    // A session that expired mid-use should return to the login screen rather
    // than show a wall of failed requests.
    if (err instanceof ApiError && err.status === 401) {
      setUser(null);
      return;
    }
    setError(err instanceof Error ? err.message : 'Something went wrong');
  };

  useEffect(() => {
    auth
      .me()
      .then((me) => setUser(me.username))
      .catch(() => setUser(null));
  }, []);

  async function signIn(username: string, password: string) {
    const me = await auth.login(username, password);
    setUser(me.username);
  }

  async function signOut() {
    try {
      await auth.logout();
    } finally {
      setUser(null);
      setPage(null);
    }
  }

  /** Charts, tiles and table all read the same filters, so they refresh together. */
  const load = useCallback(async () => {
    const [nextSummary, nextMonthly, nextDaily, nextBreakdown, nextPage, nextMeta] =
      await Promise.all([
        api.summary(filters),
        api.monthly(filters),
        api.daily(filters),
        api.categories(filters),
        api.listTransactions(filters, { limit, skip: 0 }, sort, order),
        api.meta(),
      ]);

    setSummary(nextSummary);
    setMonthly(nextMonthly);
    setDaily(nextDaily);
    setBreakdown(nextBreakdown);
    setPage(nextPage);
    setRows(nextPage.data);
    setMeta(nextMeta);
    setError(null);
  }, [filters, limit, sort, order]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    load().catch((err) => {
      if (!cancelled) report(err);
    });
    return () => {
      cancelled = true;
    };
  }, [load, user]);

  // Derived, not stored: nothing has loaded until the first page arrives. On a
  // later filter change the previous data stays on screen while the next loads.
  const loading = page === null && error === null;

  function changeSort(field: string) {
    if (field === sort) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
  }

  async function addTransaction(tx: NewTransaction) {
    await api.createTransaction(tx); // the form surfaces its own error
    await load();
  }

  async function remove(id: string) {
    try {
      await api.deleteTransaction(id);
      await load();
    } catch (err) {
      report(err);
    }
  }

  if (user === undefined) return <p className="boot">Loading…</p>;
  if (user === null) return <LoginPage onSignIn={signIn} />;

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Cost Analysis</h1>
          <p>Where your money goes, month by month.</p>
        </div>
        <div className="who">
          <span>{user}</span>
          <button type="button" className="ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="banner" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      <FilterBar
        filters={filters}
        categories={meta.categories}
        currency={CURRENCY}
        matched={
          page ? { total: page.meta.total, income: page.meta.income, expense: page.meta.expense } : null
        }
        onChange={(next) => {
          setLimit(PAGE);
          setFilters(next);
        }}
      />

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          {summary && <StatTiles summary={summary} currency={CURRENCY} />}

          <div className="chart-grid">
            <MonthlyChart data={monthly} currency={CURRENCY} />
            <SavingsChart data={monthly} currency={CURRENCY} />
            <DailyChart data={daily} currency={CURRENCY} />
            {breakdown && (
              <CategoryChart
                entries={breakdown.entries}
                total={breakdown.total}
                currency={CURRENCY}
              />
            )}
          </div>

          <div className="lower">
            <section className="card">
              <h2>Add a transaction</h2>
              <TransactionForm categories={meta.categories} onSubmit={addTransaction} />
            </section>

            <section className="card">
              <h2>Transactions</h2>
              <TransactionTable
                rows={rows}
                total={page?.meta.total ?? 0}
                currency={CURRENCY}
                sort={sort}
                order={order}
                onSort={changeSort}
                onDelete={remove}
                onLoadMore={() => setLimit((current) => current + PAGE)}
              />
            </section>
          </div>
        </>
      )}

      <footer className="site-footer">Developed by Suny Das</footer>
    </div>
  );
}
