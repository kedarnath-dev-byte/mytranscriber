/**
 * RecordingCard.jsx — Single Recording List Item
 *
 * Shows:
 * - Recording title
 * - Short summary preview
 * - Mode badge (Computer Audio / Computer + Mic)
 * - Duration + date
 * - Tier badge (which AI model was used)
 */

const MODE_META = {
  system: {
    icon: '🖥️',
    label: 'Computer Audio',
    color: 'var(--blue)',
    colorDim: 'var(--blue-dim)',
  },
  both: {
    icon: '🎤',
    label: 'Computer + Mic',
    color: 'var(--amber)',
    colorDim: 'var(--amber-dim)',
  },
};

const TIER_COLORS = {
  free:  'var(--tier-free)',
  pro:   'var(--tier-pro)',
  max:   'var(--tier-max)',
};

// Format seconds to m:ss
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Format date to readable string
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecordingCard({ rec, onClick, animationDelay = 0 }) {
  const meta = MODE_META[rec.mode] || MODE_META.system;
  const tierColor = TIER_COLORS[rec.tier_used] || TIER_COLORS.free;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 18px',
        borderRadius: 10,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        animation: 'slide-in 0.3s ease both',
        animationDelay: `${animationDelay}s`,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--surface2)';
        e.currentTarget.style.borderColor = 'var(--border2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Mode Icon */}
      <div style={{
        width: 40, height: 40,
        borderRadius: 9,
        background: meta.colorDim,
        border: `1px solid ${meta.color}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        {meta.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: 14,
          color: '#eeeef5',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {rec.title}
        </div>

        {/* Summary Preview */}
        <div style={{
          fontSize: 11,
          color: '#6b6b8a',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {rec.summary || 'No summary available'}
        </div>
      </div>

      {/* Right Meta */}
      <div style={{
        flexShrink: 0,
        textAlign: 'right',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-end',
      }}>
        {/* Mode Badge */}
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: meta.color,
          background: meta.colorDim,
          padding: '2px 7px',
          borderRadius: 4,
          letterSpacing: 0.3,
        }}>
          {meta.label}
        </div>

        {/* Tier Badge */}
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: tierColor,
          background: `${tierColor}18`,
          padding: '2px 6px',
          borderRadius: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {rec.tier_used || 'free'}
        </div>

        {/* Duration */}
        <div style={{ fontSize: 11, color: '#6b6b8a' }}>
          ⏱ {formatDuration(rec.duration_seconds)}
        </div>

        {/* Date */}
        <div style={{ fontSize: 10, color: '#6b6b8a' }}>
          {formatDate(rec.created_at)}
        </div>
      </div>
    </div>
  );
}