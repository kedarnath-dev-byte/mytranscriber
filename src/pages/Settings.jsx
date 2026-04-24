/**
 * @module Settings
 * @description User settings page — account info, tier details, API key config.
 */

import { useState, useEffect } from "react";
import axios from "axios";

const TIER_TABLE = [
  { feature: "Recording time",     free: "30 min/mo",  pro: "5 hrs/mo",   max: "Unlimited" },
  { feature: "Summary",            free: "Basic",       pro: "Detailed",   max: "Detailed"  },
  { feature: "Action items",       free: "❌",          pro: "✅",         max: "✅"         },
  { feature: "Speaker detection",  free: "❌",          pro: "✅",         max: "✅"         },
  { feature: "Export PDF/TXT",     free: "❌",          pro: "✅",         max: "✅"         },
  { feature: "Max recordings",     free: "10",          pro: "Unlimited",  max: "Unlimited" },
  { feature: "LLM model",          free: "Llama 3.3",   pro: "GPT-4o Mini",max: "Claude Sonnet" },
  { feature: "API access",         free: "❌",          pro: "❌",         max: "✅"         },
];

export default function Settings() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get("/auth/me")
       .then((res) => setUser(res.data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: 800, overflowY: "auto", height: "100vh" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Settings</h1>

      {/* Account Info */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Account</h2>
        {user ? (
  <div>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Tier:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{user.tier || "free"}</span></p>
  </div>
        ) : (
          <p>Loading account info...</p>
        )}
      </section>

      {/* Tier Comparison Table */}
      <section>
        <h2 style={{ marginBottom: "1rem" }}>Plan Comparison</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1e1e2e" }}>
              <th style={th}>Feature</th>
              <th style={th}>Free</th>
              <th style={th}>Pro</th>
              <th style={th}>Max</th>
            </tr>
          </thead>
          <tbody>
            {TIER_TABLE.map((row) => (
              <tr key={row.feature}>
                <td style={td}>{row.feature}</td>
                <td style={td}>{row.free}</td>
                <td style={td}>{row.pro}</td>
                <td style={td}>{row.max}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 💳 PAYMENT_HOOK — upgrade buttons go here */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
          <button style={upgradeBtn("#6c63ff")}>Upgrade to Pro</button>
          <button style={upgradeBtn("#e040fb")}>Upgrade to Max</button>
        </div>
      </section>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const th = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  borderBottom: "1px solid #333",
  color: "#aaa",
  fontSize: "0.85rem",
};

const td = {
  padding: "0.65rem 1rem",
  borderBottom: "1px solid #222",
  fontSize: "0.9rem",
};

const upgradeBtn = (color) => ({
  padding: "0.6rem 1.4rem",
  background: color,
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
});