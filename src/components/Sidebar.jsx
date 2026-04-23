/**
 * Sidebar.jsx — Left Navigation Panel
 *
 * Shows:
 * - App logo
 * - Navigation buttons (Home, Settings)
 * - User avatar + tier badge at bottom
 * - Logout button
 */

const TIER_COLORS = {
  free:  '#4ade80',
  pro:   '#4f9eff',
  max:   '#a855f7',
};

export default function Sidebar({
  activePage,
  user,
  onHome,
  onSettings,
  onLogout,
}) {
  const tierColor = TIER_COLORS[user?.tier] || TIER_COLORS.free;

  return (
    <aside style={{
      width: 64,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      gap: 8,
    }}>

      {/* App Logo */}
      <div style={{
        width: 38, height: 38,
        background: 'var(--amber)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        marginBottom: 20,
        boxShadow: '0 0 20px rgba(245,166,35,0.35)',
        flexShrink: 0,
      }}>
        🎙️
      </div>

      {/* Home Button */}
      <NavButton
        icon="⬡"
        label="Recordings"
        active={activePage === 'home'}
        onClick={onHome}
      />

      {/* Settings Button */}
      <NavButton
        icon="⚙"
        label="Settings"
        active={activePage === 'settings'}
        onClick={onSettings}
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User Avatar + Tier */}
      {user && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{
                  width: 34, height: 34,
                  borderRadius: '50%',
                  border: `2px solid ${tierColor}`,
                }}
              />
            ) : (
              <div style={{
                width: 34, height: 34,
                borderRadius: '50%',
                background: 'var(--surface3)',
                border: `2px solid ${tierColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: tierColor,
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
              }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Tier Badge */}
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            color: tierColor,
            background: `${tierColor}18`,
            padding: '2px 6px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}>
            {user.tier || 'free'}
          </div>
        </div>
      )}

      {/* Logout Button */}
      <button
        title="Logout"
        onClick={onLogout}
        style={{
          width: 44, height: 36,
          borderRadius: 8,
          background: 'transparent',
          color: '#6b6b8a',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid transparent',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--red)';
          e.currentTarget.style.background = 'var(--red-dim)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = '#6b6b8a';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        ⏻
      </button>
    </aside>
  );
}

// ─── Nav Button Component ──────────────────────────────────
function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 44, height: 44,
        borderRadius: 10,
        background: active ? 'var(--amber-dim)' : 'transparent',
        border: active
          ? '1px solid rgba(245,166,35,0.3)'
          : '1px solid transparent',
        color: active ? 'var(--amber)' : '#6b6b8a',
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.color = '#eeeef5';
          e.currentTarget.style.background = 'var(--surface2)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.color = '#6b6b8a';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {icon}
    </button>
  );
}