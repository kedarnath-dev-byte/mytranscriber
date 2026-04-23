/**
 * Login.jsx — Google OAuth Login Page
 *
 * Shows the landing page with:
 * - App branding
 * - Feature highlights
 * - "Login with Google" button
 *
 * On click → redirects to /auth/google → Google login
 * → redirects back to /dashboard on success
 */

export default function Login() {

  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background grid effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div style={{
        width: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '40px 36px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'fade-in 0.4s ease',
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 28,
        }}>
          <div style={{
            width: 46, height: 46,
            background: 'var(--amber)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 24px rgba(245,166,35,0.4)',
          }}>
            🎙️
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-head)',
              fontSize: 22,
              fontWeight: 800,
              color: '#eeeef5',
              letterSpacing: '-0.5px',
            }}>
              MyTranscriber
            </h1>
            <p style={{ fontSize: 11, color: '#6b6b8a', marginTop: 1 }}>
              Personal AI Meeting Assistant
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 13,
          color: '#9999b8',
          lineHeight: 1.7,
          marginBottom: 24,
        }}>
          Record your meetings, get instant transcripts
          and AI summaries — all stored privately on your device.
        </p>

        {/* Features List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 28,
        }}>
          {[
            { icon: '🖥️', text: 'Capture computer audio' },
            { icon: '🎤', text: 'Capture mic + system audio' },
            { icon: '📝', text: 'Auto-transcribe with Whisper AI' },
            { icon: '✨', text: 'Summarize with GPT / Llama' },
            { icon: '🔒', text: 'All data stored on your device' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                color: '#9999b8',
                animation: 'slide-in 0.3s ease both',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: 10,
            background: '#fff',
            color: '#1a1a2e',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-head)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
          }}
        >
          {/* Google Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Privacy note */}
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#6b6b8a',
          marginTop: 16,
        }}>
          🔒 Your transcripts never leave your device
        </p>
      </div>
    </div>
  );
}