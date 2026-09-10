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

/** Vite proxies /api to the API server, so the browser sees one origin. */
const BASE = '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      credentials: 'same-origin', // carry the session cookie
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Is the server running on port 4000?');
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

const unwrap = async <T>(path: string, init?: RequestInit): Promise<T> =>
  (await request<{ data: T }>(path, init)).data;

/** Turns the filter state into the query string every endpoint understands. */
export function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.type) params.set('type', filters.type);
  if (filters.q) params.set('q', filters.q);
  for (const category of filters.categories) params.append('category', category);
  return params;
}

const withParams = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

export const auth = {
  me: () => unwrap<{ username: string }>('/auth/me'),

  login: (username: string, password: string) =>
    unwrap<{ username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};

export const api = {
  listTransactions: (filters: Filters, page: { limit: number; skip: number }, sort: string, order: string) => {
    const params = filterParams(filters);
    params.set('limit', String(page.limit));
    params.set('skip', String(page.skip));
    params.set('sort', sort);
    params.set('order', order);
    return request<TransactionPage>(withParams('/transactions', params));
  },

  createTransaction: (tx: NewTransaction) =>
    unwrap<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(tx) }),

  updateTransaction: (id: string, patch: Partial<NewTransaction>) =>
    unwrap<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteTransaction: (id: string) =>
    request<void>(`/transactions/${id}`, { method: 'DELETE' }),

  meta: () => unwrap<{ categories: string[] }>('/transactions/meta/categories'),

  summary: (filters: Filters) =>
    unwrap<Summary>(withParams('/analytics/summary', filterParams(filters))),

  monthly: (filters: Filters, months = 12) => {
    const params = filterParams(filters);
    // The monthly chart always shows the trailing window, not the filtered one,
    // so the reader can see the current month in context.
    params.delete('from');
    params.delete('to');
    params.set('months', String(months));
    return unwrap<MonthPoint[]>(withParams('/analytics/monthly', params));
  },

  daily: (filters: Filters) =>
    unwrap<DayPoint[]>(withParams('/analytics/daily', filterParams(filters))),

  categories: (filters: Filters, limit = 7) => {
    const params = filterParams(filters);
    params.set('type', 'expense');
    params.set('limit', String(limit));
    return unwrap<CategoryBreakdown>(withParams('/analytics/categories', params));
  },
};

export const money = (amount: number, currency = 'INR', compact = false) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 0 : 2,
      notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export const monthLabel = (iso: string) => {
  const [year, month] = iso.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

export const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
