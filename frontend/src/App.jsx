import { useHealthCheck } from './hooks/useHealthCheck.js';
import './App.css';

function StatusIndicator({ label, connected, loading }) {
  return (
    <div className="status-row">
      <span className="status-label">{label}</span>
      <span
        className={`status-indicator ${loading ? 'loading' : connected ? 'connected' : 'disconnected'}`}
      >
        {loading ? '...' : connected ? '✓' : '✗'}
      </span>
      <span
        className={`status-text ${loading ? 'loading' : connected ? 'connected' : 'disconnected'}`}
      >
        {loading ? 'Checking...' : connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

function App() {
  const { frontend, backend, database, loading, error, raw, refetch } = useHealthCheck();

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo-mark">
            <span className="logo-icon">+</span>
          </div>
          <h1 className="title">MEDNOTES</h1>
          <p className="subtitle">Project Foundation</p>
        </header>

        <main className="status-card">
          <h2 className="card-title">System Status</h2>
          <div className="status-list">
            <StatusIndicator label="Frontend" connected={frontend} loading={false} />
            <StatusIndicator label="Backend" connected={backend} loading={loading} />
            <StatusIndicator label="Database" connected={database} loading={loading} />
          </div>

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {raw && (
            <div className="api-section">
              <h3 className="api-title">API</h3>
              <p className="api-endpoint">
                Connected to <code>/api/v1/health</code>
              </p>
              <pre className="api-response">{JSON.stringify(raw, null, 2)}</pre>
            </div>
          )}

          <button className="refresh-btn" onClick={refetch} disabled={loading}>
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>
        </main>

        <footer className="footer">
          <p>MedNotes &mdash; Step 1: Foundation</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
