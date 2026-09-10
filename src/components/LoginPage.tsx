import { useState, type FormEvent } from 'react';

/* Inline so the icons need no icon library and inherit the current text colour. */
const Eye = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12Z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

const EyeOff = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.4c6.6 0 10.2 6.6 10.2 6.6a18 18 0 0 1-3 3.9M6.3 8A17.7 17.7 0 0 0 1.8 12S5.4 18.6 12 18.6c1.7 0 3.2-.4 4.5-1" />
    <path d="M10.1 10.2a3.2 3.2 0 0 0 4.4 4.5" />
    <path d="M3 3l18 18" />
  </svg>
);

export function LoginPage({
  onSignIn,
}: {
  onSignIn: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !username.trim() || !password) return;

    setBusy(true);
    setError(null);
    try {
      await onSignIn(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setPassword('');
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1>Cashflow</h1>
        <p className="login-sub">Sign in to see your money.</p>

        <label>
          <span>Username</span>
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label>
          <span>Password</span>
          <span className="password-field">
            <input
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* type="button" so it never submits the form */}
            <button
              type="button"
              className="peek"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              title={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff /> : <Eye />}
            </button>
          </span>
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || !username.trim() || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <footer className="site-footer">Developed by Suny Das</footer>
    </div>
  );
}
