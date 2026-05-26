import { useState } from 'react';

export default function LoginPage({ onLogin, error, socketReady }) {
  const [username, setUsername] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) return;
    onLogin(trimmed);
  }

  return (
    <div className="view-container login-view">
      <div className="card login-card">
        <h1>UNO Multiplayer</h1>
        <p>Enter a username to join a real-time room.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Your name"
            maxLength={16}
            autoFocus
          />
          <button type="submit" disabled={!socketReady || username.trim().length < 2}>
            {socketReady ? 'Login' : 'Connecting...'}
          </button>
        </form>
        {error && <div className="toast error">{error}</div>}
      </div>
    </div>
  );
}
