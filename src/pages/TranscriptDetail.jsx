/**
 * TranscriptDetail.jsx — Full Transcript View
 *
 * Shows:
 * - Recording title + metadata
 * - Tab 1: Summary + Action Items
 * - Tab 2: Full transcript text
 * - Copy transcript button
 * - Delete recording button
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

function formatDuration(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(dt) {
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const MODE_META = {
  system: { icon: '🖥️', color: 'var(--blue)',  label: 'Computer Audio' },
  both:   { icon: '🎤', color: 'var(--amber)', label: 'Computer + Mic'  },
};

const TIER_COLORS = {
  free:  'var(--tier-free)',
  pro:   'var(--tier-pro)',
  max:   'var(--tier-max)',
};

export default function TranscriptDetail({ id, onBack, onDelete }) {
  const [rec, setRec]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('summary');
  const [copied, setCopied]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    axios.get(`/api/recordings/${id}`)
      .then(res => setRec(res.data.data))
      .catch(() => setRec(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm('Delete this recording? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/recordings/${id}`);
      onDelete?.();
    } catch (err) {
      alert('Failed to delete recording');
      setDeleting(false);
    }
  }

  function copyTranscript() {
    navigator.clipboard.writeText(rec.transcript || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Parse summary data ───────────────────────────
  // Summary can be either JSON string or plain text
  const parsedSummary = rec?.summary ? (() => {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(rec.summary);
      return {
        title: parsed.title || 'Summary',
        text: parsed.summary || '',
        actionItems: Array.isArray(parsed.action_items) ? parsed.action_items : []
      };
    } catch (e) {
      // If not JSON, treat as plain text
      return {
        title: rec.title || 'Summary',
        text: rec.summary || '',
        actionItems: []
      };
    }
  })() : { title: 'Summary', text: '', actionItems: [] };

  // ─── Parse action items ───────────────────────────
  let actionItems = [];
  if (rec?.action_items) {
    try {
      const parsed = JSON.parse(rec.action_items);
      actionItems = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      actionItems = [];
    }
  }

  // Use summary's action items if available, fallback to top-level
  const displayActionItems = parsedSummary.actionItems.length > 0 
    ? parsedSummary.actionItems 
    : actionItems;

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100%',
      color: '#6b6b8a', gap: 10,
    }}>
      <div style={{
        width: 18, height: 18,
        border: '2px solid var(--amber)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      Loading...
    </div>
  );

  if (!rec) return (
    <div style={{ padding: 32, color: 'var(--red)' }}>
      Recording not found.
    </div>
  );

  const meta        = MODE_META[rec.mode] || MODE_META.system;
  const tierColor   = TIER_COLORS[rec.tier_used] || TIER_COLORS.free;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>

      {/* ── Top Bar ──────────────────────────────────── */}
      <div style={{
        padding: '20px 28px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            padding: '7px 14px', borderRadius: 8,
            background: 'var(--surface2)',
            color: '#6b6b8a', fontSize: 12, marginTop: 2,
            border: '1px solid var(--border)',
          }}
        >
          ← Back
        </button>

        {/* Title + Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontSize: 18,
            fontWeight: 800, letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}>
            {rec.title}
          </h2>
          <div style={{
            display: 'flex', gap: 14, marginTop: 6,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: meta.color }}>
              {meta.icon} {meta.label}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: tierColor,
              background: `${tierColor}18`,
              padding: '2px 7px', borderRadius: 4,
              textTransform: 'uppercase',
            }}>
              {rec.tier_used} tier
            </span>
            <span style={{ fontSize: 11, color: '#6b6b8a' }}>
              ⏱ {formatDuration(rec.duration_seconds)}
            </span>
            <span style={{ fontSize: 11, color: '#6b6b8a' }}>
              📅 {formatDate(rec.created_at)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={copyTranscript}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--green-dim)',
              color: 'var(--green)',
              border: '1px solid rgba(61,255,160,0.2)',
              fontSize: 12,
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--red-dim)',
              color: 'var(--red)',
              border: '1px solid rgba(255,79,106,0.2)',
              fontSize: 12,
              opacity: deleting ? 0.5 : 1,
            }}
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4,
        padding: '12px 28px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        {[
          { id: 'summary',    label: '✨ Summary'         },
          { id: 'transcript', label: '📝 Full Transcript'  },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '8px 8px 0 0',
              background: tab === t.id ? 'var(--surface2)' : 'transparent',
              color: tab === t.id ? '#eeeef5' : '#6b6b8a',
              borderBottom: tab === t.id
                ? '2px solid var(--amber)'
                : '2px solid transparent',
              fontSize: 12,
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div
        className="scrollable"
        style={{ flex: 1, padding: '24px 28px' }}
      >

        {/* Summary Tab */}
        {tab === 'summary' && (
          <div style={{
            animation: 'fade-in 0.25s ease',
            maxWidth: 760,
          }}>

            {/* Summary */}
            <section style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: 1.5,
                color: 'var(--amber)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                Meeting Summary
              </div>
              <div style={{
                padding: '18px 22px', borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                lineHeight: 1.8, fontSize: 14,
                userSelect: 'text',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}>
                {parsedSummary.text || 'No summary available.'}
              </div>
            </section>

            {/* Action Items */}
            {displayActionItems.length > 0 ? (
              <section>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: 1.5,
                  color: 'var(--green)',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  Action Items
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {displayActionItems.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', borderRadius: 8,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      animation: 'slide-in 0.3s ease both',
                      animationDelay: `${i * 0.06}s`,
                      userSelect: 'text',
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: 'var(--green-dim)',
                        border: '1px solid rgba(61,255,160,0.3)',
                        color: 'var(--green)',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div style={{
                padding: '16px 18px', borderRadius: 10,
                background: 'var(--blue-dim)',
                border: '1px solid rgba(79,158,255,0.2)',
                fontSize: 12, color: '#6b6b8a',
              }}>
                💡 Action items are available on <strong
                  style={{ color: 'var(--blue)' }}>Pro</strong> and{' '}
                <strong style={{ color: 'var(--purple)' }}>Max</strong> plans.
              </div>
            )}
          </div>
        )}

        {/* Transcript Tab */}
        {tab === 'transcript' && (
          <div style={{
            animation: 'fade-in 0.25s ease',
            padding: '20px 24px',
            borderRadius: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            lineHeight: 1.9, fontSize: 13,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            userSelect: 'text',
            maxWidth: 800,
          }}>
            {rec.transcript || 'No transcript available.'}
          </div>
        )}
      </div>
    </div>
  );
}
