/**
 * Home.jsx — Main Recording Dashboard
 *
 * Shows:
 * - Two record buttons (Computer Audio / Computer + Mic)
 * - Live recording timer with waveform animation
 * - Processing indicator while transcribing
 * - List of all past recordings
 */

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import RecordingCard from '../components/RecordingCard.jsx';

const MODES = [
  {
    id: 'system',
    icon: '🖥️',
    label: 'Computer Audio',
    desc: 'Captures everything playing on screen — Zoom, Meet, Teams, videos',
    color: 'var(--blue)',
    colorDim: 'var(--blue-dim)',
  },
  {
    id: 'both',
    icon: '🎤',
    label: 'Computer + Mic',
    desc: 'Captures system audio AND your microphone — both sides of a call',
    color: 'var(--amber)',
    colorDim: 'var(--amber-dim)',
  },
];

export default function Home({ user, onOpenDetail, onRecordingDone }) {
  const [recordings, setRecordings]   = useState([]);
  const [recording, setRecording]     = useState(false);
  const [mode, setMode]               = useState(null);
  const [processing, setProcessing]   = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [error, setError]             = useState('');
  const [loadingList, setLoadingList] = useState(true);

  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);
  const startRef  = useRef(null);

  // Load recordings on mount
  useEffect(() => {
    loadRecordings();
  }, []);

  async function loadRecordings() {
    try {
      const res = await axios.get('/api/recordings');
      setRecordings(res.data.data || []);
    } catch (err) {
      setError('Failed to load recordings');
    } finally {
      setLoadingList(false);
    }
  }

  // ── Start Recording ──────────────────────────────────────
  async function startRecording(selectedMode) {
    setError('');
    setMode(selectedMode);
    chunksRef.current = [];

    try {
      // Get screen/audio sources via Electron
      const sources = await window.electron?.getAudioSources?.() || [];
      const screenSource = sources.find(s =>
        s.name === 'Entire Screen' || s.name === 'Screen 1'
      ) || sources[0];

      let finalStream;

      if (screenSource) {
        // Electron desktop capture
        const systemStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screenSource.id,
            }
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: screenSource.id,
            }
          }
        });

        const audioTracks = systemStream.getAudioTracks();
        systemStream.getVideoTracks().forEach(t => t.stop());

        if (selectedMode === 'both') {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          const ctx   = new AudioContext();
          const dest  = ctx.createMediaStreamDestination();
          const sysIn = ctx.createMediaStreamSource(new MediaStream(audioTracks));
          const micIn = ctx.createMediaStreamSource(micStream);
          sysIn.connect(dest);
          micIn.connect(dest);
          finalStream = dest.stream;
        } else {
          finalStream = new MediaStream(audioTracks);
        }
      } else {
        // Fallback for browser testing — use mic only
        finalStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
      }

      const recorder = new MediaRecorder(finalStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000);
      mediaRef.current = recorder;

      // Start timer
      startRef.current = Date.now();
      setElapsed(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Could not start recording. Please check microphone permissions.');
      setMode(null);
    }
  }

  // ── Stop Recording ───────────────────────────────────────
  async function stopRecording() {
    clearInterval(timerRef.current);
    const duration = Math.floor((Date.now() - startRef.current) / 1000);
    setRecording(false);
    setProcessing(true);

    // Wait for recorder to finish
    mediaRef.current.stop();
    await new Promise(r => (mediaRef.current.onstop = r));

    // Build audio blob
    const blob      = new Blob(chunksRef.current, { type: 'audio/webm' });
    const formData  = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('mode', mode);
    formData.append('durationSeconds', duration);

    try {
      await axios.post('/api/recordings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadRecordings();
      onRecordingDone?.();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Transcription failed. Check your OpenRouter API key in Settings.'
      );
    } finally {
      setProcessing(false);
      setMode(null);
      setElapsed(0);
    }
  }

  // Format seconds to MM:SS
  const fmt = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const activeMode = MODES.find(m => m.id === mode);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        padding: '24px 28px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{
            fontFamily: 'var(--font-head)',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-0.3px',
          }}>
            Recordings
          </h1>
          <p style={{ fontSize: 11, color: '#6b6b8a', marginTop: 2 }}>
            Hi {user?.name?.split(' ')[0]} 👋 — click a button to start recording
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--red-dim)',
            border: '1px solid rgba(255,79,106,0.3)',
            color: 'var(--red)',
            fontSize: 12,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Record Mode Buttons */}
        {!recording && !processing && (
          <div style={{ display: 'flex', gap: 12 }}>
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => startRecording(m.id)}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: m.colorDim,
                  border: `1px solid ${m.color}44`,
                  color: m.color,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = m.color;
                  e.currentTarget.style.background =
                    m.colorDim.replace('0.12', '0.2');
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `${m.color}44`;
                  e.currentTarget.style.background = m.colorDim;
                }}
              >
                <span style={{ fontSize: 26 }}>{m.icon}</span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: 13,
                  }}>
                    {m.label}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#6b6b8a',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}>
                    {m.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Active Recording UI */}
        {recording && activeMode && (
          <div style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: 'var(--red-dim)',
            border: '1px solid rgba(255,79,106,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            animation: 'fade-in 0.3s ease',
          }}>
            {/* Pulse dot */}
            <div style={{ position: 'relative', width: 32, height: 32 }}>
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                background: 'var(--red)',
                animation: 'pulse-ring 1.5s ease infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 4,
                borderRadius: '50%',
                background: 'var(--red)',
              }} />
            </div>

            {/* Waveform */}
            <div style={{
              display: 'flex',
              gap: 3,
              alignItems: 'center',
              height: 28,
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  width: 3,
                  borderRadius: 2,
                  background: 'var(--red)',
                  animation: 'waveform 0.8s ease-in-out infinite',
                  animationDelay: `${i * 0.07}s`,
                  opacity: 0.7,
                }} />
              ))}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--red)',
              }}>
                Recording — {activeMode.label}
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
                marginTop: 2,
              }}>
                {fmt(elapsed)}
              </div>
            </div>

            <button
              onClick={stopRecording}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                background: 'var(--red)',
                color: '#fff',
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ■ Stop
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {processing && (
          <div style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: 'var(--amber-dim)',
            border: '1px solid rgba(245,166,35,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            animation: 'fade-in 0.3s ease',
          }}>
            <div style={{
              width: 22, height: 22,
              border: '2px solid var(--amber)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--amber)',
              }}>
                Processing your recording...
              </div>
              <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 2 }}>
                Transcribing with Whisper · Summarizing with AI
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Recordings List ─────────────────────────────── */}
      <div
        className="scrollable"
        style={{ flex: 1, padding: '16px 28px' }}
      >
        {loadingList ? (
          <div style={{
            textAlign: 'center',
            paddingTop: 60,
            color: '#6b6b8a',
          }}>
            Loading...
          </div>
        ) : recordings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            paddingTop: 60,
            color: '#6b6b8a',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
            <div style={{
              fontFamily: 'var(--font-head)',
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 6,
            }}>
              No recordings yet
            </div>
            <div style={{ fontSize: 12 }}>
              Click a record button above to start capturing
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {recordings.map((rec, i) => (
              <RecordingCard
                key={rec.id}
                rec={rec}
                animationDelay={i * 0.05}
                onClick={() => onOpenDetail(rec.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}