/**
 * App.jsx — Root React Component
 *
 * Handles:
 * - Checking if user is logged in on app start
 * - Routing between pages (Login, Dashboard, Detail, Settings)
 * - Passing user state down to child components
 *
 * Pages:
 * - login     → Login with Google page
 * - home      → Main recording + transcript list
 * - detail    → Single transcript view
 * - settings  → API key + account settings
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import TranscriptDetail from './pages/TranscriptDetail.jsx';
import Settings from './pages/Settings.jsx';

// Set axios to always send cookies with requests
axios.defaults.withCredentials = true;

export default function App() {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if user is already logged in on app start
  useEffect(() => {
    axios.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Navigate to transcript detail page
  const openDetail = (id) => {
    setSelectedId(id);
    setPage('detail');
  };

  // Go back to home
  const goHome = () => {
    setPage('home');
    setSelectedId(null);
  };

  // Refresh recordings list
  const refresh = () => setRefreshKey(k => k + 1);

  // Handle logout
  const handleLogout = async () => {
    await axios.get('/auth/logout');
    setUser(null);
    setPage('home');
  };

  // Loading screen
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        color: '#6b6b8a',
        fontFamily: 'var(--font-mono)',
        gap: 12,
      }}>
        <div style={{
          width: 20, height: 20,
          border: '2px solid var(--amber)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        Loading...
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Main app layout
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Left sidebar navigation */}
      <Sidebar
        activePage={page}
        user={user}
        onHome={goHome}
        onSettings={() => setPage('settings')}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <main style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {page === 'home' && (
          <Home
            key={refreshKey}
            user={user}
            onOpenDetail={openDetail}
            onRecordingDone={refresh}
          />
        )}
        {page === 'detail' && (
          <TranscriptDetail
            id={selectedId}
            onBack={goHome}
            onDelete={() => { goHome(); refresh(); }}
          />
        )}
        {page === 'settings' && (
          <Settings user={user} />
        )}
      </main>
    </div>
  );
}